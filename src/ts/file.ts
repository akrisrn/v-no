import { addBaseUrl, EFlag, formatDate, getWrapRegExp, isExternalLink, trimList } from '@/ts/utils';
import { baseFiles, config } from '@/ts/config';
import axios from 'axios';

const cachedBacklinks: Dict<string[]> = {};

function createFlags(title = ''): IFlags {
  return {
    title,
    tags: [],
    updated: [],
    cover: '',
    startDate: '',
    endDate: '',
  };
}

export function createErrorFile(path: string): TFile {
  return {
    path,
    data: config.messages.pageError,
    flags: createFlags(path),
    links: [],
    isError: true,
  };
}

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
  const flags = createFlags();
  const flagMarks = Object.values(EFlag).map(flag => `@${flag}:`);
  flagMarks.push('# ');
  const flagRegExp = getWrapRegExp(`^(${flagMarks.join('|')})`, '$');
  const linkRegExp = /\[.*?]\((\/.*?)\)/g;
  const links: string[] = [];
  const lines: string[] = [];
  data.split('\n').forEach(line => {
    let flagMatch = line.match(flagRegExp);
    if (flagMatch) {
      const flagMark = flagMatch[1];
      const flagText = flagMatch[2];
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
      flagMatch = linkRegExp.exec(line);
      while (flagMatch) {
        const linkPath = checkLinkPath(flagMatch[1]);
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
        flagMatch = linkRegExp.exec(line);
      }
      lines.push(line.trimEnd());
    }
  });
  data = lines.join('\n').trim();
  if (!flags.title) {
    flags.title = path;
  }
  if (flags.tags.length > 0) {
    flags.tags = flags.tags.map(tag => trimList(tag.split('/'), false).join('/')).sort();
  }
  let cover = flags.cover;
  if (cover) {
    const linkMatch = cover.match(/^!\[.*?]\((.*?)\)$/);
    if (linkMatch) {
      cover = linkMatch[1];
    }
    if (!isExternalLink(cover)) {
      cover = addBaseUrl(cover);
    }
    flags.cover = cover;
  }
  const dateList = [...flags.updated];
  const dateMatch = path.match(/\/(\d{4}[/-]\d{2}[/-]\d{2})[/-]/);
  if (dateMatch) {
    dateList.push(formatDate(new Date(dateMatch[1])));
  }
  if (dateList.length > 0) {
    const timeList = Array.from(new Set(dateList.map(date => {
      return date.match(/^[0-9]+$/) ? parseInt(date) : new Date(date).getTime();
    }).filter(time => !isNaN(time)))).sort();
    const length = timeList.length;
    if (length > 0) {
      if (length === 1) {
        flags.startDate = flags.endDate = formatDate(new Date(timeList[0]));
      } else {
        flags.startDate = formatDate(new Date(timeList[0]));
        flags.endDate = formatDate(new Date(timeList[length - 1]));
      }
    }
  }
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
  return new Promise<TFile>(resolve => {
    if (cachedFiles[path] !== undefined) {
      isRequesting[path] = false;
      resolve(cachedFiles[path]);
    } else {
      requestCount++;
      axios.get<string>(addBaseUrl(path)).then(response => {
        cachedFiles[path] = parseData(path, response.data);
        isRequesting[path] = false;
        resolve(cachedFiles[path]);
      }).catch(() => {
        cachedFiles[path] = createErrorFile(path);
        isRequesting[path] = false;
        resolve(cachedFiles[path]);
      });
    }
  });
}

const walkedPaths = [...baseFiles];

async function walkFiles(files: TFile[]) {
  const paths: string[] = [];
  files.forEach(file => {
    if (!file.isError) {
      file.links.forEach(path => {
        if (!paths.includes(path) && (cachedFiles[path] === undefined || !walkedPaths.includes(path))) {
          paths.push(path);
          walkedPaths.push(path);
        }
      });
    }
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
