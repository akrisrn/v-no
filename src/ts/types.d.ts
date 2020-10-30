interface IConfig {
  siteName: string;
  paths: {
    favicon: string;
    index: string;
    readme: string;
    category: string;
    archive: string;
    search: string;
    common: string;
  }
  messages: {
    untagged: string;
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
