export async function sleep(timeout: number) {
  await new Promise(resolve => setTimeout(resolve, timeout));
}

export function trimList(list: string[], distinct = true) {
  const newList: string[] = [];
  for (const item of list) {
    const trimmed = item.trim();
    if (trimmed) {
      newList.push(trimmed);
    }
  }
  return distinct ? Array.from(new Set(newList)) : newList;
}

type CanBeFalsy = string | number | boolean | null | undefined

export function classNames(...args: (CanBeFalsy | Record<string, CanBeFalsy>)[]) {
  const cls: string[] = [];
  for (const arg of args) {
    if (!arg) {
      continue;
    }
    if (typeof arg !== 'object') {
      if (typeof arg === 'string') {
        cls.push(arg);
      }
      continue;
    }
    for (const key of Object.keys(arg)) {
      if (arg[key]) {
        cls.push(key);
      }
    }
  }
  return trimList(cls).join(' ');
}

export function sequence(length: number, start = 0) {
  return Array<number>(length).fill(start).map((num, i) => num + i);
}
