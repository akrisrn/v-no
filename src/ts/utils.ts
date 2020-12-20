import { config } from '@/ts/config';
import { shortenPath } from '@/ts/path';

export const snippetMark = '--8<--';

export const destructors: (() => void)[] = [];

export const renderedEvent = new CustomEvent('rendered');

export function getAnchorRegExp(isLine = true, min = 2, max = 6, flags?: string) {
  let pattern = `h[${min}-${max}]-\\d+`;
  if (isLine) {
    pattern = `^${pattern}$`;
  }
  return new RegExp(pattern, flags);
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
