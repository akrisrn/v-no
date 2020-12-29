import { config } from '@/ts/config';
import { EEvent } from '@/ts/enums';
import { cleanBaseUrl } from '@/ts/path';
import { addEventListener } from '@/ts/utils';
import { isCached } from '@/ts/async/file';
import { getWrapRegExp, replaceByRegExp } from '@/ts/async/regexp';

function evalFunction(evalStr: string, params: Dict<any>) {
  return eval(`(function(${Object.keys(params).join()}) {${evalStr}})`)(...Object.values(params));
}

export function replaceInlineScript(path: string, data: string) {
  return replaceByRegExp(getWrapRegExp('\\$\\$', '\\$\\$', 'g'), data, evalStr => {
    let result: string;
    try {
      result = evalFunction(evalStr, { path, data });
    } catch (e) {
      result = `\n\n::: open .danger.readonly **${e.name}: ${e.message}**\n\`\`\`js\n${evalStr}\n\`\`\`\n:::\n\n`;
    }
    return result;
  }).trim();
}

const htmlSymbolDict: Dict<string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
};
const htmlSymbolRegExp = new RegExp(`[${Object.keys(htmlSymbolDict).join('')}]`, 'g');

export function escapeHTML(html: string) {
  return html.replace(htmlSymbolRegExp, key => htmlSymbolDict[key]);
}

export function trimList(list: string[], distinct = true) {
  list = list.map(item => item.trim()).filter(item => item);
  return distinct ? Array.from(new Set(list)) : list;
}

export function addCacheKey(path: string, needClean = true) {
  if (isCached()) {
    let cacheKey = config.cacheKey;
    if (typeof cacheKey === 'object') {
      cacheKey = cacheKey[needClean ? cleanBaseUrl(path) : path];
    }
    return cacheKey ? `${path}?${cacheKey}` : path;
  }
  return `${path}?t=${new Date().getTime()}`;
}

export function isExternalLink(href: string) {
  try {
    return !!new URL(href).host;
  } catch (e) {
    return false;
  }
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

// noinspection JSUnusedGlobalSymbols
export function callAndListen(callback: () => void, event: EEvent, element = document, reside = true) {
  callback();
  if (reside) {
    element.addEventListener(event, callback);
  } else {
    addEventListener(element, event, callback);
  }
}

export * as axios from 'axios';
export * from '@/ts/async/date';
export * from '@/ts/async/regexp';
