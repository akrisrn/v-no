import { config } from '@/ts/config';
import { EFlag } from '@/ts/enums';
import { Route } from 'vue-router';

const baseUrl: string = process.env.BASE_URL;
const indexPath: string = process.env.VUE_APP_INDEX_PATH;

let shortIndexPath = indexPath;
if (indexPath.endsWith('index.html')) {
  shortIndexPath = indexPath.replace(/index\.html$/, '');
}
export const homePath = baseUrl + shortIndexPath;
export const homePathForRoute = '/' + shortIndexPath;

export function addBaseUrl(path: string) {
  if (path.startsWith('/')) {
    if (path === '/') {
      return homePath;
    }
    if (config.cdn) {
      return config.cdn + path.substr(1);
    }
    if (baseUrl !== '/') {
      return baseUrl + path.substr(1);
    }
  }
  return path;
}

export function buildQueryContent(content: string, isComplete = false) {
  return (isComplete ? `#${config.paths.search}` : '') + `?content=${encodeURIComponent(content)}`;
}

function buildSearchFlagUrl(flag: EFlag, text: string) {
  return buildQueryContent(`@${flag}: ${text}`, true);
}

export function getSearchTagLinks(tag: string) {
  const list: string[][] = [];
  let start = 0;
  let indexOf = tag.indexOf('/');
  while (indexOf >= 0) {
    indexOf += start;
    list.push([buildSearchFlagUrl(EFlag.tags, tag.substring(0, indexOf)), tag.substring(start, indexOf)]);
    start = indexOf + 1;
    indexOf = tag.substring(start).indexOf('/');
  }
  list.push([buildSearchFlagUrl(EFlag.tags, tag), start > 0 ? tag.substring(start) : tag]);
  return list;
}

export function isExternalLink(href: string) {
  try {
    return !!new URL(href).host;
  } catch (e) {
    return false;
  }
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

export function parseRoute(route: Route) {
  let path = route.path;
  let query = '';
  let hash = '';
  if (path.endsWith('/')) {
    path += 'index.html';
  }
  if (path === `/${indexPath}`) {
    if (route.hash.startsWith('#/')) {
      path = route.hash.substr(1);
      let indexOf = path.indexOf('?');
      if (indexOf >= 0) {
        query = path.substr(indexOf + 1);
        path = path.substring(0, indexOf);
      }
      indexOf = path.indexOf('#');
      if (indexOf >= 0) {
        hash = path.substr(indexOf + 1);
        path = path.substring(0, indexOf);
      }
      if (path.endsWith('/')) {
        path += 'index.md';
      }
    } else {
      path = config.paths.index;
    }
  } else if (path.endsWith('.html')) {
    path = path.replace(/\.html$/, '.md');
  }
  return { path, query, hash };
}

export function changeHash(anchor: string) {
  let hash = location.hash;
  let query = '';
  let indexOf = hash.indexOf('?');
  if (indexOf >= 0) {
    query = hash.substr(indexOf);
    hash = hash.substr(0, indexOf);
  }
  indexOf = hash.substr(1).indexOf('#');
  if (indexOf >= 0) {
    hash = hash.substr(0, indexOf + 1);
  }
  location.hash = `${hash}#${anchor}${query}`;
}
