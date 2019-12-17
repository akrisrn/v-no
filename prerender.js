const puppeteer = require('puppeteer');
const url = require('url');
const path = require('path');
const fs = require('fs');
const dotenv = require('dotenv');
const spawn = require('cross-spawn');

['.env', '.env.local', '.env.production.local'].forEach((filename) => {
    try {
        const config = dotenv.parse(fs.readFileSync(filename));
        Object.keys(config).forEach((key) => {
            process.env[key] = config[key]
        });
    } catch (e) {
    }
});

let host = process.env.PRERENDER_HOST;
const dir = process.env.PRERENDER_DIR;
const indexPath = process.env.VUE_APP_INDEX_PATH;
const indexFile = process.env.VUE_APP_INDEX_FILE;
const categoryFile = process.env.VUE_APP_CATEGORY_FILE;

if (!host || !dir) return;

const index = url.resolve(host, indexPath);

function getLastUpdatedDate(filepath) {
    try {
        let result = spawn.sync('git', ['log', '--format=%ct %s', filepath], {cwd: dir}).stdout.toString();
        result = result.split('\n').filter(commit => commit && !commit.endsWith('small fix'));
        if (result.length >= 2) {
            return new Date(parseInt(result[0]) * 1000).toDateString()
        }
        return null
    } catch (e) {
        return null
    }
}

function getAbspath(filepath) {
    return path.join(dir, filepath)
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
    await page.setRequestInterception(true);
    page.on('request', request => {
        if (request.resourceType() === 'image') {
            request.abort();
        } else {
            request.continue();
        }
    });
    await page.goto(urlPath);
    await page.waitForSelector('main:not(.slide-fade-enter-active)');
    await page.waitForSelector('a.snippet', {
        hidden: true
    });
    if (urlPath.endsWith('#/' + categoryFile)) {
        await page.waitForSelector('ul');
    }
    return page.evaluate((lastUpdatedDate) => {
        if (document.querySelector('main.error')) {
            return [null, null]
        }
        if (lastUpdatedDate) {
            const date = document.querySelector('footer .date');
            if (date && date.innerText !== lastUpdatedDate) {
                date.innerText = lastUpdatedDate + (date.innerText ? ' (Last Updated)' : '')
            }
            const bar = document.querySelector('#bar');
            if (!bar.querySelector('.item-date')) {
                const code = document.createElement('code');
                code.classList.add('item-date');
                code.innerText = lastUpdatedDate;
                bar.insertBefore(code, bar.children[bar.querySelector('.item-home') ? 1 : 0])
            }
        }
        document.querySelectorAll('code.item-author,code.item-tag,.index li>code').forEach((code) => {
            code.innerHTML = code.innerText;
            code.classList.add('nolink')
        });
        const files = [];
        for (const a of document.querySelectorAll('a')) {
            const href = a.getAttribute('href');
            if (!href) {
                continue;
            }
            let filepath;
            if (href.startsWith('#/') && href.endsWith('.md')) {
                filepath = href.substr(1);
                a.href = filepath.replace(/\.md$/, '.html');
            } else if (href.startsWith('/') && href.endsWith('.html')) {
                filepath = href.replace(/\.html$/, '.md')
            } else {
                continue;
            }
            files.push(filepath)
        }
        document.body.classList.add('prerender');
        document.querySelectorAll('div.code-toolbar').forEach((toolbar) => {
            toolbar.outerHTML = toolbar.querySelector('pre').outerHTML
        });
        return [document.documentElement.outerHTML, files];
    }, getLastUpdatedDate(urlPath.split('#/')[1]));
}

const hasLoaded = [];

async function loadPages(browser, files) {
    const pages = [];
    for (const filepath of files) {
        if (hasLoaded.includes(filepath)) {
            continue
        }
        hasLoaded.push(filepath);
        const urlPath = url.resolve(index, '#' + filepath);
        pages.push(browser.newPage().then(async (page) => {
            const [html, newFiles] = await getHtmlAndFiles(page, urlPath);
            await page.close();
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
