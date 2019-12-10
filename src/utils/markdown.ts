import resource from '@/utils/resource';
import {getWrapRegExp} from '@/utils/utils';
import {AxiosError} from 'axios';
import MarkdownIt from 'markdown-it';

// tslint:disable no-var-requires
// noinspection JSUnusedGlobalSymbols
const markdownIt = new MarkdownIt({
    html: true,
    breaks: true,
    linkify: true,
}).use(require('markdown-it-footnote')).use(require('markdown-it-deflist'))
    .use(require('markdown-it-task-lists')).use(require('markdown-it-container'), 'details', {
        validate: (params: string) => {
            return params.trim().match(/^(open\s+)?(?:\.(.*?)\s+)?(.*)$/);
        },
        render: (tokens: { [index: number]: { nesting: number, info: string } }, idx: number) => {
            if (tokens[idx].nesting === 1) {
                const match = tokens[idx].info.trim().match(/^(open\s+)?(?:\.(.*?)\s+)?(.*)$/)!;
                let open = '';
                if (match[1]) {
                    open = ' open';
                }
                let classAttr = '';
                if (match[2]) {
                    classAttr = ` class="${match[2].split('.').join(' ')}"`;
                }
                const summary = markdownIt.render(match[3]).trim().replace(/^<p>(.*)<\/p>$/, '$1');
                return `<details${classAttr}${open}><summary>${summary}</summary>`;
            } else {
                return '</details>';
            }
        },
    });
markdownIt.linkify.tlds([], false);

export function renderMD(data: string, isCategory: boolean, noToc = false) {
    let article: HTMLElement;
    const toc: string[] = [];
    let firstHeader = '';
    data = data.split('\n').map((line) => {
        if (!noToc) {
            const tocMatch = line.match(getWrapRegExp('^(##+)', '$'));
            if (tocMatch) {
                if (!firstHeader) {
                    firstHeader = tocMatch[1];
                }
                let prefix = '-';
                if (tocMatch[1] !== firstHeader) {
                    prefix = tocMatch[1].replace(new RegExp(`${firstHeader}$`), '-').replace(/#/g, '  ');
                }
                toc.push(`${prefix} [${tocMatch[2]}](h${tocMatch[1].length})`);
            }
        }
        // 将被 $ 包围的部分作为 JavaScript 表达式执行
        const jsExpMatches = line.match(getWrapRegExp('\\$', '\\$', 'g'));
        if (jsExpMatches) {
            jsExpMatches.forEach((jsExpMatch) => {
                const m = jsExpMatch.match(getWrapRegExp('\\$', '\\$'))!;
                let result: string;
                try {
                    if (!article) {
                        article = document.createElement('article');
                        article.innerHTML = markdownIt.render(data);
                    }
                    // tslint:disable-next-line:no-eval
                    result = eval(`(function(article){${m[1]}})`)(article);
                } catch (e) {
                    result = `${e.name}: ${e.message}`;
                }
                line = line.replace(m[0], result);
            });
            return line;
        }
        return line;
    }).join('\n');
    if (!noToc) {
        let tocHtml = '<div id="toc">';
        if (toc.length > 7 && !isCategory) {
            let mid = Math.ceil(toc.length / 2);
            while (toc[mid] && !toc[mid].startsWith('-')) {
                mid += 1;
            }
            tocHtml += markdownIt.render(toc.slice(0, mid).join('\n')) +
                markdownIt.render(toc.slice(mid, toc.length).join('\n'));
        } else {
            tocHtml += markdownIt.render(toc.join('\n'));
        }
        tocHtml += '</div>';
        tocHtml = tocHtml.replace(/<ul>/g, `<ul class="toc${isCategory ? ' tags' : ''}">`);
        data = data.replace(/\[toc]/i, tocHtml);
    }
    return markdownIt.render(data);
}

export function error2markdown(error: AxiosError) {
    return `# ${error.response!.status} ${error.response!.statusText}\n${resource.pageError}`;
}
