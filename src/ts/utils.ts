import dayjs from 'dayjs';
import SmoothScroll from 'smooth-scroll';

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

export function evalFunction(evalStr: string, params: Dict<any>) {
  return eval(`(function(${Object.keys(params).join()}){${evalStr}})`)(...Object.values(params));
}

export function isHashMode() {
  return !location.href.endsWith('?prerender') && !document.body.classList.contains('prerender');
}

export function isExternalLink(href: string) {
  return href.indexOf(':') >= 0;
}

export function trimList(list: string[]) {
  return Array.from(new Set(list.map(item => item.trim()).filter(item => item)));
}

export function getWrapRegExp(left: string, right: string = left, flags = '', isGreedy = false) {
  return new RegExp(`${left}\\s*(.+${isGreedy ? '' : '?'})\\s*${right}`, flags);
}

export function escapeHTML(html: string) {
  const symbols: Dict<string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
  };
  const regexp = new RegExp(`[${Object.keys(symbols).join('')}]`, 'g');
  return html.replace(regexp, symbol => symbols[symbol]);
}

export function removeClass(element: HTMLElement, cls: string) {
  element.classList.remove(cls);
  if (element.classList.length === 0) {
    element.removeAttribute('class');
  }
}

export function toggleClass(element: HTMLElement, className: string) {
  if (element.classList.contains(className)) {
    removeClass(element, className);
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
  return data.replace(/^(#{2,5}) /gm, '$1# ');
}

export function formatDate(date: Date) {
  return config.dateFormat ? dayjs(date).format(config.dateFormat) : date.toDateString();
}

export function getDateFromPath(path: string) {
  const match = path.match(/\/(\d{4}[/-]\d{2}[/-]\d{2})[/-]/);
  return match ? formatDate(new Date(match[1])) : '';
}

export function buildQueryContent(content: string, isComplete = false) {
  return (isComplete ? `#${config.paths.search}` : '') + `?content=${encodeURIComponent(content)}`;
}

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
