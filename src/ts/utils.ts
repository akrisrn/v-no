import { config } from '@/ts/config';
import dayjs from 'dayjs';
import SmoothScroll from 'smooth-scroll';

export enum EFlag {
  tags = 'tags',
  updated = 'updated',
  cover = 'cover',
}

export enum EIcon {
  link = 'M7.775 3.275a.75.75 0 001.06 1.06l1.25-1.25a2 2 0 112.83 2.83l-2.5 2.5a2 2 0 01-2.83 0 .75.75 0 00-1.06 1.06 3.5 3.5 0 004.95 0l2.5-2.5a3.5 3.5 0 00-4.95-4.95l-1.25 1.25zm-4.69 9.64a2 2 0 010-2.83l2.5-2.5a2 2 0 012.83 0 .75.75 0 001.06-1.06 3.5 3.5 0 00-4.95 0l-2.5 2.5a3.5 3.5 0 004.95 4.95l1.25-1.25a.75.75 0 00-1.06-1.06l-1.25 1.25a2 2 0 01-2.83 0z',
  backlink = 'M4 9h1v1H4c-1.5 0-3-1.69-3-3.5S2.55 3 4 3h4c1.45 0 3 1.69 3 3.5 0 1.41-.91 2.72-2 3.25V8.59c.58-.45 1-1.27 1-2.09C10 5.22 8.98 4 8 4H4c-.98 0-2 1.22-2 2.5S3 9 4 9zm9-3h-1v1h1c1 0 2 1.22 2 2.5S13.98 12 13 12H9c-.98 0-2-1.22-2-2.5 0-.83.42-1.64 1-2.09V6.25c-1.09.53-2 1.84-2 3.25C6 11.31 7.55 13 9 13h4c1.45 0 3-1.69 3-3.5S14.5 6 13 6z',
  external = 'M10.604 1h4.146a.25.25 0 01.25.25v4.146a.25.25 0 01-.427.177L13.03 4.03 9.28 7.78a.75.75 0 01-1.06-1.06l3.75-3.75-1.543-1.543A.25.25 0 0110.604 1zM3.75 2A1.75 1.75 0 002 3.75v8.5c0 .966.784 1.75 1.75 1.75h8.5A1.75 1.75 0 0014 12.25v-3.5a.75.75 0 00-1.5 0v3.5a.25.25 0 01-.25.25h-8.5a.25.25 0 01-.25-.25v-8.5a.25.25 0 01.25-.25h3.5a.75.75 0 000-1.5h-3.5z',
  sync = 'M8 2.5a5.487 5.487 0 00-4.131 1.869l1.204 1.204A.25.25 0 014.896 6H1.25A.25.25 0 011 5.75V2.104a.25.25 0 01.427-.177l1.38 1.38A7.001 7.001 0 0114.95 7.16a.75.75 0 11-1.49.178A5.501 5.501 0 008 2.5zM1.705 8.005a.75.75 0 01.834.656 5.501 5.501 0 009.592 2.97l-1.204-1.204a.25.25 0 01.177-.427h3.646a.25.25 0 01.25.25v3.646a.25.25 0 01-.427.177l-1.38-1.38A7.001 7.001 0 011.05 8.84a.75.75 0 01.656-.834z',
}

export function getFromWindow(name: string) {
  // @ts-ignore
  return window[name];
}

function setToWindow(name: string, value: any) {
  // @ts-ignore
  window[name] = value;
}

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

export function addTempClass(element: HTMLElement, cls: string, timeout = 500) {
  if (!element.classList.contains(cls)) {
    element.classList.add(cls);
    setTimeout(() => {
      removeClass(element, cls);
    }, timeout);
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

export function getLastedDate(dateList: string[]) {
  const timeList = dateList.map(date => {
    return date.match(/^[0-9]+$/) ? parseInt(date) : new Date(date).getTime();
  }).filter(time => !isNaN(time));
  if (timeList.length > 1) {
    return formatDate(new Date(Math.max(...timeList)));
  } else {
    return timeList.length === 1 ? formatDate(new Date(timeList[0])) : '';
  }
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

// noinspection JSSuspiciousNameCombination
export function getIcon(type: EIcon, width = 16, height = width) {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" width="${width}" height="${height}"><path fill-rule="evenodd" d="${type}"></path></svg>`;
}
