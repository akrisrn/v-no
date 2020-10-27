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
  favicon: string;
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
  Object.keys(vars).forEach((key) => {
    vno[key] = vars[key];
  });
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
  return trimList(flag.split(/\s*[,，、]\s*/));
}

export function splitTagsFromCodes(codes: string) {
  const tags = codes.split(/`\s+`/);
  tags[0] = tags[0].substr(1);
  const last = tags.length - 1;
  tags[last] = tags[last].substring(0, tags[last].length - 1);
  return trimList(tags);
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
  return axios.get(url);
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

export function fixAbsPath(path: string) {
  const baseUrl = process.env.BASE_URL;
  if (path.startsWith('/') && baseUrl !== '/' && !path.startsWith(baseUrl)) {
    return baseUrl + path.substr(1);
  } else {
    return path;
  }
}
