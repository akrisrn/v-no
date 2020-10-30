interface IConfig {
  siteName: string;
  favicon: string;
  indexFile: string;
  readmeFile: string;
  categoryFile: string;
  archiveFile: string;
  searchFile: string;
  commonFile: string;
  untagged: string;
  messages: {
    pageError: string;
    notFound: string;
    searching: string;
    searchNothing: string;
  }
}

interface IFlags {
  title: string;
  tags: string[];
  updated: string[];
  cover: string;

  [index: string]: string[] | string;
}

type Dict<T> = { [index: string]: T }

type TMDFile = {
  data: string;
  flags: IFlags;
}

type TMDFileDict = Dict<TMDFile>
