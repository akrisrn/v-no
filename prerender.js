const puppeteer = require('puppeteer');
const url = require('url');
const path = require('path');
const fs = require('fs');
const dotenv = require('dotenv');

['.env', '.env.local', '.env.production.local'].forEach((filename) => {
    const config = dotenv.parse(fs.readFileSync(filename));
    Object.keys(config).forEach((key) => {
        process.env[key] = config[key]
    });
});

const host = url.resolve(process.env.PRERENDER_HOST, process.env.VUE_APP_INDEX_PATH);

function getAbspath(filepath) {
    return path.join(process.env.PRERENDER_DIR, filepath)
}

function writeHtml(filepath, html) {
    const fileAbspath = getAbspath(filepath);
    console.log('write:', fileAbspath);
    fs.writeFile(fileAbspath, '<!DOCTYPE html>' + html, (err) => {
        if (err) throw err
    })
}

async function getHtmlAndFiles(page, urlPath) {
    console.log('load:', urlPath);
    await page.goto(urlPath);
    await page.waitForSelector('main:not(.slide-fade-enter-active)');
    await page.waitForSelector('a.snippet', {
        hidden: true
    });
    return await page.evaluate(() => {
        if (document.querySelector('main.error')) {
            return [null, null]
        }
        const home = document.querySelector('a.home');
        if (home) {
            home.href = '/'
        }
        const files = [];
        document.querySelectorAll('a').forEach((a) => {
            const href = a.getAttribute('href');
            if (!href) {
                return;
            }
            let filepath;
            if (href.startsWith('#/') && href.endsWith('.md')) {
                filepath = href.substr(1);
                a.href = filepath.replace(/\.md$/, '.html');
            } else if (href.startsWith('/') && href.endsWith('.html')) {
                filepath = href.replace(/\.html$/, '.md')
            } else {
                return
            }
            files.push(filepath)
        });
        return [document.documentElement.outerHTML, files];
    });
}

const hasLoaded = [];

async function loadPages(browser, files) {
    const pages = [];
    for (const filepath of files) {
        if (hasLoaded.includes(filepath)) {
            continue
        }
        hasLoaded.push(filepath);
        const urlPath = url.resolve(host, '#' + filepath);
        pages.push(browser.newPage().then(async (page) => {
            const [html, newFiles] = await getHtmlAndFiles(page, urlPath);
            if (html !== null) {
                writeHtml(filepath.replace(/\.md$/, '.html'), html);
                await loadPages(browser, newFiles)
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
    const [html, files] = await getHtmlAndFiles(page, host);
    if (html !== null) {
        writeHtml('index.html', html);
        await loadPages(browser, files);
    } else {
        console.error('error:', host);
    }

    await browser.close();
})();
