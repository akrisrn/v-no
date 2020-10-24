const puppeteer = require('puppeteer');
const url = require('url');
const path = require('path');
const fs = require('fs');

const outDir = '';
const host = '';
const publicPath = '/';
const indexPath = 'hash/index.html';
const indexFile = 'index.md';
const categoryFile = 'categories.md';

if (!outDir || !host) return;

const index = url.resolve(host + publicPath, indexPath);

function writeHtml(filepath, html) {
  filepath = path.join(outDir, filepath);
  const dirname = path.dirname(filepath);
  if (!fs.existsSync(dirname)) {
    fs.mkdirSync(dirname, { recursive: true });
  }
  console.log('write:', filepath);
  fs.writeFileSync(filepath, '<!DOCTYPE html>' + html);
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
        if (!pathname.startsWith('/assets/')) {
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
  if (urlPath.endsWith(`#/${categoryFile}`)) {
    await page.waitForSelector('ul');
  }
  return page.evaluate(() => {
    if (document.querySelector('main.error')) {
      return [null, null];
    }
    const files = [];
    for (const a of document.querySelectorAll('a')) {
      const href = a.getAttribute('href');
      if (!href) {
        continue;
      }
      let filepath;
      if (href.startsWith('#/') && href.endsWith('.md')) {
        filepath = href.substr(1);
        let newHref = filepath.replace(/\.md$/, '.html');
        if (publicPath !== '/' && !newHref.startsWith(publicPath)) {
          newHref = publicPath + newHref;
        }
        a.href = newHref;
      } else if (href.startsWith('/') && href.endsWith('.html')) {
        filepath = href.replace(/\.html$/, '.md');
      } else {
        continue;
      }
      files.push(filepath);
    }
    document.body.classList.add('prerender');
    document.querySelectorAll('code.item-tag,.index li>code').forEach((code) => {
      code.innerHTML = code.innerText;
      code.classList.add('nolink');
    });
    document.querySelectorAll('div.code-toolbar').forEach((toolbar) => {
      toolbar.outerHTML = toolbar.querySelector('pre').outerHTML;
    });
    const code = document.createElement('code');
    code.classList.add('item-hash');
    let hashPath = document.location.pathname;
    if (hashPath.endsWith('index.html')) {
      hashPath = hashPath.substring(0, hashPath.length - 10);
    }
    hashPath += document.location.hash;
    if (hashPath.endsWith('?prerender')) {
      hashPath = hashPath.substring(0, hashPath.length - 10);
    }
    if (hashPath.endsWith('index.md')) {
      hashPath = hashPath.substring(0, hashPath.length - 10);
    }
    code.innerHTML = `<a href="${hashPath}">Hash</a>`;
    const bar = document.querySelector('#bar');
    bar.append(code);
    return [document.documentElement.outerHTML, files];
  });
}

const hasLoaded = [];

async function loadPages(browser, files) {
  const pages = [];
  for (const filepath of files) {
    if (hasLoaded.includes(filepath)) {
      continue;
    }
    hasLoaded.push(filepath);
    const urlPath = url.resolve(index, '#' + filepath);
    pages.push(browser.newPage().then(async (page) => {
      const [html, newFiles] = await getHtmlAndFiles(page, urlPath);
      await page.close();
      if (html !== null) {
        writeHtml(filepath.replace(/\.md$/, '.html'), html);
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
  const [html, files] = await getHtmlAndFiles(page, url.resolve(index, '#/' + indexFile));
  await page.close();
  if (html !== null) {
    writeHtml('index.html', html);
    await loadPages(browser, files);
  } else {
    console.error('error:', index);
  }
  await browser.close();
})();
