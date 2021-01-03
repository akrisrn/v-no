function getHeadingPattern(min: number, max: number) {
  return ` {0,3}(#{${min},${max}})`;
}

export function getHeadingRegExp(min = 1, max = 6, flags?: string) {
  return new RegExp(`^${getHeadingPattern(min, max)}(?: \\s*(.+?))?$`, flags);
}

function getLinkPathPattern(startWithSlash: boolean) {
  return `\\(\\s*(${startWithSlash ? '/' : ''}.*?)(?:\\s+["'].*?["'])?\\s*\\)`;
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

export function getSnippetRegExp(flags?: string) {
  return new RegExp(`^(?:${getHeadingPattern(2, 6)} )?\\s*\\[\\+(#.+)?]${getLinkPathPattern(true)}$`, flags);
}

export function getAnchorRegExp(isLine = true, min = 2, max = 6, flags?: string) {
  let pattern = `h[${min}-${max}]-\\d+`;
  if (isLine) {
    pattern = `^${pattern}$`;
  }
  return new RegExp(pattern, flags);
}

export function getMarkRegExp(mark: string, isLine = true, flags = 'im') {
  let pattern = `\\[${mark}(?:#\\s*(.*?)\\s*)?]`;
  if (isLine) {
    pattern = `^${pattern}$`;
  }
  return new RegExp(pattern, flags);
}

export function getWrapRegExp(left: string, right = left, flags?: string) {
  return new RegExp(`${left}\\s*(.+?)\\s*${right}`, flags);
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
