declare let vnoConfig: IConfig;

declare namespace vno {
  const Vue: Vue;
  const axios: typeof utils.axios;
  const dayjs: typeof utils.dayjs;
  const markdownIt: typeof markdown.markdownIt;

  const version: string;

  const renderMD: (path: string, data: string, asyncResults?: TAsyncResult[]) => Promise<string>;
  const updateDom: typeof markdown.updateDom;

  const destructors: typeof utils.destructors;
  const addInputBinds: typeof utils.addInputBinds;
  const waitFor: typeof utils.waitFor;
  const addEventListener: typeof utils.addEventListener;
  const callAndListen: typeof utils.callAndListen;
  const parseDate: typeof utils.parseDate;
  const formatDate: typeof utils.formatDate;

  const appSelf: App;
  const articleSelf: Article;
  const gadgetSelf: Gadget;
  const mainSelf: Main;

  const toggleDark: typeof gadgetSelf.toggleDark;
  const toggleZen: typeof gadgetSelf.toggleZen;
  const toTop: typeof gadgetSelf.toTop;
  const toBottom: typeof gadgetSelf.toBottom;

  const reload: typeof mainSelf.reload;
  const filePath: typeof mainSelf.filePath;

  namespace file {
    function createErrorFile(path: string): IFile

    function isCached(): boolean

    function disableCache(): void

    function enableCache(): void

    function getFile(path: string): Promise<IFile>

    function getFiles(): Promise<{
      files: Dict<IFile>;
      backlinks: Dict<string[]>;
    }>

    function sortFiles(fileA: ISimpleFile, fileB: ISimpleFile): number
  }

  namespace markdown {
    const markdownIt: MarkdownIt;

    function parseMD(data: string): Token[]

    function renderMD(data: string): string

    function updateAsyncScript(result: TAsyncResult): boolean

    function replaceInlineScript(path: string, data: string, asyncResults?: TAsyncResult[], ignoreAsync?: boolean): string

    function updateSnippet(data: string, updatedPaths?: string[], asyncResults?: TAsyncResult[]): Promise<string>

    function updateList(data: string): Promise<string>

    function preprocessSearchPage(data: string): string

    function updateSearchPage(content: string): Promise<void>

    function updateHighlight(): Promise<void>

    function updateDom(): Promise<void>
  }

  namespace config {
    function getSelectConf(): string

    const config: IConfig;
    const confList: TConfList | null;
    const enableMultiConf: boolean;

    const baseFiles: string[];
    const shortBaseFiles: {
      index: string;
      readme: string;
      archive: string;
      category: string;
      search: string;
    };

    const homeHash: string;
  }

  namespace element {
    function cleanEventListenerDict(): void

    function addEventListener(element: Document | Element, type: string, listener: EventListenerOrEventListenerObject): void

    function dispatchEvent<T>(type: enums.EEvent, payload?: T, timeout?: number): Promise<boolean>

    function removeClass(element: Element, cls?: string): void

    function scroll(height: number, isSmooth?: boolean): void

    function getIcon(type: enums.EIcon, width?: number, height?: number): string

    function getSyncSpan(id?: string): string

    function getQueryTagLinks(tag: string): TAnchor[]

    function createList(file: ISimpleFile, li?: HTMLLIElement): HTMLLIElement
  }

  namespace enums {
    enum EFlag {}

    enum EMark {}

    enum EEvent {}

    enum EIcon {}
  }

  namespace path {
    function isExternalLink(href: string): boolean

    function checkLinkPath(path: string): string

    function shortenPath(path: string, ext?: string): string

    const baseUrl: string;
    const publicPath: string;
    const indexPath: string;
    const cdnUrl: string;

    const homePath: string;

    function disableCDN(): void

    function enableCDN(): void

    function addBaseUrl(path: string): string

    function cleanBaseUrl(path: string): string

    function buildHash(hashPath: THashPath): string

    function buildQueryContent(content: string, isFull?: boolean): string

    function buildQueryFlagUrl(flag: enums.EFlag, text: string): string

    function parseHash(hash: string, isShort?: boolean): THashPath

    function changeAnchor(anchor: string): void

    function changeQueryContent(content: string): void

    function parseRoute(route: Route): THashPath

    function parseQuery(queryStr: string): TQuery

    function formatQuery(query: TQuery): string

    function returnHome(): void
  }

  namespace regexp {
    function getHeadingRegExp(min?: number, max?: number, flags?: string): RegExp

    function getLinkRegExp(startWithSlash?: boolean, isImg?: boolean, isLine?: boolean, flags?: string): RegExp

    function getSnippetRegExp(flags?: string): RegExp

    function getAnchorRegExp(isLine?: boolean, min?: number, max?: number, flags?: string): RegExp

    function getMarkRegExp(mark: string, isLine?: boolean, flags?: string): RegExp

    function getWrapRegExp(left: string, right?: string, flags?: string): RegExp
  }

  namespace store {
    const state: {
      initing: boolean;
      filePath: string;
      anchor: string;
      queryStr: string;
      homePath: string;
    };
  }

  namespace utils {
    const axios: axios;
    const dayjs: Dayjs;

    const definedFlags: enums.EFlag[];
    const snippetMark: string;
    const destructors: (() => void)[];
    const inputBinds: Dict<() => void>;

    function addInputBinds(binds: Dict<() => void>): void

    function chopStr(str: string, sep: string, trim?: boolean): [string, string | null]

    function trimList(list: string[], distinct?: boolean): string[]

    function addCacheKey(path: string, needClean?: boolean): string

    function stringifyAny(value: any): string

    function evalFunction(evalStr: string, params: Dict<string>, asyncResults?: TAsyncResult[], ignoreAsync?: boolean): string

    function replaceByRegExp(regexp: RegExp, data: string, callback: (matches: string[]) => string): string

    function waitFor(callback: () => void, maxCount?: number, timeout?: number): Promise<boolean>

    function addEventListener(element: Document | Element, type: string, listener: EventListenerOrEventListenerObject): void

    function callAndListen(callback: () => void, event: enums.EEvent, element?: Document | Element, reside?: boolean): void

    function parseDate(date: string | number): Date

    function formatDate(date: string | number | Date | Dayjs, format?: string): string
  }
}

// noinspection JSUnusedGlobalSymbols
declare class App {
  keyInput: string;
  selectConf: string;

  get initing(): typeof vno.store.state.initing

  get homePath(): typeof vno.store.state.homePath

  get config(): typeof vno.config.config

  get confList(): typeof vno.config.confList

  get enableMultiConf(): typeof vno.config.enableMultiConf

  get shortBaseFiles(): typeof vno.config.shortBaseFiles

  get favicon(): string

  /**
   * @Watch('keyInput')
   */
  onKeyInputChanged(): void

  /**
   * @Watch('selectConf')
   */
  onSelectConfChanged(): void

  returnHome(): void
}

// noinspection JSUnusedGlobalSymbols
declare class Article {
  /**
   * @Prop()
   */
  fileData: string;
  /**
   * @Prop()
   */
  query: TQuery;
  /**
   * @Prop()
   */
  showTime: number;

  markdownTs: typeof vno.markdown;
  startTime: number;
  isRendering: boolean;
  renderData: string;
  asyncResults: TAsyncResult[];
  resultsBeforeRendered: TAsyncResult[];

  get filePath(): typeof vno.store.state.filePath

  get anchor(): typeof vno.store.state.anchor

  get queryContent(): string

  get isSearchFile(): boolean

  get html(): string

  renderMD(data?: string): void

  updateRenderData(data?: string): Promise<void>

  renderComplete(): void;

  /**
   * @Watch('anchor')
   */
  scrollToAnchor(): void;

  /**
   * @Watch('asyncResults')
   */
  onAsyncResultsChanged(): void;

  /**
   * @Watch('queryContent')
   */
  onQueryContentChanged(): void;

  /**
   * @Watch('fileData')
   * @Watch('showTime')
   */
  onShowTimeChanged(): void;

  /**
   * @Watch('html')
   */
  onHTMLChanged(): void;
}

// noinspection JSUnusedGlobalSymbols
declare class Gadget {
  /**
   * @Prop()
   */
  addToKeyInput: (key: string) => void;

  metaTheme: HTMLMetaElement;

  isDark: boolean;
  isZen: boolean;
  isScrolling: boolean;

  darkMarks: [string, string];
  zenMark: string;
  toTopMark: string;

  get metaThemeColor(): string

  toggleDark(): void

  /**
   * @Watch('isDark')
   */
  onIsDarkChanged(): void

  toggleZen(): void

  /**
   * @Watch('isZen')
   */
  onIsZenChanged(): void

  toTop(): void

  toBottom(): void

  scroll(toBottom?: boolean): void
}

// noinspection JSUnusedGlobalSymbols
declare class Main {
  fileTs: typeof vno.file | null;

  fileData: string;
  title: string;
  tags: string[];
  startDate: string;
  endDate: string;
  cover: string;
  creator: string;
  updater: string;
  otherFlags: TFlag[];

  links: string[];
  backlinks: string[];

  backlinkFiles: ISimpleFile[];
  isLoadingBacklinks: boolean;
  hasLoadedBacklinks: boolean;

  showTime: number;
  isShow: boolean;
  isError: boolean;

  isRedirectPage: boolean;
  redirectFrom: TRedirectList;

  initing: boolean;

  get homePath(): typeof vno.store.state.homePath

  get filePath(): typeof vno.store.state.filePath

  get anchor(): typeof vno.store.state.anchor

  get queryStr(): typeof vno.store.state.queryStr

  get shortFilePath(): string

  get rawFilePath(): string

  get query(): TQuery

  get config(): typeof vno.config.config

  get isIndexFile(): boolean

  get lastUpdatedMessage(): string

  get iconSync(): string

  get iconBacklink(): string

  reload(toTop?: boolean): void

  getData(): Promise<TFileData | undefined>

  setData(fileData?: TFileData): void

  setFlags(flags: IFlags): void

  addFlag(key: string, value: string, sort?: boolean): void

  removeFlag(key: string): void

  getBacklinks(): Promise<void>

  /**
   * @Watch('title')
   */
  onTitleChanged(): void

  /**
   * @Watch('cover')
   */
  onCoverChanged(): void

  getListHtml(file: ISimpleFile): string

  getQueryTagLinks(tag: string): TAnchor[]

  returnHome(): void
}

interface IConfig {
  siteName?: string;
  dateFormat?: string;
  smartQuotes?: string | string[];
  replacer?: [string, string][];
  cdn?: string;
  cacheKey?: string | Dict<string>;
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
    redirectFrom: string;
  };
  defaultConf?: string;
  multiConf?: Dict<IConfig>;
  alias?: string;

  [index: string]: any;
}

interface IFlags {
  title: string;
  tags?: string[];
  updated?: string[];
  cover?: string;
  times?: number[];
  startDate?: string;
  endDate?: string;
  creator?: string;
  updater?: string;

  [index: string]: string | string[] | number[] | undefined;
}

interface ISimpleFile {
  path: string;
  flags: IFlags;
  isError?: boolean;
}

interface IFile extends ISimpleFile {
  data: string;
  links: Dict<TLink>;
}

type Dict<T> = { [index: string]: T }

type TLink = {
  href: string;
  texts: string[];
  isMarkdown?: boolean;
  isImage?: boolean;
  isAnchor?: boolean;
  isExternal?: boolean;
  isError?: boolean;
}

type TFileData = {
  data: string;
  flags: IFlags;
  links: string[];
}

type TQuery = Dict<string | null>

type THashPath = {
  path: string;
  anchor: string;
  query: string;
}

type TConfList = [string[], string[]]

type TRedirectList = [string[], string[]]

type TFlag = [string, string]

type TAnchor = [string, string]

type TAsyncResult = [string, string]

/**
 * vue/types/vue.d.ts
 */
type Vue = any

/**
 * vue-router/types/router.d.ts
 */
type Route = any

/**
 * axios/index.d.ts
 */
type axios = any

/**
 * dayjs/index.d.ts
 */
type Dayjs = any

/**
 * markdown-it/lib/index.d.ts
 */
type MarkdownIt = any

/**
 * markdown-it/lib/token.d.ts
 */
type Token = any
