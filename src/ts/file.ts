import { addBaseUrl, cleanBaseUrl, config, EFlag, getWrapRegExp, trimList } from '@/ts/utils';
import axios, { AxiosError } from 'axios';

function splitFlag(flag: string) {
  return trimList(flag.split(/\s*[,，、]\s*/));
}

function splitFlags(data: string) {
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
    data = data.replace(match[0], '');
    match = regexp.exec(dataCopy);
  }
  data = data.trim();
  return { data, flags } as TMDFile;
}

const cachedFiles: TMDFileDict = {};
let isCacheComplete = false;

export function getFile(path: string, noCache = false) {
  path = cleanBaseUrl(path);
  return new Promise<TMDFile>((resolve, reject) => {
    if (!noCache && cachedFiles[path] !== undefined) {
      resolve(cachedFiles[path]);
    } else {
      axios.get<string>(addBaseUrl(path)).then(response => {
        cachedFiles[path] = splitFlags(response.data);
        resolve(cachedFiles[path]);
      }).catch(error => {
        reject(error);
      });
    }
  });
}

async function searchFile(data: string) {
  const paths: string[] = [];
  const regexp = /\[.*?]\((\/.*?\.md)\)/gm;
  let match = regexp.exec(data);
  while (match) {
    const path = match[1];
    if (!paths.includes(path) && cachedFiles[path] === undefined) {
      paths.push(path);
    }
    match = regexp.exec(data);
  }
  if (paths.length > 0) {
    const files = await Promise.all(paths.map(path => getFile(path)));
    await searchFile(files.map(file => file.data).join('\n'));
  }
}

export function getFileDict(func: (files: TMDFileDict) => void) {
  if (isCacheComplete) {
    func(cachedFiles);
  } else {
    Promise.all([
      config.paths.index,
      config.paths.readme,
      config.paths.category,
      config.paths.archive,
      config.paths.search,
      config.paths.common,
    ].map(path => getFile(path))).then(async files => {
      await searchFile(files.map(file => file.data).join('\n'));
      isCacheComplete = true;
      func(cachedFiles);
    });
  }
}

export function getErrorFile(error: AxiosError) {
  return {
    data: config.messages.pageError,
    flags: {
      title: `${error.response!.status} ${error.response!.statusText}`,
      tags: [],
      updated: [],
      cover: '',
    },
  } as TMDFile;
}
