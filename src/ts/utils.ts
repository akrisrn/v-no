import { EFlag } from '@/ts/enums';

export const definedFlags = Object.values(EFlag);

export const snippetMark = '--8<--';

export const destructors: (() => void)[] = [];

export const inputBinds: Dict<() => void> = {};

export function addInputBinds(binds: Dict<() => void>) {
  Object.keys(binds).forEach(key => {
    inputBinds[key] = binds[key];
  });
}

export function chopStr(str: string, sep: string, trim = true, last = false): [string, string | null] {
  const indexOf = last ? str.lastIndexOf(sep) : str.indexOf(sep);
  if (indexOf < 0) {
    return [str, null];
  }
  let key = str.substring(0, indexOf);
  let value = str.substring(indexOf + sep.length);
  if (trim) {
    key = key.trimEnd();
    value = value.trimStart();
  }
  return [key, value];
}

export async function sleep(timeout: number) {
  await new Promise(resolve => setTimeout(resolve, timeout));
}
