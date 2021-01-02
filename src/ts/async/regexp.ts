import { getHeadingPattern, getLinkPathPattern } from '@/ts/regexp';

export function getWrapRegExp(left: string, right = left, flags?: string) {
  return new RegExp(`${left}\\s*(.+?)\\s*${right}`, flags);
}

export function getHeadingRegExp(min = 1, max = 6, flags?: string) {
  return new RegExp(`^${getHeadingPattern(min, max)}(?: \\s*(.+?))?$`, flags);
}

export function getLinkRegExp(startWithSlash = false, isImg = false, isLine = false, flags?: string) {
  let pattern = `\\[(.*?)]${getLinkPathPattern(startWithSlash)}`;
  if (isImg) {
    pattern = `!${pattern}`;
  }
  if (isLine) {
    pattern = `^${pattern}$`;
  }
  return new RegExp(pattern, flags);
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
