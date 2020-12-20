import { config } from '@/ts/config';
import { cleanBaseUrl } from '@/ts/path';

export function getWrapRegExp(left: string, right = left, flags?: string) {
  return new RegExp(`${left}\\s*(.+?)\\s*${right}`, flags);
}

export function getHeadingPattern(min: number, max: number) {
  return ` {0,3}(#{${min},${max}})`;
}

export function getHeadingRegExp(min = 1, max = 6, flags?: string) {
  return new RegExp(`^${getHeadingPattern(min, max)}(?: \\s*(.+?))?$`, flags);
}

export function getLinkPathPattern(startWithSlash: boolean) {
  return `\\(\\s*(${startWithSlash ? '/' : ''}.*?)(?:\\s+["'].*?["'])?\\s*\\)`;
}

export function trimList(list: string[], distinct = true) {
  list = list.map(item => item.trim()).filter(item => item);
  return distinct ? Array.from(new Set(list)) : list;
}

export function addCacheKey(path: string, needClean = true) {
  let cacheKey = config.cacheKey;
  if (typeof cacheKey === 'object') {
    cacheKey = cacheKey[needClean ? cleanBaseUrl(path) : path];
  }
  return cacheKey ? `${path}?${cacheKey}` : path;
}

export function isExternalLink(href: string) {
  try {
    return !!new URL(href).host;
  } catch (e) {
    return false;
  }
}
