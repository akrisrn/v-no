export function getHeadingPattern(min: number, max: number) {
  return ` {0,3}(#{${min},${max}})`;
}

export function getLinkPathPattern(startWithSlash: boolean) {
  return `\\(\\s*(${startWithSlash ? '/' : ''}.*?)(?:\\s+["'].*?["'])?\\s*\\)`;
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
