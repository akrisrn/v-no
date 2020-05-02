export enum EFlag {
  // noinspection JSUnusedGlobalSymbols
  author = 'author',
  tags = 'tags',
  updated = 'updated',
  cover = 'cover',
  comment = 'comment',
}

export interface IFlags {
  title?: string;
  author?: string;
  tags?: string;
  updated?: string;
  cover?: string;
  comment?: string;

  [index: string]: string | undefined;
}
