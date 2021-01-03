function getFromWindow(name: string) {
  // @ts-ignore
  return window[name];
}

function setToWindow(name: string, value: any) {
  // @ts-ignore
  window[name] = value;
}

export function exposeToWindow(vars: Dict<any>, merge = false) {
  let vno = getFromWindow('vno');
  if (!vno) {
    vno = {};
    setToWindow('vno', vno);
  }
  for (const key of Object.keys(vars)) {
    const value = vars[key];
    if (!merge) {
      vno[key] = value;
      continue;
    }
    let existValue = vno[key];
    if (existValue === undefined) {
      existValue = {};
      vno[key] = existValue;
    } else if (typeof existValue !== 'object') {
      existValue = { [key]: existValue };
      vno[key] = existValue;
    }
    Object.assign(existValue, value);
  }
}
