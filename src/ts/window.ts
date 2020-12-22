import * as config from '@/ts/config';
import * as element from '@/ts/element';
import * as enums from '@/ts/enums';
import * as path from '@/ts/path';
import * as utils from '@/ts/utils';
import { addInputBind, addInputBinds, destructors } from '@/ts/utils';
import { importFileTs, importMarkdownTs } from '@/ts/async';

export function getFromWindow(name: string) {
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

export function smallBang() {
  exposeToWindow({
    version: process.env.VUE_APP_VERSION,
    addInputBind,
    addInputBinds,
    addEventListener: (element: Element, type: string, listener: EventListenerOrEventListenerObject) => {
      element.addEventListener(type, listener);
      destructors.push(() => element.removeEventListener(type, listener));
    },
    destructors,
  });
  exposeToWindow({ config, element, enums, path, utils });
  importFileTs().then(file => {
    exposeToWindow({
      file,
      axios: file.axios,
    });
  });
  importMarkdownTs().then(markdown => {
    exposeToWindow({
      markdown,
      dayjs: markdown.utils.dayjs,
      parseDate: markdown.utils.parseDate,
      formatDate: markdown.utils.formatDate,
      renderMD: async (path: string, data: string) => {
        data = data.trim();
        if (!data) {
          return '';
        }
        data = markdown.utils.replaceInlineScript(path, data);
        if (!data) {
          return '';
        }
        data = await markdown.updateSnippet(data);
        return data ? markdown.renderMD(data) : '';
      },
      updateDom: markdown.updateDom,
    });
    exposeToWindow({
      utils: markdown.utils,
    }, true);
  });
}
