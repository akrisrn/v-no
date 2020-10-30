import { addBaseUrl, axiosGet, cleanBaseUrl, config, EFlag, getWrapRegExp, splitFlag } from '@/ts/utils';

export function getFile(data: string, cleanData = true, onlyClean = false) {
  const flags: IFlags = {
    title: '',
    tags: [],
    updated: [],
    cover: '',
  };
  const flagMarks = Object.values(EFlag).map(flag => `@${flag}:`);
  flagMarks.push('# ');
  const regexp = getWrapRegExp(`^(${flagMarks.join('|')})`, '$', 'gm');
  const dataCopy = data;
  let match = regexp.exec(dataCopy);
  while (match) {
    if (!onlyClean) {
      if (match[1].startsWith('@')) {
        const flag = match[1].substring(1, match[1].length - 1);
        if ([EFlag.tags, EFlag.updated].map(flag => `@${flag}:`).includes(match[1])) {
          flags[flag] = splitFlag(match[2]);
        } else {
          flags[flag] = match[2];
        }
      } else {
        flags.title = match[2];
      }
    }
    if (cleanData) {
      data = data.replace(match[0], '');
    }
    match = regexp.exec(dataCopy);
  }
  data = data.trim();
  return { data, flags } as TMDFile;
}

async function searchFile(data: string, fileDict: TMDFileDict) {
  const paths: string[] = [];
  const regexp = new RegExp(`\\[.*?]\\((/.*?\\.md)\\)`, 'gm');
  let match = regexp.exec(data);
  while (match) {
    const path = match[1];
    if (!paths.includes(path) && fileDict[path] === undefined) {
      paths.push(path);
    }
    match = regexp.exec(data);
  }
  if (paths.length > 0) {
    let newData = '';
    const responses = await Promise.all(paths.map(path => axiosGet<string>(addBaseUrl(path))));
    responses.forEach(response => {
      newData += response.data + '\n';
      fileDict[cleanBaseUrl(response.config.url!)] = getFile(response.data);
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
      fileDict[cleanBaseUrl(response.config.url!)] = getFile(response.data);
    });
    await searchFile(data, fileDict);
    func(fileDict);
  });
}
