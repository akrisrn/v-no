import { exposeToWindow } from '@/ts/window';

let file: TFileTs;

export async function importFileTs() {
  if (!file) {
    file = await import(/* webpackChunkName: "file" */ '@/ts/async/file');
  }
  return file;
}

let markdown: TMarkdownTs;

export async function importMarkdownTs() {
  if (!markdown) {
    markdown = await import(/* webpackChunkName: "markdown" */ '@/ts/async/markdown');
  }
  return markdown;
}

let utils: TUtilsTs;

export async function importUtilsTs() {
  if (!utils) {
    utils = await import(/* webpackChunkName: "utils" */ '@/ts/async/utils');
  }
  return utils;
}

let prismjs: TPrismjsTs;

export async function importPrismjsTs() {
  if (!prismjs) {
    prismjs = await import(/* webpackChunkName: "prismjs" */ '@/ts/async/prismjs');
  }
  return prismjs;
}

export function bang() {
  Promise.all([
    importFileTs(),
    importMarkdownTs(),
    importUtilsTs(),
  ]).then(([file, markdown, utils]) => {
    exposeToWindow({
      file,
      markdown,
      renderMD: async (path: string, data: string, asyncResults?: [string, any][]) => {
        data = data.trim();
        if (!data) {
          return '';
        }
        data = markdown.replaceInlineScript(path, data, asyncResults);
        if (!data) {
          return '';
        }
        data = await markdown.updateSnippet(data, asyncResults);
        return data ? markdown.renderMD(data) : '';
      },
      updateDom: markdown.updateDom,
      axios: utils.axios,
      dayjs: utils.dayjs,
      parseDate: utils.parseDate,
      formatDate: utils.formatDate,
      waitFor: utils.waitFor,
      addEventListener: utils.addEventListener,
      callAndListen: utils.callAndListen,
    });
    exposeToWindow({ utils }, true);
  });
}
