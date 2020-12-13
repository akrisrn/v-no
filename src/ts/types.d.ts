interface IConfig {
  siteName?: string;
  dateFormat?: string;
  cdn?: string;
  cacheKey?: string;
  paths: {
    favicon?: string;
    index: string;
    readme: string;
    archive: string;
    category: string;
    search: string;
    common?: string;
  };
  messages: {
    home: string;
    raw: string;
    footnotes: string;
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
  alias?: string;
  defaultConf?: string;
  multiConf?: Dict<IConfig>;

  [index: string]: any;
}

interface IFlags {
  title: string;
  tags?: string[];
  updated?: string[];
  cover?: string;
  startDate?: string;
  endDate?: string;
  creator?: string;
  updater?: string;

  [index: string]: string[] | string | undefined;
}

type Dict<T> = { [index: string]: T }

type TFile = {
  path: string;
  data: string;
  flags: IFlags;
  links: string[];
  isError?: boolean;
}

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

type TQuery = Dict<string | null>

type THashPath = {
  path: string;
  anchor: string;
  query: string;
}
