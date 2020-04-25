export function getWrapRegExp(wrapLeft: string, wrapRight: string = wrapLeft, flags = '') {
  return new RegExp(`${wrapLeft}\\s*(.+?)\\s*${wrapRight}`, flags);
}

export function trimList(list: string[]) {
  const result: string[] = [];
  list.forEach((item) => {
    const trim = item.trim();
    if (trim) {
      result.push(trim);
    }
  });
  return result;
}

export function splitFlag(flag: string) {
  return trimList(flag.split(/\s*[,，]\s*/));
}

export function splitTagsFromCodes(codes: string) {
  const tags = codes.split(/`\s+`/);
  tags[0] = tags[0].substr(1);
  const last = tags.length - 1;
  tags[last] = tags[last].substr(0, tags[last].length - 1);
  return trimList(tags);
}

export function isHashMode() {
  return !location.pathname.endsWith('.html');
}

export function escapeHTML(html: string) {
  const symbols: { [index: string]: string } = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
  };
  const regexp = new RegExp(`[${Object.keys(symbols).join('')}]`, 'g');
  return html.replace(regexp, (symbol) => {
    return symbols[symbol];
  });
}

export function removeClass(element: HTMLElement, cls: string) {
  element.classList.remove(cls);
  if (element.classList.length === 0) {
    element.removeAttribute('class');
  }
}
