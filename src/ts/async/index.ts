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

let prismjs: TPrismjsTs;

export async function importPrismjsTs() {
  if (!prismjs) {
    prismjs = await import(/* webpackChunkName: "prismjs" */ '@/ts/async/prismjs');
  }
  return prismjs;
}

export function bang() {
  importFileTs().then(file => {
    exposeToWindow({
      file,
      axios: file.axios,
    });
  });
  importMarkdownTs().then(markdown => {
    exposeToWindow({
      markdown,
      waitFor: markdown.utils.waitFor,
      callAndListen: markdown.utils.callAndListen,
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
