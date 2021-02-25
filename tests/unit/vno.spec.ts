import puppeteer, { Browser, Page } from 'puppeteer-core';

let browser: Browser;
let page: Page;

beforeAll(async () => {
  browser = await puppeteer.launch();
  page = await browser.newPage();
  const host = process.env.TEST_HOST!;
  const publicPath = process.env.VUE_APP_PUBLIC_PATH!;
  await page.goto(host + publicPath);
  const homePath = await page.evaluate(() => vno.path.homePath);
  if (homePath !== publicPath) {
    await page.goto(host + homePath);
  }
  await page.waitForSelector('main:not(.slide-fade-enter-active)');
  await page.waitForSelector('article');
  await page.waitForSelector('.rendering', {
    hidden: true,
  });
});

afterAll(async () => {
  await browser.close();
});

function expectToEqual<T extends any[], V extends any>(cases: [T, V][], callback: (...args: T) => V) {
  it.each(cases)('%j => %j', async (args, expected) => {
    expect(await page.evaluate(callback as () => V, ...args)).toEqual(expected);
  });
}

describe('utils', () => {
  describe('chopStr', () => {
    const cases: [[string, string, boolean?, boolean?], [string, string | null]][] = [
      [['a=1', '='], ['a', '1']],
      [['a=', '='], ['a', '']],
      [['a', '='], ['a', null]],
      [['a = 1', '='], ['a', '1']],
      [['a = 1', '=', false], ['a ', ' 1']],
      [['a=1&b=2', '&'], ['a=1', 'b=2']],
      [['a=1&b=2&c=3', '&'], ['a=1', 'b=2&c=3']],
      [['a=1&b=2&c=3', '&', true, true], ['a=1&b=2', 'c=3']],
    ];
    expectToEqual(cases, (str, sep, trim?, last?) => {
      return vno.utils.chopStr(str, sep, trim, last);
    });
  });
  describe('trimList', () => {
    const cases: [[string[], boolean?], string[]][] = [
      [[', ,1, 2,, 3,'.split(',')], ['1', '2', '3']],
      [['1, 2, 2, 3'.split(',')], ['1', '2', '3']],
      [['1, 2, 2, 3'.split(','), false], ['1', '2', '2', '3']],
    ];
    expectToEqual(cases, (list, distinct) => {
      return vno.utils.trimList(list, distinct);
    });
  });
  describe('getMessage', () => {
    const cases: [[string, TMessage?], string][] = [
      [['home'], 'HOME'],
      [['test1'], '{{ 0| }} world'],
      [['test1', 'hello'], 'hello world'],
      [['test2', ['hello']], ' world'],
      [['test2', { a: 'hello' }], 'hello world'],
      [['test3', { a: 'hello', 0: 'new' }], 'hello new world'],
      [['test3', ['new']], 'brave new world'],
      [['test3', []], 'brave  world'],
    ];
    expectToEqual(cases, (key, params?) => {
      vno.config.config.messages['test1'] = '{{ 0| }} world';
      vno.config.config.messages['test2'] = '{{ a| }} world';
      vno.config.config.messages['test3'] = '{{ a|brave }} {{ 0| }} world';
      return vno.utils.getMessage(key, params);
    });
  });
});

describe('path', () => {
  describe('isExternalLink', () => {
    const cases: [[string], boolean][] = [
      [['https://www.google.com/'], true],
      [['/index.md'], false],
    ];
    expectToEqual(cases, href => {
      return vno.path.isExternalLink(href);
    });
  });
  describe('checkLinkPath', () => {
    const cases: [[string], string][] = [
      [['/index'], ''],
      [['/index.md'], '/index.md'],
      [['/index/'], '/index/index.md'],
    ];
    expectToEqual(cases, path => {
      return vno.path.checkLinkPath(path);
    });
  });
  describe('shortenPath', () => {
    const cases: [[string, string?], string][] = [
      [['index.md'], ''],
      [['/index.md'], '/'],
      [['/index.html', 'html'], '/'],
    ];
    expectToEqual(cases, (path, ext?) => {
      return vno.path.shortenPath(path, ext);
    });
  });
});
