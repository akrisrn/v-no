import { addBaseUrl, axiosGet, config, getWrapRegExp, splitFlag, splitTagsFromCodes } from '@/ts/utils';
import { EFlag, IFlags } from '@/ts/enums';

export function getFlag(data: string, flag: EFlag) {
  const match = data.match(getWrapRegExp(`^@${flag}:`, '$', 'm'));
  if (match) {
    return match[1];
  }
  return '';
}

export function getFlags(data: string, cleanData = true, onlyClean = false) {
  const result: IFlags = {
    title: '',
    tags: [],
    updated: [],
    cover: '',
  };
  const flags = Object.values(EFlag).map(flag => `@${flag}:`);
  flags.push('# ');
  const flagsStr = flags.join('|');
  const regexp = getWrapRegExp(`^(${flagsStr})`, '$', 'gm');
  const dataCopy = data;
  let match = regexp.exec(dataCopy);
  while (match) {
    if (!onlyClean) {
      if (match[1].startsWith('@')) {
        const flag = match[1].substring(1, match[1].length - 1);
        if ([EFlag.tags, EFlag.updated].map(flag => `@${flag}:`).includes(match[1])) {
          result[flag] = splitFlag(match[2]);
        } else {
          result[flag] = match[2];
        }
      } else {
        result.title = match[2];
      }
    }
    if (cleanData) {
      data = data.replace(match[0], '');
    }
    match = regexp.exec(dataCopy);
  }
  return { data, result };
}

export function cleanFlags(data: string) {
  return getFlags(data, true, true).data;
}

export function getListFromData(data: string, isAll = false) {
  const results = [];
  const hrefs: string[] = [];
  const regexp = new RegExp(`${isAll ? '' : '-\\s*'}\\[(.*?)]\\((.*?\\.md#)\\)\\s*(\`.*\`)?`, 'gm');
  let match = regexp.exec(data);
  while (match) {
    const href = match[2];
    if (!hrefs.includes(href)) {
      const title = match[1];
      const tags = match[3] ? splitTagsFromCodes(match[3]) : [];
      results.push({ title, href, tags });
      hrefs.push(href);
    }
    match = regexp.exec(data);
  }
  return results;
}

export function getIndexFileData(func: (data: string) => void) {
  Promise.all([
    axiosGet<string>(addBaseUrl(config.indexFile)),
    axiosGet<string>(addBaseUrl(config.archiveFile)),
  ]).then(responses => {
    func(responses.map(response => response.data).join('\n'));
  });
}
