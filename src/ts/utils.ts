import { config } from '@/ts/config';
import { shortenPath } from '@/ts/path';
import { getWrapRegExp } from '@/ts/regexp';

export const snippetMark = '--8<--';

export const destructors: (() => void)[] = [];

export const renderedEvent = new CustomEvent('rendered');

export function trimList(list: string[], distinct = true) {
  list = list.map(item => item.trim()).filter(item => item);
  return distinct ? Array.from(new Set(list)) : list;
}

export function chopStr(str: string, sep: string, trim = true): { key: string; value: string | null } {
  const indexOf = str.indexOf(sep);
  if (indexOf < 0) {
    return { key: str, value: null };
  }
  let key = str.substring(0, indexOf);
  let value = str.substring(indexOf + sep.length);
  if (trim) {
    key = key.trimEnd();
    value = value.trimStart();
  }
  return { key, value };
}

export function createFlags(title: string): IFlags {
  return { title };
}

export function createErrorFile(path: string): TFile {
  return {
    path,
    data: config.messages.pageError,
    flags: createFlags(shortenPath(path)),
    links: [],
    isError: true,
  };
}

export function replaceByRegExp(regexp: RegExp, data: string, callback: (match: string) => string) {
  let newData = '';
  let start = 0;
  let match = regexp.exec(data);
  while (match) {
    newData += data.substring(start, match.index) + callback(match[1]);
    start = match.index + match[0].length;
    match = regexp.exec(data);
  }
  if (start === 0) {
    return data;
  }
  newData += data.substring(start);
  return newData;
}

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
