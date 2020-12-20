let file: TFileTs;

export async function importFileTs() {
  if (!file) {
    file = await import(/* webpackChunkName: "file" */ '@/ts/file');
  }
  return file;
}

let markdown: TMarkdownTs;

export async function importMarkdownTs() {
  if (!markdown) {
    markdown = await import(/* webpackChunkName: "markdown" */ '@/ts/markdown');
  }
  return markdown;
}

let prismjs: TPrismjsTs;

export async function importPrismjsTs() {
  if (!prismjs) {
    prismjs = await import(/* webpackChunkName: "prismjs" */ '@/ts/prismjs');
  }
  return prismjs;
}
