import * as config from '@/ts/config';
import { config as conf } from '@/ts/config';
import * as element from '@/ts/element';
import * as enums from '@/ts/enums';
import * as path from '@/ts/path';
import * as regexp from '@/ts/regexp';
import * as storage from '@/ts/storage';
import * as store from '@/ts/store';
import * as utils from '@/ts/utils';
import { addInputBinds, destructors, sleep } from '@/ts/utils';
import { exposeToWindow } from '@/ts/window';
import { importFileTs, importMarkdownTs, importUtilsTs } from '@/ts/async';
import * as VPD from 'vue-property-decorator';

export function bang() {
  exposeToWindow({
    VPD, Vue: VPD.Vue,
    version: process.env.VUE_APP_VERSION,
    conf, destructors, addInputBinds, sleep, ...enums,
    config, element, enums, path, regexp, storage, store, utils,
  });
  importFileTs().then(file => exposeToWindow({
    file,
    axios: file.axios,
  }));
  importMarkdownTs().then(markdown => exposeToWindow({
    markdown,
    markdownIt: markdown.markdownIt,
    renderMD: async (path: string, title: string, data: string, isSnippet = false, asyncResults?: TAsyncResult[]) => {
      data = data.trim();
      if (!data) {
        return '';
      }
      data = markdown.updateInlineScript(path, title, data, isSnippet, asyncResults);
      if (!data) {
        return '';
      }
      data = await markdown.updateSnippet(data, [path], asyncResults);
      if (!data) {
        return '';
      }
      data = await markdown.updateList(data);
      return data ? markdown.renderMD(data) : '';
    },
    updateDom: markdown.updateDom,
  }));
  importUtilsTs().then(utils => {
    exposeToWindow({ utils }, true);
    exposeToWindow({
      dayjs: utils.dayjs,
      waitFor: utils.waitFor,
      waitForEvent: utils.waitForEvent,
      addEventListener: utils.addEventListener,
      callAndListen: utils.callAndListen,
      encodeParam: utils.encodeParam,
      getMessage: utils.getMessage,
      parseDate: utils.parseDate,
      formatDate: utils.formatDate,
    });
  });
}
