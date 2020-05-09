import { axiosGet, config, getWrapRegExp, splitTagsFromCodes } from '@/ts/utils';
import { EFlag, IFlags } from '@/ts/enums';

export function getListFromData(data: string, isAll = false) {
  const matches = data.match(isAll ? /\[.*?]\(.*?\.md#\)(\s*`.*?`\s*$)?/gm :
    /^-\s*\[.*?]\(.*?\.md#\)\s*(`.*?`)?\s*$/gm);
  if (matches) {
    return matches.map((match) => {
      const m = match.match(isAll ? /\[(.*?)]\((.*?)\)(?:\s*(.*?)\s*$)/ :
        /^-\s*\[(.*?)]\((.*?)\)\s*(.*?)\s*$/)!;
      const title = m[1];
      const href = m[2];
      const tags = m[3] ? splitTagsFromCodes(m[3]) : [];
      return { title, href, tags };
    });
  }
  return [];
}

export function getIndexFileData(func: (data: string) => void) {
  Promise.all([
    axiosGet('/' + config.indexFile),
    axiosGet('/' + config.archiveFile),
  ]).then((responses) => {
    func(responses.map((response) => response.data).join('\n'));
  });
}

export function getFlag(data: string, flag: EFlag) {
  const match = data.match(getWrapRegExp(`^@${flag}:`, '$', 'm'));
  if (match) {
    return match[1];
  }
  return '';
}

export function getFlags(data: string) {
  const result: IFlags = {};
  const flags = Object.values(EFlag).map((flag) => `@${flag}:`);
  flags.push('# ');
  const flagsStr = flags.join('|');
  const matches = data.match(getWrapRegExp(`^(${flagsStr})`, '$', 'gm'));
  if (matches) {
    const regexp = getWrapRegExp(`^(${flagsStr})`, '$');
    for (const match of matches) {
      const m = match.match(regexp);
      if (m) {
        if (m[1].startsWith('@')) {
          result[m[1].substring(1, m[1].length - 1)] = m[2];
        } else {
          result.title = m[2];
        }
      }
      data = data.replace(match, '');
    }
  }
  return { data, result };
}
