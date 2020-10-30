import { cleanFlags } from '@/ts/data';
import axios from 'axios';

interface Config {
  siteName: string;
  favicon: string;
  indexFile: string;
  readmeFile: string;
  categoryFile: string;
  archiveFile: string;
  searchFile: string;
  commonFile: string;
  untagged: string;
}

export function getFromWindow(name: string) {
  // @ts-ignore
  return window[name];
}

export function setToWindow(name: string, value: any) {
  // @ts-ignore
  window[name] = value;
}

export const config: Config = Object.assign({}, getFromWindow('vnoConfig'));

export function exposeToWindow(vars: { [index: string]: any }) {
  let vno = getFromWindow('vno');
  if (!vno) {
    vno = {};
    setToWindow('vno', vno);
  }
  Object.keys(vars).forEach(key => {
    vno[key] = vars[key];
  });
}

export function getWrapRegExp(wrapLeft: string, wrapRight: string = wrapLeft, flags = '') {
  return new RegExp(`${wrapLeft}\\s*(.+?)\\s*${wrapRight}`, flags);
}

export function trimList(list: string[]) {
  const result: string[] = [];
  list.forEach(item => {
    const trim = item.trim();
    if (trim) {
      result.push(trim);
    }
  });
  return Array.from(new Set(result));
}

export function splitFlag(flag: string) {
  return trimList(flag.split(/\s*[,，、]\s*/));
}

export function isHashMode() {
  return !location.href.endsWith('?prerender') && !document.body.classList.contains('prerender');
}

export function escapeHTML(html: string) {
  const symbols: { [index: string]: string } = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
  };
  const regexp = new RegExp(`[${Object.keys(symbols).join('')}]`, 'g');
  return html.replace(regexp, symbol => {
    return symbols[symbol];
  });
}

export function removeClass(element: HTMLElement, cls: string) {
  element.classList.remove(cls);
  if (element.classList.length === 0) {
    element.removeAttribute('class');
  }
}

export function axiosGet<T>(url: string) {
  return axios.get<T>(url);
}

export function toggleClass(element: HTMLElement, className: string) {
  if (element.classList.contains(className)) {
    element.classList.remove(className);
  } else {
    element.classList.add(className);
  }
}

export function isExternalLink(href: string) {
  return href.indexOf(':') >= 0;
}

const baseUrl = process.env.BASE_URL;

export function addBaseUrl(path: string) {
  if (path.startsWith('/') && baseUrl !== '/' && !path.startsWith(baseUrl)) {
    return baseUrl + path.substr(1);
  }
  return path;
}

export function cleanBaseUrl(path: string) {
  if (path.startsWith('/') && baseUrl !== '/' && path.startsWith(baseUrl)) {
    return path.substr(baseUrl.length - 1);
  }
  return path;
}

export function getSnippetData(data: string) {
  return cleanFlags(data).replace(/^(#{1,5}) /gm, '$1# ');
}
