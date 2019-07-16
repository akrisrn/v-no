<template>
    <article :class="classObject" v-html="markdown"></article>
</template>

<script lang="ts">
    import {getDateString, getTime, getWrapRegExp} from '@/utils';
    import axios from 'axios';
    import MarkdownIt from 'markdown-it';
    import Prism from 'prismjs';
    import {Component, Prop, PropSync, Vue} from 'vue-property-decorator';

    @Component
    export default class Article extends Vue {
        @PropSync('data') public markdownData!: string;
        @PropSync('cover') public coverUrl!: string;
        @PropSync('icon') public iconUrl!: string;
        @Prop() public isIndex!: boolean;
        @Prop() public isCategory!: boolean;

        public classObject = [{
            index: this.isIndex,
        }, 'markdown-body'];

        // noinspection JSUnusedGlobalSymbols
        public markdownIt = new MarkdownIt({
            html: true,
            breaks: true,
            linkify: true,
            highlight(str, lang) {
                if (lang && Prism.languages[lang]) {
                    return Prism.highlight(str, Prism.languages[lang], lang);
                }
                return '';
            },
        }).use(require('markdown-it-footnote')).use(require('markdown-it-deflist'))
            .use(require('markdown-it-task-lists'));

        // noinspection JSUnusedGlobalSymbols
        public created() {
            this.markdownIt.linkify.tlds([], false);
        }

        // noinspection JSUnusedGlobalSymbols
        public mounted() {
            // 规避 mount 后仍然可以查询到旧节点的问题。
            setTimeout(() => {
                this.updateDD();
                this.updateToc();
                this.updateFootnote();
                this.updateImagePath();
                this.updateCover();
                this.updateIcon();
                this.updateLinkPath();
                if (this.isCategory) {
                    this.updateCategoryList();
                } else if (this.isIndex) {
                    this.updateIndexList();
                }
            }, 0);
        }

        public renderMD(data: string, noToc = false) {
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
                        let result = '';
                        try {
                            // tslint:disable-next-line:no-eval
                            result = eval(m[1]);
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
                if (toc.length > 7) {
                    let mid = Math.ceil(toc.length / 2);
                    while (toc[mid] && !toc[mid].startsWith('-')) {
                        mid += 1;
                    }
                    tocHtml += this.markdownIt.render(toc.slice(0, mid).join('\n')) +
                        this.markdownIt.render(toc.slice(mid, toc.length).join('\n'));
                } else {
                    tocHtml += this.markdownIt.render(toc.join('\n'));
                }
                tocHtml += '</div>';
                tocHtml = tocHtml.replace(/<ul>/g, '<ul class="toc">');
                data = data.replace(/\[toc]/i, tocHtml);
            }
            return this.markdownIt.render(data);
        }

        public updateDD() {
            document.querySelectorAll<HTMLParagraphElement>('article p').forEach((p) => {
                if (p.innerText.startsWith(': ')) {
                    const dl = document.createElement('dl');
                    const dd = document.createElement('dd');
                    dl.append(dd);
                    dd.innerHTML = p.innerHTML.substr(2);
                    p.outerHTML = dl.outerHTML;
                }
            });
            document.querySelectorAll<HTMLDetailsElement>('article dt').forEach((dt) => {
                if (dt.innerText.startsWith(': ')) {
                    const dd = document.createElement('dd');
                    dd.innerHTML = dt.innerHTML.substr(2);
                    dt.outerHTML = dd.outerHTML;
                }
            });
        }

        public updateToc() {
            const uls = document.querySelectorAll<HTMLUListElement>('#toc > ul');
            if (uls.length === 2) {
                uls.forEach((ul) => {
                    ul.style.display = 'inline-table';
                    ul.style.maxWidth = '350px';
                });
                uls[0].style.marginBottom = '.25em';
                uls[1].style.marginBottom = '0';
            }
            document.querySelectorAll<HTMLLinkElement>('#toc a').forEach((a) => {
                let href = a.getAttribute('h')!;
                if (href === null) {
                    href = a.getAttribute('href')!;
                    a.setAttribute('h', href);
                    a.removeAttribute('href');
                }
                let innerText = a.innerText;
                const nextSibling = a.nextElementSibling as HTMLElement;
                if (nextSibling && nextSibling.classList.value === 'count') {
                    innerText += nextSibling.innerText;
                }
                a.addEventListener('click', (e) => {
                    e.preventDefault();
                    for (const h of document.querySelectorAll<HTMLHeadingElement>(`article ${href}`)) {
                        if (h.innerText === innerText) {
                            window.scrollTo(0, h.offsetTop - 10);
                            break;
                        }
                    }
                });
            });
        }

        public updateFootnote() {
            document.querySelectorAll<HTMLLinkElement>('article .footnote-backref').forEach((backref, i) => {
                const fnref = document.getElementById(`fnref${i + 1}`);
                if (fnref) {
                    fnref.addEventListener('click', (e) => {
                        e.preventDefault();
                        window.scrollTo(0, backref.offsetTop - 10);
                    });
                    fnref.removeAttribute('href');
                    backref.addEventListener('click', (e) => {
                        e.preventDefault();
                        window.scrollTo(0, fnref.offsetTop - 10);
                    });
                    backref.removeAttribute('href');
                }
            });
        }

        public updateImagePath() {
            document.querySelectorAll<HTMLImageElement>('article img').forEach((img) => {
                let parent = img.parentElement!;
                if (parent.tagName === 'DT') {
                    parent = parent.parentElement!;
                }
                parent.classList.add('center');
                const src = img.getAttribute('src')!;
                const match = src.match(/#(.+)$/);
                if (match) {
                    const width = parseInt(match[1], 0);
                    if (isNaN(width)) {
                        if (match[1].startsWith('.')) {
                            match[1].substr(1).split(',').forEach((cls) => {
                                img.classList.add(cls.trim());
                            });
                        } else {
                            img.setAttribute('style', match[1]);
                        }
                    } else {
                        img.width = width;
                    }
                    if (src.startsWith('http')) {
                        img.src = src.replace(/#.+$/, '');
                    } else {
                        img.src = new URL(img.src).pathname;
                    }
                }
            });
        }

        // noinspection JSMethodCanBeStatic
        public updateCover() {
            const cover = document.querySelector<HTMLImageElement>('article img.cover');
            if (cover) {
                this.coverUrl = cover.getAttribute('src')!;
                cover.parentElement!.remove();
            }
        }

        // noinspection JSMethodCanBeStatic
        public updateIcon() {
            const icon = document.querySelector<HTMLImageElement>('article img.icon');
            if (icon) {
                this.iconUrl = icon.getAttribute('src')!;
                icon.parentElement!.remove();
            }
        }

        public updateLinkPath(updatedLinks: string[] = []) {
            // 匹配模式：
            // 1. 链接地址以 # 结尾：将链接转换成 hash 路由形式
            // 2. 链接地址以 #/ 结尾：将链接转换成 history 路由 / 预渲染形式
            // 3. text 为 +，或形如 +#a=1|b=2|3：将链接引入为片段模板，后者为传参写法
            //      #a=1|b=2|3 会被转化成 {1: 1, 2: 2, 3: 3, a: 1, b: 2}
            // 4. text 为 *：将链接引入为 JavaScript 文件引用
            // 5. text 为 $：将链接引入为 CSS 文件引用
            document.querySelectorAll<HTMLLinkElement>('article a[href]').forEach((a) => {
                const href = a.getAttribute('href')!;
                const pathname = new URL(a.href).pathname;
                if (href.endsWith('.md#')) {
                    a.href = '#' + pathname;
                } else if (href.endsWith('.md#/')) {
                    a.href = pathname.replace(/\.md$/, '.html');
                } else if (a.innerText.match(/^\+(?:#.+)?$/)) {
                    a.classList.add('snippet');
                    if (updatedLinks.includes(href)) {
                        return;
                    }
                    const params: any = {};
                    const match = a.innerText.match(/#(.+)$/);
                    if (match) {
                        match[1].split('|').forEach((seg, i) => {
                            let param = seg;
                            const paramMatch = seg.match(/(.+?)=(.+)/);
                            if (paramMatch) {
                                param = paramMatch[2];
                                params[paramMatch[1]] = param;
                            }
                            params[i + 1] = param;
                        });
                    }
                    axios.get(href).then((response) => {
                        const data = (response.data as string).split('\n').map((line) => {
                            const paramMatches = line.match(getWrapRegExp('{{', '}}', 'g'));
                            if (paramMatches) {
                                paramMatches.forEach((paramMatch) => {
                                    const m = paramMatch.match(getWrapRegExp('{{', '}}'))!;
                                    let defaultValue;
                                    [m[1], defaultValue] = m[1].split('|');
                                    const param = params[m[1]];
                                    let result = '';
                                    if (param !== undefined) {
                                        result = param;
                                    } else if (defaultValue !== undefined) {
                                        result = defaultValue;
                                    } else {
                                        result = param;
                                    }
                                    line = line.replace(m[0], result);
                                });
                                return line;
                            }
                            return line;
                        }).join('\n');
                        a.parentElement!.outerHTML = this.renderMD(data, true);
                        this.updateDD();
                        this.updateImagePath();
                        updatedLinks.push(href);
                        this.updateLinkPath(updatedLinks);
                    }).catch((error) => {
                        a.parentElement!.innerHTML = `${error.response.status} ${error.response.statusText}`;
                    });
                } else if (a.innerText === '*') {
                    const script = document.createElement('script');
                    script.src = href;
                    document.head.appendChild(script);
                    a.parentElement!.remove();
                } else if (a.innerText === '$') {
                    const link = document.createElement('link');
                    link.rel = 'stylesheet';
                    link.href = href;
                    document.head.appendChild(link);
                    a.parentElement!.remove();
                }
            });
        }

        public updateIndexList() {
            document.querySelectorAll('article ul:not(.toc)').forEach((ul) => {
                const lis: any[] = [];
                ul.querySelectorAll('li').forEach((li) => {
                    const item = {
                        node: li,
                        time: 0,
                    };
                    let date = li.querySelector<HTMLSpanElement>('span.date');
                    if (!date) {
                        const link = li.querySelector('a');
                        if (link) {
                            const dateString = getDateString(link.href);
                            if (dateString) {
                                date = document.createElement('span');
                                date.classList.add('date');
                                date.innerText = dateString;
                                li.insertBefore(date, link);
                                item.time = getTime(link.href);
                            }
                        }
                    }
                    lis.push(item);
                });
                let maxSize = process.env.VUE_APP_MAX_SIZE_OF_LIST;
                if (this.isCategory) {
                    maxSize = 5;
                }
                ul.innerHTML = lis.sort((a, b) => b.time - a.time).map((li, i) => {
                    if (i >= maxSize) {
                        li.node.classList.add('hidden');
                    }
                    return li.node.outerHTML;
                }).join('');
                if (lis.length > maxSize) {
                    const more = document.createElement('div');
                    more.classList.add('more');
                    const moreSpan = document.createElement('span');
                    moreSpan.innerText = 'More';
                    moreSpan.addEventListener('click', () => {
                        ul.querySelectorAll('li.hidden').forEach((li) => {
                            li.classList.remove('hidden');
                        });
                        more.classList.add('hidden');
                    });
                    more.append(moreSpan);
                    ul.append(more);
                }
            });
        }

        public updateCategoryList() {
            axios.get(process.env.VUE_APP_INDEX_FILE).then((response) => {
                const matches = (response.data as string).match(/^-\s*\[.*?]\(.*?\)\s*`.*?`\s*$/gm);
                if (matches) {
                    const tagDict: any = {};
                    matches.forEach((match) => {
                        const m = match.match(/^-\s*\[(.*?)]\((.*?)\)\s*(.*?)\s*$/)!;
                        const tags = m[3].split(/`\s+`/).map((seg) => {
                            return seg.replace(/`/g, '');
                        });
                        tags.forEach((tag) => {
                            if (tagDict[tag] === undefined) {
                                tagDict[tag] = [];
                            }
                            tagDict[tag].push(`- [${m[1]}](${m[2]})`);
                        });
                    });
                    this.markdownData += '\n' + Object.keys(tagDict).sort().map((key) => {
                        const count = `<span class="count">（${tagDict[key].length}）</span>`;
                        return `###### ${key}${count}\n\n${tagDict[key].join('\n')}`;
                    }).join('\n\n');
                    setTimeout(() => {
                        this.updateToc();
                        this.updateLinkPath();
                        this.updateIndexList();
                        document.querySelectorAll('#toc li > a').forEach((a) => {
                            const count = a.querySelector('span.count');
                            if (count) {
                                a.removeChild(count);
                                a.parentElement!.append(count);
                            }
                        });
                    }, 0);
                }
            });
        }

        public get markdown() {
            return this.renderMD(this.markdownData);
        }
    }
</script>

<style>@import '~github-markdown-css/github-markdown.css';</style>

<style lang="stylus">
    .markdown-body
        font-size 15px
        line-height 2
        color #4a4a4a

        > :first-child dt:first-of-type
            margin-top 0 !important

        h1, h2
            border-bottom-color #e4e4e4

        img
            margin-top 8px
            box-shadow 0 2px 2px 0 rgba(0, 0, 0, 0.14), 0 1px 5px 0 rgba(0, 0, 0, 0.12), 0 3px 1px -2px rgba(0, 0, 0, 0.2)
            background-color transparent

            &.no-shadow
                box-shadow none

        mark
            border-radius 3px
            background-color rgba(255, 235, 59, 0.5)
            box-shadow 0.25em 0 0 rgba(255, 235, 59, 0.5), -0.25em 0 0 rgba(255, 235, 59, 0.5)

        dl
            dt
                font-style normal
                font-weight normal

            dd
                font-size 13px
                color gray
                padding 0

                &:before
                    content '»'
                    padding-right 8px
                    font-family sans-serif

                + dd
                    margin-top -16px

            &.center dd:before
                content none

        pre
            background-color #2d2d2d

        kbd
            margin-bottom 3px

        em > small
            color gray

        #toc
            font-size 13px
            margin-bottom 16px

        .footnote-ref > a, a.footnote-backref, #toc a
            color #0366d6
            text-decoration none
            cursor pointer

            &:hover
                text-decoration underline

        .footnotes
            color gray

            &:before
                content 'Footnotes'
                font-weight bold

            ol
                margin-top -8px
                margin-bottom -8px

            .footnote-backref
                font-family sans-serif

        .center
            text-align center

    .index
        ul:not(.toc)
            padding-left 0

            li
                list-style none
                overflow hidden
                text-overflow ellipsis
                white-space nowrap

                &:before
                    content '»'
                    padding-right 8px
                    font-family sans-serif

                blockquote
                    border-left none
                    margin-bottom 0
                    padding-left 16px
                    padding-right 0
                    white-space normal
                    font-size 13px

                code
                    color gray
                    background none
                    padding 0

                    &:before
                        font-family sans-serif
                        content '#'
                        margin-right 2px

                .date
                    margin-left 8px

            .hidden
                display none

            .more
                font-size 13px
                color darkgray
                border-top 1px dashed
                margin-top 16px
                height 8px

                span
                    background #f1f1f1
                    transition color 0.5s
                    position relative
                    top -16px
                    padding-right 8px
                    cursor pointer

                    &:hover
                        color gray

                    &:before
                        font-family sans-serif
                        content '#'
                        margin-right 2px
</style>
