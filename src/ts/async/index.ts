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
