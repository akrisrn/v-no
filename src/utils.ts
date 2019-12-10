import resource from '@/resource';
import axios, {AxiosError} from 'axios';
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

export function getDate(path: string) {
    if (path) {
        if (path.endsWith('/')) {
            path = path.substr(0, path.length - 1);
        }
        let match = path.split('/').reverse()[0].match(/^(\d{4}-\d{2}-\d{2})-/);
        if (!match) {
            match = path.match(/\/(\d{4}\/\d{2}\/\d{2})\//);
            if (!match) {
                return null;
            }
        }
        return new Date(match[1]);
    } else {
        return null;
    }
}

export function getDateString(path: string) {
    const date = getDate(path);
    return date ? date.toDateString() : '';
}

export function getTime(path: string) {
    const date = getDate(path);
    return date ? date.getTime() : 0;
}

export function getWrapRegExp(wrapLeft: string, wrapRight: string = wrapLeft, flags = '') {
    return new RegExp(`${wrapLeft}\\s*(.+?)\\s*${wrapRight}`, flags);
}

export function getListFromData(data: string) {
    const matches = data.match(/^-\s*\[.*?]\(.*?\)\s*`.*?`\s*$/gm);
    if (matches) {
        return matches.map((match) => {
            const m = match.match(/^-\s*\[(.*?)]\((.*?)\)\s*(.*?)\s*$/)!;
            const title = m[1];
            const href = m[2];
            const tags = m[3].split(/`\s+`/).map((seg) => {
                return seg.replace(/`/g, '');
            });
            return {title, href, tags};
        });
    } else {
        return [];
    }
}

export function getIndexFileData(func: (data: string) => void) {
    axios.get('/' + process.env.VUE_APP_INDEX_FILE).then((response) => {
        axios.get('/' + process.env.VUE_APP_ARCHIVE_FILE).then((response2) => {
            func(response.data + response2.data);
        }).catch(() => {
            func(response.data);
        });
    });
}

export function setFlag(data: string, flag: string, onMatch?: (match: string) => void, onNotMatch?: () => void,
                        onDone?: () => void) {
    const match = data.match(getWrapRegExp(flag, '\n'));
    if (match) {
        if (onMatch) {
            onMatch(match[1]);
        }
        data = data.replace(match[0], '');
    } else {
        if (onNotMatch) {
            onNotMatch();
        }
    }
    if (onDone) {
        onDone();
    }
    return data;
}

export function splitTags(tags: string) {
    return tags.split(/\s*[,，]\s*/);
}

export function getQueryContent(params: { [index: string]: string | undefined }) {
    return params.content ? decodeURIComponent(params.content) : '';
}

export function buildQueryContent(content: string, isComplete = false) {
    return (isComplete ? `#/${process.env.VUE_APP_SEARCH_FILE}` : '') + `?content=${encodeURIComponent(content)}`;
}

export enum EFlags {
    author = 'author',
    tags = 'tags',
}
