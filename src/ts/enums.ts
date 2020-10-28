export enum EFlag {
  tags = 'tags',
  updated = 'updated',
  cover = 'cover',
}

export interface IFlags {
  title: string;
  tags: string[];
  updated: string[];
  cover: string;

  [index: string]: string[] | string;
}
