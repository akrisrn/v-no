type THeading = {
  element: Element;
  level: number;
  isFolded: boolean;
  children: (Element | THeading)[];
  parent: THeading | null;
}

type TTagTree = {
  [index: string]: TTagTree;
}

type TFileTs = typeof import('@/ts/async/file');
type TMarkdownTs = typeof import('@/ts/async/markdown');
type TUtilsTs = typeof import('@/ts/async/utils');
type TPrismjsTs = typeof import('@/ts/async/prismjs');
