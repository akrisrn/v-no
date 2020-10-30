import { addBaseUrl, axiosGet, cleanBaseUrl, config, getWrapRegExp, splitFlag } from '@/ts/utils';
import { EFlag } from '@/ts/enums';

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
  return { data, flags: result } as TMDFile;
}

export function cleanFlags(data: string) {
  return getFlags(data, true, true).data;
}

export async function searchFile(data: string, fileDict: TMDFileDict) {
  const hrefs: string[] = [];
  const regexp = new RegExp(`\\[.*?]\\((/.*?\\.md)\\)`, 'gm');
  let match = regexp.exec(data);
  while (match) {
    const href = match[1];
    if (!hrefs.includes(href) && fileDict[href] === undefined) {
      hrefs.push(href);
    }
    match = regexp.exec(data);
  }
  if (hrefs.length > 0) {
    let newData = '';
    const responses = await Promise.all(hrefs.map(href => axiosGet<string>(addBaseUrl(href))));
    responses.forEach(response => {
      newData += response.data + '\n';
      fileDict[cleanBaseUrl(response.config.url!)] = getFlags(response.data);
    });
    await searchFile(newData, fileDict);
  }
}

export function getFileDict(func: (fileDict: TMDFileDict) => void) {
  Promise.all([
    config.indexFile,
    config.readmeFile,
    config.categoryFile,
    config.archiveFile,
    config.searchFile,
    config.commonFile,
  ].map(file => axiosGet<string>(addBaseUrl(file)))).then(async responses => {
    let data = '';
    const fileDict: TMDFileDict = {};
    responses.forEach(response => {
      data += response.data + '\n';
      fileDict[cleanBaseUrl(response.config.url!)] = getFlags(response.data);
    });
    await searchFile(data, fileDict);
    func(fileDict);
  });
}
