import { config, shortPaths } from '@/ts/config';
import { EFlag } from '@/ts/enums';
import { chopStr } from '@/ts/utils';
import { Route } from 'vue-router';

const baseUrl: string = process.env.BASE_URL;
const indexPath: string = process.env.VUE_APP_INDEX_PATH;

export function shortenPath(path: string, ext = 'md') {
  const indexFile = `index.${ext}`;
  if (path === indexFile) {
    return '';
  }
  if (path.endsWith(`/${indexFile}`)) {
    return path.replace(new RegExp(`index\\.${ext}$`), '');
  }
  return path;
}

export const homePath = baseUrl + shortenPath(indexPath, 'html');

export function addBaseUrl(path: string) {
  if (!path.startsWith('/')) {
    return path;
  }
  if (path === '/') {
    return homePath;
  }
  if (config.cdn) {
    return config.cdn + path.substr(1);
  }
  if (baseUrl !== '/') {
    return baseUrl + path.substr(1);
  }
  return path;
}

function cleanBaseUrl(path: string) {
  if (!path.startsWith('/')) {
    return path;
  }
  if (path === homePath) {
    return '/';
  }
  if (config.cdn && path.startsWith(config.cdn)) {
    return path.substr(config.cdn.length - 1);
  }
  if (baseUrl !== '/' && path.startsWith(baseUrl)) {
    return path.substr(baseUrl.length - 1);
  }
  return path;
}

export function addCacheKey(path: string, needClean = true) {
  let cacheKey = config.cacheKey;
  if (typeof cacheKey === 'object') {
    cacheKey = cacheKey[needClean ? cleanBaseUrl(path) : path];
  }
  return cacheKey ? `${path}?${cacheKey}` : path;
}

export function buildHash(hashPath: THashPath) {
  const { path, anchor, query } = hashPath;
  let hash = `#${path}`;
  if (anchor) {
    hash += `#${anchor}`;
  }
  if (query) {
    hash += `?${query}`;
  }
  return hash;
}

export function buildSearchContent(content: string, isFull = false) {
  const query = `content=${encodeURIComponent(content)}`;
  return isFull ? buildHash({
    path: shortPaths.search,
    anchor: '',
    query,
  }) : query;
}

function buildSearchFlagUrl(flag: EFlag, text: string) {
  return buildSearchContent(`@${flag}: ${text}`, true);
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
  if (path.endsWith('.md')) {
    return path;
  }
  if (path.endsWith('/')) {
    return path + 'index.md';
  }
  return '';
}

export function parseHash(hash: string, isShort = false): THashPath {
  let path = config.paths.index;
  let anchor = '';
  let query = '';
  if (!hash.startsWith('#/')) {
    return { path: isShort ? shortenPath(path) : path, anchor, query };
  }
  path = hash.substr(1);
  let chop = chopStr(path, '?', false);
  if (chop.value !== null) {
    path = chop.key;
    query = chop.value;
  }
  chop = chopStr(path, '#', false);
  if (chop.value !== null) {
    path = chop.key;
    anchor = chop.value;
  }
  if (path.endsWith('/')) {
    if (!isShort) {
      path += 'index.md';
    }
  } else if (isShort) {
    path = shortenPath(path);
  }
  return { path, anchor, query };
}

export function parseRoute(route: Route) {
  let path = route.path;
  if (path.endsWith('/')) {
    path += 'index.html';
  }
  if (path === `/${indexPath}`) {
    return parseHash(route.hash);
  }
  if (path.endsWith('.html')) {
    path = path.replace(/\.html$/, '.md');
  }
  return { path, anchor: '', query: '' };
}

export function parseQuery(queryStr: string) {
  const query: TQuery = {};
  queryStr.split('&').forEach(value => {
    const chop = chopStr(value, '=', false);
    if (chop.value !== null) {
      const key = decodeURIComponent(chop.key).trim();
      if (key) {
        query[key] = decodeURIComponent(chop.value).trim();
      }
    } else {
      value = decodeURIComponent(value).trim();
      if (value) {
        query[value] = null;
      }
    }
  });
  return query;
}

export function formatQuery(query: TQuery) {
  const list: string[] = [];
  for (const key of Object.keys(query)) {
    let trimKey = key.trim();
    if (!trimKey) {
      continue;
    }
    trimKey = encodeURIComponent(trimKey);
    const value = query[key];
    if (value !== null) {
      list.push(`${trimKey}=${encodeURIComponent(value.trim())}`);
    } else {
      list.push(trimKey);
    }
  }
  return list.join('&');
}

export function changeHash(anchor: string) {
  const { path, query } = parseHash(location.hash, true);
  location.hash = buildHash({ path, anchor, query });
}
