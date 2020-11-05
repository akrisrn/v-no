interface IConfig {
  siteName?: string;
  dateFormat?: string;
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
    searching: string;
    searchNothing: string;
    showBacklinks: string;
    noBacklinks: string;
    loading: string;
  };
  defaultConf?: string;
  multiConf?: Dict<IConfig>;

  [index: string]: any;
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

type TBacklinkFile = {
  path: string;
  title: string;
  tags: string[];
  date: string;
}
