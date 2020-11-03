import { addBaseUrl, baseFiles, config, EFlag, getWrapRegExp, trimList } from '@/ts/utils';
import axios, { AxiosError } from 'axios';

let isCacheComplete = false;
const cachedFiles: TMDFileDict = {};
const cachedBacklinks: Dict<string[]> = {};

function parseData(path: string, data: string): TMDFile {
  const flags: IFlags = {
    title: '',
    tags: [],
    updated: [],
    cover: '',
  };
  const flagMarks = Object.values(EFlag).map(flag => `@${flag}:`);
  flagMarks.push('# ');
  const flagRegExp = getWrapRegExp(`^(${flagMarks.join('|')})`, '$');
  const linkRegExp = /\[.*?]\((\/.*?\.md)\)/;
  const links: string[] = [];
  const lines: string[] = [];
  data.split('\n').forEach(line => {
    let match = line.match(flagRegExp);
    if (match) {
      if (match[1].startsWith('@')) {
        const flag = match[1].substring(1, match[1].length - 1);
        if ([EFlag.tags, EFlag.updated].map(flag => `@${flag}:`).includes(match[1])) {
          flags[flag] = trimList(match[2].split(/\s*[,，、]\s*/));
        } else {
          flags[flag] = match[2];
        }
      } else {
        flags.title = match[2];
      }
    } else {
      match = line.match(linkRegExp);
      if (match) {
        const linkPath = match[1];
        if (linkPath !== path && !links.includes(linkPath)) {
          links.push(linkPath);
          let backlinks = cachedBacklinks[linkPath];
          if (backlinks === undefined) {
            backlinks = [path];
            cachedBacklinks[linkPath] = backlinks;
          } else if (!backlinks.includes(path)) {
            backlinks.push(path);
          }
        }
      }
      lines.push(line);
    }
  });
  data = lines.join('\n').trim();
  return { path, data, flags, links };
}

export function getFile(path: string) {
  return new Promise<TMDFile>((resolve, reject) => {
    if (cachedFiles[path] !== undefined) {
      resolve(cachedFiles[path]);
    } else {
      axios.get<string>(addBaseUrl(path)).then(response => {
        cachedFiles[path] = parseData(path, response.data);
        resolve(cachedFiles[path]);
      }).catch(error => {
        reject(error);
      });
    }
  });
}

async function walkFiles(files: TMDFile[]) {
  const paths: string[] = [];
  files.forEach(file => {
    file.links.forEach(path => {
      if (cachedFiles[path] === undefined && !paths.includes(path)) {
        paths.push(path);
      }
    });
  });
  if (paths.length > 0) {
    await walkFiles(await Promise.all(paths.map(path => getFile(path))));
  }
}

export function getFiles(func: (files: TMDFileDict, backlinks: Dict<string[]>) => void) {
  if (isCacheComplete) {
    func(cachedFiles, cachedBacklinks);
  } else {
    Promise.all(baseFiles.map(path => getFile(path))).then(async files => {
      await walkFiles(files);
      isCacheComplete = true;
      func(cachedFiles, cachedBacklinks);
    });
  }
}

export function getErrorFile(error: AxiosError) {
  return {
    path: '',
    data: config.messages.pageError,
    flags: {
      title: `${error.response!.status} ${error.response!.statusText}`,
      tags: [],
      updated: [],
      cover: '',
    },
    links: [],
  } as TMDFile;
}
