import { snippetMark } from '@/ts/utils';

const markdown = () => import(/* webpackChunkName: "markdown" */ '@/ts/markdown');
let render: (data: string) => string;

export async function renderMD(data: string) {
  data = data.replaceAll(snippetMark, '');
  const tocRegExpStr = '^\\[toc]$';
  const tocRegExp = new RegExp(tocRegExpStr, 'im');
  const tocRegExpG = new RegExp(tocRegExpStr, 'img');
  if (tocRegExp.test(data)) {
    const tocDiv = document.createElement('div');
    tocDiv.id = 'toc';
    data = data.replace(tocRegExp, tocDiv.outerHTML).replace(tocRegExpG, '');
  }
  if (!render) {
    render = (await markdown()).render;
  }
  return render(data);
}
