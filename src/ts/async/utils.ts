import { config } from '@/ts/config';
import { getSyncSpan } from '@/ts/element';
import { EEvent } from '@/ts/enums';
import { cleanBaseUrl } from '@/ts/path';
import { destructors, sleep } from '@/ts/utils';
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

export function stringifyAny(value: any) {
  switch (typeof value) {
    case 'object':
      try {
        if (value instanceof Error) {
          return `${value.name}: ${value.message}`;
        }
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

function isolationEval(str: string) {
  return eval(str);
}

export function evalFunction(evalStr: string, params: Dict<any>, asyncResults?: TAsyncResult[]) {
  const paras = Object.keys(params).join();
  const args = Object.values(params);
  if (evalStr.indexOf('await ') >= 0) {
    const func = isolationEval(`(async function(${paras}){${evalStr}})`);
    if (!asyncResults) {
      return stringifyAny(func);
    }
    const id = `async-script-${++asyncScriptCount}`;
    func(...args).then((result: any) => {
      asyncResults.push([id, stringifyAny(result)]);
    });
    return getSyncSpan(id);
  }
  return stringifyAny(isolationEval(`(function(${paras}){${evalStr}})`)(...args));
}

export function replaceByRegExp(regexp: RegExp, data: string, callback: (matches: string[]) => string) {
  let newData = '';
  let start = 0;
  let match = regexp.exec(data);
  while (match) {
    const [match0, ...matches] = match;
    newData += data.substring(start, match.index) + callback(matches);
    start = match.index + match0.length;
    match = regexp.exec(data);
  }
  if (start === 0) {
    return data;
  }
  newData += data.substring(start);
  return newData;
}

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
        await sleep(timeout);
      }
    }
  })();
}

export function waitForEvent(callback: () => any, event: EEvent, element: Document | Element = document) {
  return new Promise<any>(resolve => {
    const listener = () => {
      resolve(callback());
      element.removeEventListener(event, listener);
    };
    element.addEventListener(event, listener);
  });
}

export function addEventListener(element: Document | Element, type: string, listener: EventListenerOrEventListenerObject) {
  element.addEventListener(type, listener);
  destructors.push(() => element.removeEventListener(type, listener));
}

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
