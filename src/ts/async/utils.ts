import { config } from '@/ts/config';
import { getSyncSpan } from '@/ts/element';
import { EEvent } from '@/ts/enums';
import { cleanBaseUrl } from '@/ts/path';
import { destructors } from '@/ts/utils';
import { isCached } from '@/ts/async/file';
import axios from 'axios';

export function trimList(list: string[], distinct = true) {
  list = list.map(item => item.trim()).filter(item => item);
  return distinct ? Array.from(new Set(list)) : list;
}

export function addCacheKey(path: string, needClean = true) {
  if (!isCached()) {
    return `${path}?t=${new Date().getTime()}`;
  }
  let cacheKey = config.cacheKey;
  if (typeof cacheKey === 'object') {
    cacheKey = cacheKey[needClean ? cleanBaseUrl(path) : path];
  }
  return cacheKey ? `${path}?${cacheKey}` : path;
}

export function isExternalLink(href: string) {
  try {
    return !!new URL(href).host;
  } catch (e) {
    return false;
  }
}

export function stringifyAny(value: any) {
  switch (typeof value) {
    case 'object':
      try {
        return JSON.stringify(value);
      } catch {
        return Object.prototype.toString.call(value);
      }
    case 'function':
    case 'symbol':
      return Object.prototype.toString.call(value);
  }
  return `${value}`;
}

let asyncScriptCount = 0;

export function evalFunction(evalStr: string, params: Dict<string>, asyncResults: [string, string][] = [], ignoreAsync = false) {
  const paras = Object.keys(params).join();
  const args = Object.values(params);
  if (evalStr.indexOf('await ') >= 0) {
    const func = eval(`(async function(${paras}) {${evalStr}})`);
    if (ignoreAsync) {
      return stringifyAny(func);
    }
    const id = `async-script-${++asyncScriptCount}`;
    func(...args).then((result: any) => {
      asyncResults.push([id, stringifyAny(result)]);
    });
    return getSyncSpan(id);
  }
  return stringifyAny(eval(`(function(${paras}) {${evalStr}})`)(...args));
}

// noinspection JSUnusedGlobalSymbols
export async function waitFor(callback: () => void, maxCount = 100, timeout = 100) {
  return await (async () => {
    let count = 0;
    for (; ;) {
      try {
        callback();
        return true;
      } catch {
        if (++count > maxCount) {
          return false;
        }
        await new Promise(_ => setTimeout(_, timeout));
      }
    }
  })();
}

export function addEventListener(element: Document | Element, type: string, listener: EventListenerOrEventListenerObject) {
  element.addEventListener(type, listener);
  destructors.push(() => element.removeEventListener(type, listener));
}

// noinspection JSUnusedGlobalSymbols
export function callAndListen(callback: () => void, event: EEvent, element: Document | Element = document, reside = true) {
  callback();
  if (reside) {
    element.addEventListener(event, callback);
  } else {
    addEventListener(element, event, callback);
  }
}

export { axios };
export * from '@/ts/async/date';
export * from '@/ts/async/regexp';
