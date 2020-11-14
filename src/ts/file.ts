import { addBaseUrl, EFlag, getWrapRegExp, trimList } from '@/ts/utils';
import { baseFiles, config } from '@/ts/config';
import axios, { AxiosError } from 'axios';

const cachedBacklinks: Dict<string[]> = {};

export function checkLinkPath(path: string) {
  if (!path.endsWith('.md')) {
    if (path.endsWith('/')) {
      path += 'index.md';
    } else {
      path = '';
    }
  }
  return path;
}

function parseData(path: string, data: string): TFile {
  const flags: IFlags = {
    title: '',
    tags: [],
    updated: [],
    cover: '',
  };
  const flagMarks = Object.values(EFlag).map(flag => `@${flag}:`);
  flagMarks.push('# ');
  const flagRegExp = getWrapRegExp(`^(${flagMarks.join('|')})`, '$');
  const linkRegExp = /\[.*?]\((\/.*?)\)/g;
  const links: string[] = [];
  const lines: string[] = [];
  data.split('\n').forEach(line => {
    let match = line.match(flagRegExp);
    if (match) {
      if (match[1].startsWith('@')) {
        const flag = match[1].substring(1, match[1].length - 1);
        if ([EFlag.tags, EFlag.updated].map(flag => `@${flag}:`).includes(match[1])) {
          flags[flag] = trimList(match[2].split(/\s*[,，、]\s*/)).sort();
        } else {
          flags[flag] = match[2];
        }
      } else {
        flags.title = match[2];
      }
    } else {
      match = linkRegExp.exec(line);
      while (match) {
        const linkPath = checkLinkPath(match[1]);
        if (linkPath && linkPath !== path && !links.includes(linkPath)) {
          links.push(linkPath);
          let backlinks = cachedBacklinks[linkPath];
          if (backlinks === undefined) {
            backlinks = [path];
            cachedBacklinks[linkPath] = backlinks;
          } else if (!backlinks.includes(path)) {
            backlinks.push(path);
          }
        }
        match = linkRegExp.exec(line);
      }
      lines.push(line);
    }
  });
  data = lines.join('\n').trim();
  return { path, data, flags, links };
}

const isRequesting: Dict<boolean> = {};
const cachedFiles: Dict<TFile> = {};

export async function getFile(path: string) {
  while (isRequesting[path]) {
    await new Promise(_ => setTimeout(_, 200));
  }
  isRequesting[path] = true;
  return new Promise<TFile>((resolve, reject) => {
    if (cachedFiles[path] !== undefined) {
      isRequesting[path] = false;
      resolve(cachedFiles[path]);
    } else {
      axios.get<string>(addBaseUrl(path)).then(response => {
        isRequesting[path] = false;
        cachedFiles[path] = parseData(path, response.data);
        resolve(cachedFiles[path]);
      }).catch(error => {
        isRequesting[path] = false;
        reject(error);
      });
    }
  });
}

async function walkFiles(files: TFile[]) {
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

let isCacheCompleted = false;

export async function getFiles() {
  if (!isCacheCompleted) {
    const files = await Promise.all(baseFiles.map(path => getFile(path)));
    await walkFiles(files);
    isCacheCompleted = true;
  }
  return { files: cachedFiles, backlinks: cachedBacklinks };
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
  } as TFile;
}
