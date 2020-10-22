export enum EFlag {
  // noinspection JSUnusedGlobalSymbols
  tags = 'tags',
  updated = 'updated',
  cover = 'cover',
}

export interface IFlags {
  title?: string;
  tags?: string;
  updated?: string;
  cover?: string;

  [index: string]: string | undefined;
}
