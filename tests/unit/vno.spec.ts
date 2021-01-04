import puppeteer, { Browser } from 'puppeteer-core';

let browser: Browser;

beforeAll(async () => {
  browser = await puppeteer.launch();
});

afterAll(async () => {
  await browser.close();
});
