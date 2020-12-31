import * as config from '@/ts/config';
import * as element from '@/ts/element';
import * as enums from '@/ts/enums';
import * as path from '@/ts/path';
import * as store from '@/ts/store';
import * as utils from '@/ts/utils';
import { addInputBinds, destructors } from '@/ts/utils';
import { exposeToWindow } from '@/ts/window';
import { importFileTs, importMarkdownTs, importUtilsTs } from '@/ts/async';
import Vue from 'vue';

export function bang() {
  exposeToWindow({
    Vue,
    version: process.env.VUE_APP_VERSION,
    addInputBinds,
    destructors,
    config, element, enums, path, store, utils,
  });
  importFileTs().then(file => exposeToWindow({ file }));
  importMarkdownTs().then(markdown => {
    exposeToWindow({
      markdown,
      markdownIt: markdown.markdownIt,
      renderMD: async (path: string, data: string, asyncResults?: [string, string][]) => {
        data = data.trim();
        if (!data) {
          return '';
        }
        data = markdown.replaceInlineScript(path, data, asyncResults);
        if (!data) {
          return '';
        }
        data = await markdown.updateSnippet(data, asyncResults);
        if (!data) {
          return '';
        }
        data = await markdown.updateList(data);
        return data ? markdown.renderMD(data) : '';
      },
      updateDom: markdown.updateDom,
    });
  });
  importUtilsTs().then(utils => {
    exposeToWindow({ utils }, true);
    exposeToWindow({
      axios: utils.axios,
      dayjs: utils.dayjs,
      parseDate: utils.parseDate,
      formatDate: utils.formatDate,
      waitFor: utils.waitFor,
      addEventListener: utils.addEventListener,
      callAndListen: utils.callAndListen,
    });
  });
}
