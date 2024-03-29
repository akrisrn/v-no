import { config } from '@/ts/config';
import { getSyncSpan } from '@/ts/element';
import { EEvent } from '@/ts/enums';
import { cleanBaseUrl } from '@/ts/path';
import { getParamRegExp } from '@/ts/regexp';
import { chopStr, destructors, sleep } from '@/ts/utils';
import { isCached } from '@/ts/async/file';

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

export function addCustomTag(href: string, reside: boolean, isScript: boolean) {
  let element;
  if (isScript) {
    element = document.querySelector<HTMLScriptElement>(`script[src^="${href}"]`);
  } else {
    element = document.querySelector<HTMLLinkElement>(`link[href^="${href}"]`);
  }
  if (element) {
    const nextChar = element.getAttribute(isScript ? 'src' : 'href')![href.length];
    if (!nextChar || nextChar === '?') {
      return false;
    }
  }
  href = addCacheKey(href);
  if (isScript) {
    element = document.createElement('script');
    element.charset = 'utf-8';
    element.src = href;
  } else {
    element = document.createElement('link');
    element.rel = 'stylesheet';
    element.type = 'text/css';
    element.href = href;
  }
  if (!reside) {
    element.classList.add('custom');
  }
  document.head.append(element);
  return true;
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

export function isolatedEval(str: string) {
  return eval(str);
}

function evalIt(evalStr: string, params: Dict<any>, asyncResults?: TAsyncResult[]) {
  const paras = Object.keys(params).join();
  const args = Object.values(params);
  if (evalStr.indexOf('await ') >= 0) {
    const func = isolatedEval(`(async function(${paras}){${evalStr}})`);
    if (!asyncResults) {
      return stringifyAny(func);
    }
    const id = `async-script-${++asyncScriptCount}`;
    func(...args).then((result: any) => {
      asyncResults.push({ id, result: stringifyAny(result) });
    }).catch((e: any) => {
      asyncResults.push({ id, result: stringifyAny(e), isError: true });
    });
    return getSyncSpan(id);
  }
  return stringifyAny(isolatedEval(`(function(${paras}){${evalStr}})`)(...args));
}

export function evalFunction(evalStr: string, params: Dict<any>, asyncResults?: TAsyncResult[]): [string, boolean] {
  try {
    return [evalIt(evalStr, params, asyncResults), false];
  } catch (e) {
    return [stringifyAny(e), true];
  }
}

export function replaceByRegExp(regexp: RegExp, data: string, callback: (match: RegExpExecArray) => string) {
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

export async function waitFor<T>(callback: () => T, maxCount = 100, timeout = 100) {
  return await (async () => {
    const enableCount = isFinite(maxCount);
    let count = 0;
    for (; ;) {
      try {
        return callback();
      } catch {
        if (enableCount && ++count > maxCount) {
          return undefined;
        }
        await sleep(timeout);
      }
    }
  })();
}

export function waitForEvent<T>(callback: () => T, event: EEvent, element: Document | Element = document) {
  return new Promise<T>(resolve => {
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

export function callAndListen(callback: () => void, event: EEvent, element: Document | Element = document, reside = false) {
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

export function getMessage(key: string, params?: TMessage) {
  let message: TMessage | undefined = config.messages;
  for (const k of trimList(key.split('.'), false)) {
    if (message === null || typeof message !== 'object') {
      return undefined;
    }
    if (!Array.isArray(message)) {
      message = message[k];
      continue;
    }
    const num = parseInt(k);
    message = !isNaN(num) ? message[num] : undefined;
  }
  if (message === undefined || message === null) {
    return undefined;
  }
  if (typeof message === 'object' || typeof message !== 'string') {
    return stringifyAny(message);
  }
  if (params === undefined) {
    return message;
  }
  if (params === null || typeof params !== 'object') {
    params = [params];
  }
  return replaceByRegExp(getParamRegExp(), message, ([match0, match]) => {
    if (!match) {
      return match0;
    }
    let defaultValue: string | undefined = undefined;
    const [key, value] = chopStr(match, '|');
    if (value !== null) {
      match = key;
      defaultValue = value;
    }
    let param = undefined;
    if (!Array.isArray(params)) {
      param = (params as IMessage)[match];
    } else {
      const num = parseInt(match);
      if (!isNaN(num)) {
        param = params[num];
      }
    }
    if (param !== undefined) {
      return stringifyAny(param);
    }
    return defaultValue !== undefined ? defaultValue : match0;
  });
}

export * from '@/ts/async/date';
