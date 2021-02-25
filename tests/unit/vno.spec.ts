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
