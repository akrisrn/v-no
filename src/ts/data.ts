import { axiosGet, config, getWrapRegExp, splitTagsFromCodes } from '@/ts/utils';
import { EFlag, IFlags } from '@/ts/enums';

export function getListFromData(data: string, isAll = false) {
  const results = [];
  const regexp = new RegExp(`${isAll ? '' : '-\\s*'}\\[(.*?)]\\((.*?\\.md#)\\)\\s*(\`.*\`)?`, 'gm');
  let match = regexp.exec(data);
  while (match) {
    const title = match[1];
    const href = match[2];
    const tags = match[3] ? splitTagsFromCodes(match[3]) : [];
    results.push({ title, href, tags });
    match = regexp.exec(data);
  }
  return results;
}

export function getIndexFileData(func: (data: string) => void) {
  const baseUrl = process.env.BASE_URL;
  Promise.all([
    axiosGet(baseUrl + config.indexFile),
    axiosGet(baseUrl + config.archiveFile),
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
  const regexp = getWrapRegExp(`^(${flagsStr})`, '$', 'gm');
  const dataCopy = data;
  let match = regexp.exec(dataCopy);
  while (match) {
    if (match[1].startsWith('@')) {
      result[match[1].substring(1, match[1].length - 1)] = match[2];
    } else {
      result.title = match[2];
    }
    data = data.replace(match[0], '');
    match = regexp.exec(dataCopy);
  }
  return { data, result };
}
