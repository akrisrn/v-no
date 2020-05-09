import axios from 'axios';

interface Config {
  indexFile: string;
  readmeFile: string;
  categoryFile: string;
  archiveFile: string;
  searchFile: string;
  commonFile: string;
  untagged: string;
  siteName: string;
  author: string;
  cdn: string;
}

export const config: Config = getFromWindow('vnoConfig');

export function exposeToWindow(vars: { [index: string]: any }) {
  let vno = getFromWindow('vno');
  if (!vno) {
    vno = {};
    setToWindow('vno', vno);
  }
  Object.keys(vars).forEach((key) => {
    vno[key] = vars[key];
  });
}

export function setToWindow(name: string, value: any) {
  // @ts-ignore
  window[name] = value;
}

export function getFromWindow(name: string) {
  // @ts-ignore
  return window[name];
}

export function getWrapRegExp(wrapLeft: string, wrapRight: string = wrapLeft, flags = '') {
  return new RegExp(`${wrapLeft}\\s*(.+?)\\s*${wrapRight}`, flags);
}

export function trimList(list: string[]) {
  const result: string[] = [];
  list.forEach((item) => {
    const trim = item.trim();
    if (trim) {
      result.push(trim);
    }
  });
  return result;
}

export function splitFlag(flag: string) {
  return trimList(flag.split(/\s*[,，]\s*/));
}

export function splitTagsFromCodes(codes: string) {
  const tags = codes.split(/`\s+`/);
  tags[0] = tags[0].substr(1);
  const last = tags.length - 1;
  tags[last] = tags[last].substr(0, tags[last].length - 1);
  return trimList(tags);
}

export function isHashMode() {
  return !location.href.endsWith('?prerender') && !document.body.classList.contains('prerender');
}

export function isLocalhost() {
  return ['localhost', '127.0.0.1'].includes(location.hostname);
}

export function escapeHTML(html: string) {
  const symbols: { [index: string]: string } = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
  };
  const regexp = new RegExp(`[${Object.keys(symbols).join('')}]`, 'g');
  return html.replace(regexp, (symbol) => {
    return symbols[symbol];
  });
}

export function removeClass(element: HTMLElement, cls: string) {
  element.classList.remove(cls);
  if (element.classList.length === 0) {
    element.removeAttribute('class');
  }
}

export function axiosGet(url: string) {
  return axios.get((useCDN && !url.startsWith('http')) ? getCDN(url) : url);
}

export function getCDN(url: string) {
  if (config.cdn.endsWith('/')) {
    if (url.startsWith('/')) {
      url = url.substr(1);
    }
  } else if (!url.startsWith('/')) {
    url += '/' + url;
  }
  return config.cdn + url;
}

export const useCDN = !!config.cdn && !isLocalhost();
