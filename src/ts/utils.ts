export const snippetMark = '--8<--';

export const destructors: (() => void)[] = [];

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
