import { EEvent, EFlag, EIcon } from '@/ts/enums';
import { buildQueryFlagUrl, checkLinkPath, shortenPath } from '@/ts/path';
import { state } from '@/ts/store';
import { importFileTs } from '@/ts/async';

let eventListenerDict: Dict<[Element[], EventListenerOrEventListenerObject[]]> = {};

export function cleanEventListenerDict() {
  eventListenerDict = {};
}

export function addEventListener(element: Element, type: string, listener: EventListenerOrEventListenerObject) {
  let eventListeners = eventListenerDict[type];
  if (eventListeners === undefined) {
    eventListeners = [[element], [listener]];
    eventListenerDict[type] = eventListeners;
    element.addEventListener(type, listener);
    return;
  }
  const indexOf = eventListeners[0].indexOf(element);
  if (indexOf >= 0) {
    element.removeEventListener(type, eventListeners[1][indexOf]);
    eventListeners[1].splice(indexOf, 1, listener);
  } else {
    eventListeners[0].push(element);
    eventListeners[1].push(listener);
  }
  element.addEventListener(type, listener);
}

export async function dispatchEvent<T>(type: EEvent, payload?: T, timeout?: number) {
  if (timeout) {
    await new Promise(_ => setTimeout(_, timeout));
  }
  return document.dispatchEvent(new CustomEvent<T>(type, { detail: payload }));
}

export function removeClass(element: Element, cls?: string) {
  if (cls) {
    element.classList.remove(cls);
  }
  if (element.classList.length === 0) {
    element.removeAttribute('class');
  }
}

const html = document.documentElement;
html.style.scrollBehavior = 'smooth';

export function scroll(height: number, isSmooth = true) {
  html.style.scrollBehavior = !isSmooth ? 'auto' : 'smooth';
  setTimeout(() => scrollTo(0, height), 0);
}

// noinspection JSSuspiciousNameCombination
export function getIcon(type: EIcon, width = 16, height = width) {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" width="${width}" height="${height}"><path fill-rule="evenodd" d="${type}"></path></svg>`;
}

export function getQueryTagLinks(tag: string) {
  const list: string[][] = [];
  let start = 0;
  let indexOf = tag.indexOf('/');
  while (indexOf >= 0) {
    indexOf += start;
    list.push([buildQueryFlagUrl(EFlag.tags, tag.substring(0, indexOf)), tag.substring(start, indexOf)]);
    start = indexOf + 1;
    indexOf = tag.substring(start).indexOf('/');
  }
  list.push([buildQueryFlagUrl(EFlag.tags, tag), start > 0 ? tag.substring(start) : tag]);
  return list;
}

function createBar(flags: IFlags) {
  const bar = document.createElement('div');
  bar.classList.add('bar');
  flags.tags && flags.tags.forEach(tag => {
    const itemTag = document.createElement('code');
    itemTag.classList.add('item-tag');
    getQueryTagLinks(tag).forEach(link => {
      const a = document.createElement('a');
      a.href = link[0];
      a.innerText = link[1];
      itemTag.append(a);
    });
    bar.append(itemTag);
  });
  if (flags.startDate) {
    const itemDate = document.createElement('code');
    itemDate.classList.add('item-date');
    itemDate.innerText = flags.startDate;
    bar.append(itemDate);
  }
  if (bar.childElementCount > 0) {
    const filler = document.createElement('span');
    filler.classList.add('filler');
    return [filler, bar];
  } else {
    return null;
  }
}

export function createList({ path, flags, isError }: TFile, li?: HTMLLIElement) {
  if (!li) {
    li = document.createElement('li');
    const a = document.createElement('a');
    a.href = `#${shortenPath(path)}`;
    a.innerText = flags.title;
    li.append(a);
  }
  li.classList.add('article');
  if (isError) {
    return li;
  }
  const bar = createBar(flags);
  if (bar) {
    li.append(bar[0]);
    li.append(bar[1]);
  }
  return li;
}

export async function simpleUpdateLinkPath(callback?: (file: TFile, a: HTMLAnchorElement) => void) {
  const dict: Dict<HTMLAnchorElement[]> = {};
  for (const a of document.querySelectorAll<HTMLAnchorElement>('a[href^="#/"]')) {
    const path = checkLinkPath(a.getAttribute('href')!.substr(1));
    if (!path) {
      continue;
    }
    if (path === state.filePath) {
      a.classList.add('self');
    } else {
      removeClass(a, 'self');
    }
    if (a.innerText !== '') {
      continue;
    }
    a.innerText = '#';
    a.classList.add('rendering');
    const links = dict[path];
    if (links !== undefined) {
      links.push(a);
      continue;
    }
    dict[path] = [a];
  }
  const paths = Object.keys(dict);
  if (paths.length === 0) {
    return;
  }
  const files = await Promise.all(paths.map(async path => (await importFileTs()).getFile(path)));
  files.forEach(file => {
    for (const a of dict[file.path]) {
      if (file.isError) {
        a.classList.add('error');
      }
      a.innerText = file.flags.title;
      if (callback) {
        callback(file, a);
      }
      removeClass(a, 'rendering');
    }
  });
}
