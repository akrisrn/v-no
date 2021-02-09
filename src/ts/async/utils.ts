import { config } from '@/ts/config';
import { getSyncSpan } from '@/ts/element';
import { EEvent } from '@/ts/enums';
import { cleanBaseUrl } from '@/ts/path';
import { getParamRegExp } from '@/ts/regexp';
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

function evalIt(evalStr: string, params: Dict<any>, asyncResults?: TAsyncResult[]) {
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
    }).catch((e: any) => {
      asyncResults.push([id, stringifyAny(e), true]);
    });
    return getSyncSpan(id);
  }
  return stringifyAny(isolationEval(`(function(${paras}){${evalStr}})`)(...args));
}

export function evalFunction(evalStr: string, params: Dict<any>, asyncResults?: TAsyncResult[]): [string, boolean] {
  try {
    return [evalIt(evalStr, params, asyncResults), false];
  } catch (e) {
    return [stringifyAny(e), true];
  }
}

export function replaceByRegExp(regexp: RegExp, data: string, callback: (match: string[]) => string) {
  let newData = '';
  let start = 0;
  let match = regexp.exec(data);
  while (match) {
    newData += data.substring(start, match.index) + callback(match);
    start = match.index + match[0].length;
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

export function encodeParam(value: string) {
  return encodeURIComponent(value).replaceAll('\'', '\\\'');
}

export function getMessage(key: string, params: string[] | Dict<string>) {
  let message: string | IMessage = config.messages;
  for (const k of trimList(key.split('.'), false)) {
    if (typeof message === 'string') {
      return stringifyAny(undefined);
    }
    try {
      message = message[k];
    } catch (e) {
      return stringifyAny(undefined);
    }
  }
  if (typeof message !== 'string') {
    return stringifyAny(message);
  }
  return replaceByRegExp(getParamRegExp(), message, ([match0, match]) => {
    if (!match) {
      return match0;
    }
    let param = undefined;
    if (!Array.isArray(params)) {
      param = params[match];
    } else {
      const num = parseInt(match);
      if (!isNaN(num)) {
        param = params[num];
      }
    }
    return param !== undefined ? param : match0;
  });
}

export { axios };
export * from '@/ts/async/date';
