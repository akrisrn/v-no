interface IConfig {
  siteName: string;
  dateFormat: string;
  paths: {
    favicon: string;
    index: string;
    readme: string;
    archive: string;
    category: string;
    search: string;
    common: string;
  };
  messages: {
    home: string;
    readme: string;
    archive: string;
    category: string;
    search: string;
    raw: string;
    returnHome: string;
    lastUpdated: string;
    untagged: string;
    pageError: string;
    notFound: string;
    searching: string;
    searchNothing: string;
    showBacklinks: string;
    noBacklinks: string;
    loading: string;
  };
}

interface IFlags {
  title: string;
  tags: string[];
  updated: string[];
  cover: string;

  [index: string]: string[] | string;
}

type Dict<T> = { [index: string]: T }

type TFile = {
  path: string;
  data: string;
  flags: IFlags;
  links: string[];
}
