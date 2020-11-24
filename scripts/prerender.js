const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs');

const outDir = '';
const host = '';
const publicPath = '/';
const indexPath = 'hash/index.html';
const indexFile = 'index.md';

if (!outDir || !host) return;

const indexUrl = `${host}${publicPath}${indexPath}`;
const assetsPath = `${publicPath}assets/`;

function writeFile(filePath, html) {
  filePath = path.join(outDir, filePath);
  const dirname = path.dirname(filePath);
  if (!fs.existsSync(dirname)) {
    fs.mkdirSync(dirname, { recursive: true });
  }
  console.log('write:', filePath);
  fs.writeFileSync(filePath, '<!DOCTYPE html>' + html);
}

async function loadPage(page, url) {
  console.log('load:', url);
  await page.goto(url);
  await page.waitForSelector('.slide-fade-enter-active,.rendering', {
    hidden: true,
  });
  return page.evaluate(publicPath => {
    if (document.querySelector('main.error')) {
      return ['', []];
    }
    const filePaths = [];
    document.querySelectorAll('a[href^="#/"]').forEach(a => {
      let href = a.getAttribute('href');
      const indexOf = href.indexOf('?');
      let query = '';
      if (indexOf >= 0) {
        query = href.substr(indexOf);
        href = href.substr(0, indexOf);
      }
      let filePath = href.substr(1);
      if (filePath.endsWith('/')) {
        filePath += 'index.md';
      }
      a.href = publicPath + filePath.substr(1).replace(/\.md$/, '.html') + query;
      filePaths.push(filePath);
    });
    document.body.id = 'prerender';
    return [document.documentElement.outerHTML, filePaths];
  }, publicPath);
}

(async () => {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  await page.setRequestInterception(true);
  page.on('request', request => {
    const pathname = new URL(request.url()).pathname;
    switch (request.resourceType()) {
      case 'image':
        request.abort();
        break;
      case 'script':
        if (pathname.startsWith(assetsPath)) {
          request.continue();
        } else {
          request.abort();
        }
        break;
      default:
        request.continue();
    }
  });

  const hasLoaded = [];
  const fileQueue = [];
  let filePath = indexFile;
  do {
    hasLoaded.push(filePath);
    const [html, filePaths] = await loadPage(page, `${indexUrl}#${filePath}`);
    if (html) {
      writeFile(filePath.replace(/\.md$/, '.html'), html);
      filePaths.forEach(filePath => {
        if (!hasLoaded.includes(filePath) && !fileQueue.includes(filePath)) {
          fileQueue.push(filePath);
        }
      });
    } else {
      console.error('error:', filePath);
    }
    filePath = fileQueue.shift();
  } while (filePath);

  await page.close();
  await browser.close();
})();
