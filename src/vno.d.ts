/* v1.2.8 */

declare let vnoConfig: IConfig;

declare namespace vno {
  const VPD: VPD;
  const Vue: Vue;
  const axios: typeof utils.axios;
  const dayjs: typeof utils.dayjs;
  const markdownIt: typeof markdown.markdownIt;

  const version: string;

  const renderMD: (path: string, title: string, data: string, isSnippet = false, asyncResults?: TAsyncResult[]) => Promise<string>;
  const updateDom: typeof markdown.updateDom;

  const EFlag: typeof enums.EFlag;
  const EMark: typeof enums.EMark;
  const EEvent: typeof enums.EEvent;
  const EIcon: typeof enums.EIcon;

  const destructors: typeof utils.destructors;
  const addInputBinds: typeof utils.addInputBinds;
  const sleep: typeof utils.sleep;
  const waitFor: typeof utils.waitFor;
  const waitForEvent: typeof utils.waitForEvent;
  const addEventListener: typeof utils.addEventListener;
  const callAndListen: typeof utils.callAndListen;
  const encodeParam: typeof utils.encodeParam;
  const getMessage: typeof utils.getMessage;
  const parseDate: typeof utils.parseDate;
  const formatDate: typeof utils.formatDate;

  const appSelf: App;
  const mainSelf: Main;
  const articleSelf: Article;
  const gadgetSelf: Gadget;

  const selectConf: typeof appSelf.selectConf;

  const title: typeof mainSelf.title;
  const filePath: typeof mainSelf.filePath;
  const isIndexFile: typeof mainSelf.isIndexFile;
  const reload: typeof mainSelf.reload;

  const isSearchFile: typeof articleSelf.isSearchFile;

  const toggleDark: typeof gadgetSelf.toggleDark;
  const toggleZen: typeof gadgetSelf.toggleZen;
  const toTop: typeof gadgetSelf.toTop;
  const toBottom: typeof gadgetSelf.toBottom;

  namespace file {
    function createErrorFile(path: string): IFile

    function isCached(): boolean

    function disableCache(): void

    function enableCache(): void

    function getFile(path: string): Promise<IFile>

    function getFiles(): Promise<{
      files: Dict<IFile>
      backlinks: Dict<string[]>
    }>

    function sortFiles(fileA: ISimpleFile, fileB: ISimpleFile): number
  }

  namespace markdown {
    const markdownIt: MarkdownIt;

    function parseMD(data: string): Token[]

    function renderMD(data: string, replaceMark = true): string

    function updateAsyncScript(asyncResult: TAsyncResult): boolean

    function updateInlineScript(path: string, title: string, data: string, isSnippet = false, asyncResults?: TAsyncResult[]): string

    function updateSnippet(data: string, updatedPaths: string[], asyncResults?: TAsyncResult[]): Promise<string>

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
      index: string
      readme: string
      archive: string
      category: string
      search: string
    };

    const homeHash: string;
  }

  namespace element {
    function cleanEventListenerDict(): void

    function addEventListener(element: Document | Element, type: string, listener: EventListenerOrEventListenerObject): void

    function dispatchEvent<T>(type: enums.EEvent, payload?: T, timeout?: number): Promise<boolean>

    function removeClass(element: Element, cls?: string): void

    function scroll(height: number, isSmooth = true): void

    // noinspection JSSuspiciousNameCombination
    function getIcon(type: enums.EIcon, width = 16, height = width): string

    function getSyncSpan(id?: string): string

    function getQueryTagLinks(tag: string): TAnchor[]

    function createList(file: ISimpleFile, li?: HTMLLIElement): HTMLLIElement
  }

  namespace enums {
    enum EFlag {
      title = 'title',
      tags = 'tags',
      updated = 'updated',
      cover = 'cover',
      times = 'times',
      startDate = 'startDate',
      endDate = 'endDate',
      creator = 'creator',
      updater = 'updater',
    }

    enum EMark {
      redirect = 'redirect',
      noCommon = 'noCommon',
      toc = 'toc',
      list = 'list',
      slice = 'slice',
      input = 'input',
      result = 'result',
      number = 'number',
      count = 'count',
      time = 'time',
    }

    enum EEvent {
      appCreated = 'appCreated',
      mainCreated = 'mainCreated',
      mainShown = 'mainShown',
      articleCreated = 'articleCreated',
      htmlChanged = 'htmlChanged',
      rendered = 'rendered',
      searchCompleted = 'searchCompleted',
      toggleDark = 'toggleDark',
      toggleZen = 'toggleZen',
      toTop = 'toTop',
    }

    enum EIcon {
      link = 'M7.775 3.275a.75.75 0 001.06 1.06l1.25-1.25a2 2 0 112.83 2.83l-2.5 2.5a2 2 0 01-2.83 0 .75.75 0 00-1.06 1.06 3.5 3.5 0 004.95 0l2.5-2.5a3.5 3.5 0 00-4.95-4.95l-1.25 1.25zm-4.69 9.64a2 2 0 010-2.83l2.5-2.5a2 2 0 012.83 0 .75.75 0 001.06-1.06 3.5 3.5 0 00-4.95 0l-2.5 2.5a3.5 3.5 0 004.95 4.95l1.25-1.25a.75.75 0 00-1.06-1.06l-1.25 1.25a2 2 0 01-2.83 0z',
      backlink = 'M4 9h1v1H4c-1.5 0-3-1.69-3-3.5S2.55 3 4 3h4c1.45 0 3 1.69 3 3.5 0 1.41-.91 2.72-2 3.25V8.59c.58-.45 1-1.27 1-2.09C10 5.22 8.98 4 8 4H4c-.98 0-2 1.22-2 2.5S3 9 4 9zm9-3h-1v1h1c1 0 2 1.22 2 2.5S13.98 12 13 12H9c-.98 0-2-1.22-2-2.5 0-.83.42-1.64 1-2.09V6.25c-1.09.53-2 1.84-2 3.25C6 11.31 7.55 13 9 13h4c1.45 0 3-1.69 3-3.5S14.5 6 13 6z',
      external = 'M10.604 1h4.146a.25.25 0 01.25.25v4.146a.25.25 0 01-.427.177L13.03 4.03 9.28 7.78a.75.75 0 01-1.06-1.06l3.75-3.75-1.543-1.543A.25.25 0 0110.604 1zM3.75 2A1.75 1.75 0 002 3.75v8.5c0 .966.784 1.75 1.75 1.75h8.5A1.75 1.75 0 0014 12.25v-3.5a.75.75 0 00-1.5 0v3.5a.25.25 0 01-.25.25h-8.5a.25.25 0 01-.25-.25v-8.5a.25.25 0 01.25-.25h3.5a.75.75 0 000-1.5h-3.5z',
      sync = 'M8 2.5a5.487 5.487 0 00-4.131 1.869l1.204 1.204A.25.25 0 014.896 6H1.25A.25.25 0 011 5.75V2.104a.25.25 0 01.427-.177l1.38 1.38A7.001 7.001 0 0114.95 7.16a.75.75 0 11-1.49.178A5.501 5.501 0 008 2.5zM1.705 8.005a.75.75 0 01.834.656 5.501 5.501 0 009.592 2.97l-1.204-1.204a.25.25 0 01.177-.427h3.646a.25.25 0 01.25.25v3.646a.25.25 0 01-.427.177l-1.38-1.38A7.001 7.001 0 011.05 8.84a.75.75 0 01.656-.834z',
    }
  }

  namespace path {
    function isExternalLink(href: string): boolean

    function checkLinkPath(path: string): string

    function shortenPath(path: string, ext = 'md'): string

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

    function buildQueryContent(content: string, isFull = false): string

    function buildQueryFlagUrl(flag: enums.EFlag, text: string): string

    function parseHash(hash: string, isShort = false): THashPath

    function changeAnchor(anchor: string): void

    function changeQueryContent(content: string): void

    function parseRoute(route: Route): THashPath

    function parseQuery(queryStr: string): TQuery

    function formatQuery(query: TQuery): string

    function returnHome(): void
  }

  namespace regexp {
    function getHeadingRegExp(min = 1, max = 6, flags?: string): RegExp

    function getLinkRegExp(startWithSlash = false, isImg = false, isLine = false, flags?: string): RegExp

    function getWrapRegExp(left: string, right = left, flags?: string): RegExp

    function getMarkRegExp(mark: string, isLine = true, flags = 'im'): RegExp

    function getSnippetRegExp(flags?: string): RegExp

    function getAnchorRegExp(isLine = true, min = 2, max = 6, flags?: string): RegExp

    function getParamRegExp(flags = 'g'): RegExp
  }

  namespace storage {
    function getItem(key: string): string | null

    function setItem(key: string, value: string): void

    function removeItem(key: string): void
  }

  namespace store {
    const state: {
      initing: boolean
      filePath: string
      anchor: string
      queryStr: string
      homePath: string
    };
  }

  namespace utils {
    const axios: axios;
    const dayjs: Dayjs;

    const definedFlags: enums.EFlag[];
    const destructors: (() => void)[];
    const inputBinds: Dict<() => void>;

    function addInputBinds(binds: Dict<() => void>): void

    function chopStr(str: string, sep: string, trim = true, last = false): [string, string | null]

    function sleep(timeout: number): Promise<void>

    function trimList(list: string[], distinct = true): string[]

    function addCacheKey(path: string, needClean = true): string

    function stringifyAny(value: any): string

    function evalFunction(evalStr: string, params: Dict<any>, asyncResults?: TAsyncResult[]): [string, boolean]

    function replaceByRegExp(regexp: RegExp, data: string, callback: (match: RegExpExecArray) => string): string

    function waitFor(callback: () => void, maxCount = 100, timeout = 100): Promise<boolean>

    function waitForEvent(callback: () => any, event: enums.EEvent, element: Document | Element = document): Promise<any>

    function addEventListener(element: Document | Element, type: string, listener: EventListenerOrEventListenerObject): void

    function callAndListen(callback: () => void, event: enums.EEvent, element: Document | Element = document, reside = true): void

    function encodeParam(value: string): string

    function getMessage(key: string, params?: TMessage): string

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
  title: string;
  /**
   * @Prop()
   */
  query: TQuery;
  /**
   * @Prop()
   */
  showTime: number;
  /**
   * @Prop()
   */
  redirectTo: (path: string, anchor?: string, query?: string) => boolean;

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

  renderMD(data = this.fileData): void

  updateRenderData(data = ''): Promise<void>

  renderComplete(): void

  scrollToAnchor(): void
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

  toggleZen(): void

  toTop(): void

  toBottom(): void

  scroll(toBottom = false): void
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

  reload(toTop = false): void

  getData(): Promise<TFileData | undefined>

  setData(fileData?: TFileData): void

  setFlags(flags: IFlags): void

  addFlag(key: string, value: string, sort = true): void

  removeFlag(key: string): void

  redirectTo(path: string, anchor?: string, query?: string): boolean

  loadBacklinks(): Promise<void>

  getListHtml(file: ISimpleFile): string

  getQueryTagLinks(tag: string): TAnchor[]

  returnHome(): void
}

interface IConfig {
  siteName?: string
  dateFormat?: string
  smartQuotes?: string | string[]
  replacer?: [string, string][]
  cdn?: string
  cacheKey?: string | Dict<string>
  paths: {
    favicon?: string
    index: string
    readme: string
    archive: string
    category: string
    search: string
    common?: string
  }
  messages: {
    home: string
    raw: string
    footnotes: string
    returnHome: string
    lastUpdated: string
    untagged: string
    pageError: string
    searching: string
    searchNothing: string
    showBacklinks: string
    noBacklinks: string
    loading: string
    redirectFrom: string

    [index: string]: TMessage
  }
  defaultConf?: string
  multiConf?: Dict<IConfig>
  alias?: string

  [index: string]: any
}

interface IMessage {
  [index: string]: TMessage
}

interface IFlags {
  title: string
  tags?: string[]
  updated?: string[]
  cover?: string
  times?: number[]
  startDate?: string
  endDate?: string
  creator?: string
  updater?: string

  [index: string]: string | string[] | number[] | undefined
}

interface ISimpleFile {
  path: string
  flags: IFlags
  isError?: boolean
}

interface IFile extends ISimpleFile {
  data: string
  links: Dict<TLink>
}

type Dict<T> = { [index: string]: T }

type TLink = {
  href: string
  texts: string[]
  isMarkdown?: boolean
  isImage?: boolean
  isAnchor?: boolean
  isExternal?: boolean
  isError?: boolean
}

type TFileData = {
  data: string
  flags: IFlags
  links: string[]
}

type TQuery = Dict<string | null>

type THashPath = {
  path: string
  anchor: string
  query: string
}

type TConfList = [string[], string[]]

type TMessageData = string | number | boolean | null

type TMessage = TMessageData | TMessageData[] | IMessage

type TRedirectList = [string[], string[]]

type TFlag = {
  key: string
  value: string
}

type TAnchor = {
  text: string
  href: string
}

type TAsyncResult = [string, string, boolean?]

/**
 * vue-property-decorator/lib/index.d.ts
 */
type VPD = any

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
