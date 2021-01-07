import { EEvent, EFlag, EIcon } from '@/ts/enums';
import { buildQueryFlagUrl, shortenPath } from '@/ts/path';
import { sleep } from '@/ts/utils';

let eventListenerDict: Dict<[(Document | Element)[], EventListenerOrEventListenerObject[]]> = {};

export function cleanEventListenerDict() {
  eventListenerDict = {};
}

export function addEventListener(element: Document | Element, type: string, listener: EventListenerOrEventListenerObject) {
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
    await sleep(timeout);
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

export function getSyncSpan(id?: string) {
  return `<span${id ? ` id="${id}"` : ''} class="sync">${getIcon(EIcon.sync)}</span>`;
}

export function getQueryTagLinks(tag: string) {
  const links: TAnchor[] = [];
  let start = 0;
  let indexOf = tag.indexOf('/');
  while (indexOf >= 0) {
    indexOf += start;
    links.push([buildQueryFlagUrl(EFlag.tags, tag.substring(0, indexOf)), tag.substring(start, indexOf)]);
    start = indexOf + 1;
    indexOf = tag.substring(start).indexOf('/');
  }
  links.push([buildQueryFlagUrl(EFlag.tags, tag), start > 0 ? tag.substring(start) : tag]);
  return links;
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

export function createList(file: ISimpleFile, li?: HTMLLIElement) {
  if (!li) {
    li = document.createElement('li');
    const a = document.createElement('a');
    a.href = `#${shortenPath(file.path)}`;
    a.innerText = file.flags.title;
    li.append(a);
  }
  li.classList.add('article');
  if (file.isError) {
    return li;
  }
  const bar = createBar(file.flags);
  if (bar) {
    li.append(bar[0]);
    li.append(bar[1]);
  }
  return li;
}
