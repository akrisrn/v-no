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

function writeHtml(filePath, html) {
  filePath = path.join(outDir, filePath);
  const dirname = path.dirname(filePath);
  if (!fs.existsSync(dirname)) {
    fs.mkdirSync(dirname, { recursive: true });
  }
  console.log('write:', filePath);
  fs.writeFileSync(filePath, '<!DOCTYPE html>' + html);
}

async function getHtmlAndFiles(page, urlPath) {
  console.log('load:', urlPath);
  await page.setRequestInterception(true);
  page.on('request', request => {
    const pathname = new URL(request.url()).pathname;
    switch (request.resourceType()) {
      case 'image':
        request.abort();
        break;
      case 'script':
        if (!pathname.startsWith(assetsPath)) {
          request.abort();
        } else {
          request.continue();
        }
        break;
      default:
        request.continue();
    }
  });
  await page.goto(urlPath + '?prerender');
  await page.waitForSelector('main:not(.slide-fade-enter-active)');
  await page.waitForSelector('a.snippet', {
    hidden: true,
  });
  return page.evaluate(publicPath => {
    if (document.querySelector('main.error')) {
      return [null, null];
    }
    document.body.classList.add('prerender');
    const files = [];
    document.querySelectorAll('a[href]').forEach(a => {
      const href = a.getAttribute('href');
      if (href.startsWith('#/') && href.endsWith('.md')) {
        const filePath = href.substr(1);
        a.href = publicPath.substr(0, publicPath.length - 1) + filePath.replace(/\.md$/, '.html');
        files.push(filePath);
      }
    });
    document.querySelectorAll('code.item-tag, li.article > code').forEach(code => {
      code.innerHTML = code.innerText;
    });
    document.querySelectorAll('div.code-toolbar').forEach(toolbar => {
      toolbar.outerHTML = toolbar.querySelector('pre').outerHTML;
    });
    const code = document.createElement('code');
    code.classList.add('item-hash');
    let hashPath = document.location.pathname;
    if (hashPath.endsWith('index.html')) {
      hashPath = hashPath.replace(/index\.html$/, '');
    }
    hashPath += document.location.hash;
    if (hashPath.endsWith('?prerender')) {
      hashPath = hashPath.replace(/\?prerender$/, '');
    }
    if (hashPath.endsWith('#/index.md')) {
      hashPath = hashPath.replace(/#\/index\.md$/, '');
    }
    code.innerHTML = `<a href="${hashPath}">#</a>`;
    const bar = document.querySelector('#bar');
    bar.append(code);
    return [document.documentElement.outerHTML, files];
  }, publicPath);
}

const hasLoaded = [];

async function loadPages(browser, files) {
  const pages = [];
  for (const filePath of files) {
    if (hasLoaded.includes(filePath)) {
      continue;
    }
    hasLoaded.push(filePath);
    const urlPath = `${indexUrl}#${filePath}`;
    pages.push(browser.newPage().then(async page => {
      const [html, newFiles] = await getHtmlAndFiles(page, urlPath);
      await page.close();
      if (html !== null) {
        writeHtml(filePath.replace(/\.md$/, '.html'), html);
        await loadPages(browser, newFiles);
      } else {
        console.error('error:', urlPath);
      }
    }));
  }
  await Promise.all(pages);
}

(async () => {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  const [html, files] = await getHtmlAndFiles(page, `${indexUrl}#/${indexFile}`);
  await page.close();
  if (html !== null) {
    writeHtml('index.html', html);
    await loadPages(browser, files);
  } else {
    console.error('error:', indexUrl);
  }
  await browser.close();
})();
