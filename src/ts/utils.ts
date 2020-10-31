export enum EFlag {
  tags = 'tags',
  updated = 'updated',
  cover = 'cover',
}

function getFromWindow(name: string) {
  // @ts-ignore
  return window[name];
}

function setToWindow(name: string, value: any) {
  // @ts-ignore
  window[name] = value;
}

export const config: IConfig = Object.assign({}, getFromWindow('vnoConfig'));

export function exposeToWindow(vars: Dict<any>) {
  let vno = getFromWindow('vno');
  if (!vno) {
    vno = {};
    setToWindow('vno', vno);
  }
  Object.keys(vars).forEach(key => {
    vno[key] = vars[key];
  });
}

export function isHashMode() {
  return !location.href.endsWith('?prerender') && !document.body.classList.contains('prerender');
}

export function isExternalLink(href: string) {
  return href.indexOf(':') >= 0;
}

export function getWrapRegExp(wrapLeft: string, wrapRight: string = wrapLeft, flags = '') {
  return new RegExp(`${wrapLeft}\\s*(.+?)\\s*${wrapRight}`, flags);
}

export function escapeHTML(html: string) {
  const symbols: Dict<string> = {
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

export function toggleClass(element: HTMLElement, className: string) {
  if (element.classList.contains(className)) {
    element.classList.remove(className);
  } else {
    element.classList.add(className);
  }
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

export function degradeHeading(data: string) {
  return data.replace(/^(#{1,5}) /gm, '$1# ');
}

function getDate(path: string) {
  if (path) {
    const match = path.match(/(\d{4}[/-]\d{2}[/-]\d{2})/);
    if (match) {
      return new Date(match[1]);
    }
  }
  return null;
}

export function getDateString(path: string) {
  const date = getDate(path);
  return date ? date.toDateString() : '';
}

export function buildQueryContent(content: string, isComplete = false) {
  return (isComplete ? `#${config.paths.search}` : '') + `?content=${encodeURIComponent(content)}`;
}

export function getQueryContent(params: Dict<string>) {
  return params.content ? decodeURIComponent(params.content) : '';
}

export function getQueryTypeAndParam(queryContent: string) {
  const match = queryContent.match(/^@(.*?):\s*(.*?)\s*$/);
  if (match) {
    return [match[1], match[2]];
  }
  return ['', ''];
}

export function getQueryLink(type: EFlag, param: string) {
  return buildQueryContent(`@${type}:${param}`, true);
}

import SmoothScroll from 'smooth-scroll';

const smoothScroll = new SmoothScroll(undefined, {
  speed: 300,
});

export function scroll(height: number, isSmooth = true) {
  if (isSmooth) {
    smoothScroll.animateScroll(height);
  } else {
    scrollTo(0, height);
  }
}
