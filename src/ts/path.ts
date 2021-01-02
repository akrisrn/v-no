import { config, homeHash, shortBaseFiles } from '@/ts/config';
import { EFlag } from '@/ts/enums';
import { chopStr } from '@/ts/utils';
import { Route } from 'vue-router';

export function checkLinkPath(path: string) {
  if (path.endsWith('.md')) {
    return path;
  }
  if (path.endsWith('/')) {
    return path + 'index.md';
  }
  return '';
}

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

export const baseUrl: string = process.env.BASE_URL;
export const publicPath: string = process.env.VUE_APP_PUBLIC_PATH;
export const indexPath: string = process.env.VUE_APP_INDEX_PATH;
export const cdnUrl: string = process.env.VUE_APP_CDN_URL;

export const homePath = publicPath + shortenPath(indexPath, 'html');

let noCDN = !!localStorage.getItem('noCDN');

// noinspection JSUnusedGlobalSymbols
export function disableCDN() {
  noCDN = true;
  localStorage.setItem('noCDN', String(true));
}

// noinspection JSUnusedGlobalSymbols
export function enableCDN() {
  noCDN = false;
  localStorage.removeItem('noCDN');
}

export function addBaseUrl(path: string) {
  if (!path.startsWith('/')) {
    return path;
  }
  if (path === '/') {
    return homePath;
  }
  if (noCDN) {
    return publicPath !== '/' ? publicPath + path.substr(1) : path;
  }
  if (!cdnUrl && config.cdn) {
    return config.cdn + path.substr(1);
  }
  if (baseUrl !== '/') {
    return baseUrl + path.substr(1);
  }
  return path;
}

export function cleanBaseUrl(path: string) {
  if (baseUrl !== '/' && path.startsWith(baseUrl)) {
    return path.substr(baseUrl.length - 1);
  }
  if (config.cdn && path.startsWith(config.cdn)) {
    return path.substr(config.cdn.length - 1);
  }
  if (publicPath !== '/' && path.startsWith(publicPath)) {
    return path.substr(publicPath.length - 1);
  }
  if (path === homePath) {
    return '/';
  }
  return path;
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

export function buildQueryContent(content: string, isFull = false) {
  const query = `content=${encodeURIComponent(content)}`;
  return isFull ? buildHash({
    path: shortBaseFiles.search,
    anchor: '',
    query,
  }) : query;
}

export function buildQueryFlagUrl(flag: EFlag, text: string) {
  return buildQueryContent(`@${flag}: ${text}`, true);
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
  if (chop[1] !== null) {
    path = chop[0];
    query = chop[1];
  }
  chop = chopStr(path, '#', false);
  if (chop[1] !== null) {
    path = chop[0];
    anchor = chop[1];
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

export function changeAnchor(anchor: string) {
  const { path, query } = parseHash(location.hash, true);
  location.hash = buildHash({ path, anchor, query });
}

export function changeQueryContent(content: string) {
  const query = content ? buildQueryContent(content) : '';
  const { path, anchor } = parseHash(location.hash, true);
  location.hash = buildHash({ path, anchor, query });
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
    if (chop[1] !== null) {
      const key = decodeURIComponent(chop[0]).trim();
      if (key) {
        query[key] = decodeURIComponent(chop[1]).trim();
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

export function returnHome() {
  if (location.hash) {
    location.hash = homeHash;
  }
}
