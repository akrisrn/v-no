import { baseFiles, config } from '@/ts/config';
import { formatDate } from '@/ts/date';
import { EFlag } from '@/ts/enums';
import { addBaseUrl, addCacheKey, checkLinkPath, isExternalLink, shortenPath } from '@/ts/path';
import { getHeadingRegExp, getLinkRegExp, getWrapRegExp } from '@/ts/regexp';
import { trimList } from '@/ts/utils';
import axios from 'axios';

function createFlags(title: string): IFlags {
  return { title };
}

export function createErrorFile(path: string): TFile {
  return {
    path,
    data: config.messages.pageError,
    flags: createFlags(shortenPath(path)),
    links: [],
    isError: true,
  };
}

const cachedBacklinks: Dict<string[]> = {};

function parseData(path: string, data: string): TFile {
  const flags = createFlags(shortenPath(path));
  const links: string[] = [];
  if (!data) {
    return { path, data, flags, links };
  }
  const flagRegExp = getWrapRegExp(`^@(\\S+?):`, '$');
  const titleRegExp = getHeadingRegExp(1, 1);
  const linkRegExp = getLinkRegExp(true, false, false, 'g');
  data = data.split('\n').map(line => {
    line = line.trimEnd();
    const flagMatch = line.match(flagRegExp);
    if (flagMatch) {
      const flagMark = flagMatch[1];
      const flagText = flagMatch[2];
      if ([EFlag.tags, EFlag.updated].includes(flagMark as EFlag)) {
        flags[flagMark] = trimList(flagText.split(/[,，、]/)).sort();
      } else {
        flags[flagMark] = flagText;
      }
      return '';
    }
    const titleMatch = line.match(titleRegExp);
    if (titleMatch) {
      if (titleMatch[2]) {
        flags.title = titleMatch[2];
      }
      return '';
    }
    let linkMatch = linkRegExp.exec(line);
    while (linkMatch) {
      const linkPath = checkLinkPath(linkMatch[2]);
      if (!linkPath || linkPath === path || links.includes(linkPath)) {
        linkMatch = linkRegExp.exec(line);
        continue;
      }
      links.push(linkPath);
      let backlinks = cachedBacklinks[linkPath];
      if (backlinks === undefined) {
        backlinks = [path];
        cachedBacklinks[linkPath] = backlinks;
      } else if (!backlinks.includes(path)) {
        backlinks.push(path);
      }
      linkMatch = linkRegExp.exec(line);
    }
    return line;
  }).join('\n').trim();
  if (flags.tags && flags.tags.length > 0) {
    flags.tags = flags.tags.map(tag => trimList(tag.split('/'), false).join('/')).sort();
  }
  let cover = flags.cover;
  if (cover) {
    const imageMatch = cover.match(getLinkRegExp(false, true, true));
    if (imageMatch) {
      cover = imageMatch[2];
    }
    if (!isExternalLink(cover)) {
      cover = addBaseUrl(cover);
    }
    flags.cover = cover;
  }
  const dateList = flags.updated ? [...flags.updated] : [];
  const dateMatch = path.match(/\/(\d{4}[/-]\d{2}[/-]\d{2})[/-]/);
  if (dateMatch) {
    dateList.push(dateMatch[1]);
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

const isRequesting: Dict<boolean> = {};
const cachedFiles: Dict<TFile> = {};

export async function getFile(path: string) {
  while (isRequesting[path]) {
    await new Promise(_ => setTimeout(_, 100));
  }
  isRequesting[path] = true;
  if (cachedFiles[path] !== undefined) {
    isRequesting[path] = false;
    return cachedFiles[path];
  } else {
    return new Promise<TFile>(resolve => {
      axios.get<string>(addBaseUrl(addCacheKey(path, false))).then(response => {
        cachedFiles[path] = parseData(path, response.data.trim());
      }).catch(() => {
        cachedFiles[path] = createErrorFile(path);
      }).finally(() => {
        isRequesting[path] = false;
        resolve(cachedFiles[path]);
      });
    });
  }
}

const walkedPaths = [...baseFiles];

async function walkFiles(files: TFile[]) {
  const paths: string[] = [];
  for (const file of files) {
    if (file.isError) {
      continue;
    }
    for (const path of file.links) {
      if (paths.includes(path) || cachedFiles[path] !== undefined && walkedPaths.includes(path)) {
        continue;
      }
      paths.push(path);
      walkedPaths.push(path);
    }
  }
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
