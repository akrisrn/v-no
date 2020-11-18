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
      const flagMark = match[1];
      const flagText = match[2];
      if (flagMark.startsWith('@')) {
        const flag = flagMark.substring(1, flagMark.length - 1);
        if ([EFlag.tags, EFlag.updated].includes(flag as EFlag)) {
          flags[flag] = trimList(flagText.split(/[,，、]/)).sort();
        } else {
          flags[flag] = flagText;
        }
      } else {
        flags.title = flagText;
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
      lines.push(line.trimEnd());
    }
  });
  data = lines.join('\n').trim();
  flags.tags = flags.tags.map(tag => trimList(tag.split('/'), false).join('/')).sort();
  return { path, data, flags, links };
}

let requestCount = 0;

export function resetRequestCount() {
  requestCount = 0;
}

export function noRequest() {
  return requestCount === 0;
}

const isRequesting: Dict<boolean> = {};
const cachedFiles: Dict<TFile> = {};

export async function getFile(path: string) {
  while (isRequesting[path]) {
    await new Promise(_ => setTimeout(_, 100));
  }
  isRequesting[path] = true;
  return new Promise<TFile>((resolve, reject) => {
    if (cachedFiles[path] !== undefined) {
      isRequesting[path] = false;
      resolve(cachedFiles[path]);
    } else {
      requestCount++;
      axios.get<string>(addBaseUrl(path)).then(response => {
        cachedFiles[path] = parseData(path, response.data);
        isRequesting[path] = false;
        resolve(cachedFiles[path]);
      }).catch(error => {
        isRequesting[path] = false;
        reject(error);
      });
    }
  });
}

const walkedPaths = [...baseFiles];

async function walkFiles(files: TFile[]) {
  const paths: string[] = [];
  files.forEach(file => {
    file.links.forEach(path => {
      if (!paths.includes(path) && (cachedFiles[path] === undefined || !walkedPaths.includes(path))) {
        paths.push(path);
        walkedPaths.push(path);
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
    await walkFiles(await Promise.all(baseFiles.map(path => getFile(path))));
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
