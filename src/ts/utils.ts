export function trimList(list: string[], distinct = true) {
  list = list.map(item => item.trim()).filter(item => item);
  return distinct ? Array.from(new Set(list)) : list;
}

export function chopStr(str: string, sep: string, trim = true) {
  const result: { key: string; value: string | null } = {
    key: str,
    value: null,
  };
  const indexOf = str.indexOf(sep);
  if (indexOf >= 0) {
    const key = str.substring(0, indexOf);
    const value = str.substring(indexOf + sep.length);
    result.key = trim ? key.trimEnd() : key;
    result.value = trim ? value.trimStart() : value;
  }
  return result;
}
