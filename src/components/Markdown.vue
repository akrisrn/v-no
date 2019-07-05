<template>
    <article class="markdown-body" :class="{index: isIndex}" v-html="markdown"></article>
</template>

<script lang="ts">
    import {Component, Prop, Vue} from 'vue-property-decorator';
    import MarkdownIt from 'markdown-it';
    import Prism from 'prismjs';
    import axios from 'axios';
    import {getDate} from '@/utils';

    @Component
    export default class Markdown extends Vue {
        public static getErrorText(message: string) {
            return `<span class="error">${message}</span>`;
        }

        public static getWrapRegExp(wrapLeft: string, wrapRight: string = wrapLeft, flags = '') {
            return new RegExp(`${wrapLeft}\\s*(.+?)\\s*${wrapRight}`, flags);
        }

        @Prop() public data!: string;
        @Prop() public isIndex!: boolean;

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
                this.updateLinkPath();
                this.updateImagePath();
                if (this.isIndex) {
                    this.updateIndexList();
                }
            }, 0);
        }

        public renderMD(data: string, noToc = false) {
            const toc: string[] = [];
            let firstHeader = '';
            data = data.split('\n').map((line) => {
                if (!noToc) {
                    const tocMatch = line.match(Markdown.getWrapRegExp('^(##+)', '$'));
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
                const jsExpMatches = line.match(Markdown.getWrapRegExp('\\$', '\\$', 'g'));
                if (jsExpMatches) {
                    jsExpMatches.forEach((jsExpMatch) => {
                        const m = jsExpMatch.match(Markdown.getWrapRegExp('\\$', '\\$'))!;
                        let result = '';
                        try {
                            // tslint:disable-next-line:no-eval
                            result = eval(m[1]);
                        } catch (e) {
                            result = Markdown.getErrorText(`${e.name}: ${e.message}`);
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
                data = data.replace(/\[toc]/i, tocHtml);
            }
            return this.markdownIt.render(data);
        }

        public updateDD() {
            document.querySelectorAll('p').forEach((p) => {
                if (p.innerText.startsWith(': ')) {
                    const dl = document.createElement('dl');
                    const dd = document.createElement('dd');
                    dl.append(dd);
                    dd.innerHTML = p.innerHTML.substr(2);
                    p.outerHTML = dl.outerHTML;
                }
            });
            document.querySelectorAll('dt').forEach((dt) => {
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
                a.setAttribute('h', new URL(a.href).pathname.substr(1));
                a.removeAttribute('href');
                a.addEventListener('click', (e) => {
                    e.preventDefault();
                    for (const h of document.querySelectorAll<HTMLHeadingElement>(a.getAttribute('h')!)) {
                        if (h.innerText === a.innerText) {
                            window.scrollTo(0, h.offsetTop);
                            break;
                        }
                    }
                });
            });
        }

        public updateFootnote() {
            document.querySelectorAll<HTMLLinkElement>('.footnote-backref').forEach((backref, i) => {
                const fnref = document.getElementById(`fnref${i + 1}`);
                if (fnref) {
                    fnref.addEventListener('click', (e) => {
                        e.preventDefault();
                        window.scrollTo(0, backref.offsetTop);
                    });
                    fnref.removeAttribute('href');
                    backref.addEventListener('click', (e) => {
                        e.preventDefault();
                        window.scrollTo(0, fnref.offsetTop);
                    });
                    backref.removeAttribute('href');
                }
            });
        }

        public updateIndexList() {
            document.querySelectorAll('li').forEach((li) => {
                const link = li.querySelector('a');
                const path = link ? link.href : '';
                if (path) {
                    const date = document.createElement('div');
                    date.classList.add('date');
                    date.innerText = getDate(path);
                    li.append(date);
                }
            });
        }

        public updateLinkPath(updatedLinks: string[] = []) {
            // 匹配模式：
            // 1. 链接地址以 # 结尾：将链接转换成站内路由形式
            // 2. text 为 +，或形如 +#a=1&b=2&3：将链接引入为片段模板，后者为传参写法
            //      #a=1&b=2&3 会被转化成 {1: 1, 2: 2, 3: 3, a: 1, b: 2}
            // 3. text 为 *：将链接引入为 JavaScript 文件引用
            // 4. text 为 $：将链接引入为 CSS 文件引用
            document.querySelectorAll<HTMLLinkElement>('a[href]').forEach((a) => {
                if (a.href.endsWith('#')) {
                    a.href = '#' + new URL(a.href).pathname;
                } else if (a.innerText.match(/^\+(?:#.+)?$/)) {
                    if (updatedLinks.includes(a.href)) {
                        return;
                    }
                    const params: any = {};
                    const match = a.innerText.match(/#(.+)$/);
                    if (match) {
                        match[1].split('&').forEach((seg, i) => {
                            let param = seg;
                            const paramMatch = seg.match(/(.+?)=(.+)/);
                            if (paramMatch) {
                                param = paramMatch[2];
                                params[paramMatch[1]] = param;
                            }
                            params[i + 1] = param;
                        });
                    }
                    axios.get(a.href).then((response) => {
                        const data = (response.data as string).split('\n').map((line) => {
                            const paramMatches = line.match(Markdown.getWrapRegExp('{{', '}}', 'g'));
                            if (paramMatches) {
                                paramMatches.forEach((paramMatch) => {
                                    const m = paramMatch.match(Markdown.getWrapRegExp('{{', '}}'))!;
                                    let defaultValue;
                                    [m[1], defaultValue] = m[1].split('|');
                                    const param = params[m[1]];
                                    let result = '';
                                    if (param !== undefined) {
                                        result = param;
                                    } else if (defaultValue !== undefined) {
                                        result = defaultValue;
                                    } else {
                                        result = Markdown.getErrorText(param);
                                    }
                                    line = line.replace(m[0], result);
                                });
                                return line;
                            }
                            return line;
                        }).join('\n');
                        a.parentElement!.outerHTML = this.renderMD(data, true);
                        this.updateDD();
                        updatedLinks.push(a.href);
                        this.updateLinkPath(updatedLinks);
                        this.updateImagePath();
                    });
                } else if (a.innerText === '*') {
                    const script = document.createElement('script');
                    script.src = a.href;
                    document.head.appendChild(script);
                    a.parentElement!.remove();
                } else if (a.innerText === '$') {
                    const link = document.createElement('link');
                    link.rel = 'stylesheet';
                    link.href = a.href;
                    document.head.appendChild(link);
                    a.parentElement!.remove();
                }
            });
        }

        public updateImagePath() {
            document.querySelectorAll('img').forEach((img) => {
                const match = img.src.match(/#(.+)$/);
                if (match) {
                    const width = parseInt(match[1], 0);
                    if (isNaN(width)) {
                        img.setAttribute('style', match[1]);
                    } else {
                        img.width = width;
                    }
                    img.src = img.src.replace(/#(.+)$/, '');
                }
            });
        }

        public setTitle() {
            const titleMatch = this.data.match(Markdown.getWrapRegExp('^#', '\n'));
            document.title = titleMatch ? titleMatch[1] : this.$route.params.pathMatch.substr(1);
        }

        // noinspection JSUnusedGlobalSymbols
        public get markdown() {
            this.setTitle();
            return this.renderMD(this.data);
        }
    }
</script>

<style>@import '~github-markdown-css/github-markdown.css';</style>

<style lang="stylus">
    .markdown-body
        font-size 15px
        line-height 2
        color #4a4a4a

        h1, h2, h3, h4, h5, h6
            color #24292e

        h1, h2
            border-bottom-color #e4e4e4

        img
            box-shadow 0 2px 2px 0 rgba(0, 0, 0, 0.14), 0 1px 5px 0 rgba(0, 0, 0, 0.12), 0 3px 1px -2px rgba(0, 0, 0, 0.2)
            background-color transparent

        mark
            border-radius 3px
            background-color rgba(255, 235, 59, 0.5)
            box-shadow 0.25em 0 0 rgba(255, 235, 59, 0.5), -0.25em 0 0 rgba(255, 235, 59, 0.5)

        dl
            dt
                font-style normal
                font-weight normal

            dd
                font-size 14px
                color dimgray
                padding 0

                &:before
                    content '»'
                    padding-right 8px
                    font-family sans-serif

                + dd
                    margin-top -16px

        pre
            background-color #2d2d2d

        kbd
            margin-bottom 3px

        #toc
            font-size 14px
            margin-bottom 16px

        .footnote-ref > a, a.footnote-backref, #toc a
            color #0366d6
            text-decoration none
            cursor pointer

            &:hover
                text-decoration underline

        .footnotes
            color dimgray

            &:before
                content 'Footnotes'
                font-weight bold

            ol
                margin-top -8px
                margin-bottom -8px

            .footnote-backref
                font-family serif

        .error
            color red
            border 1px solid

    .index
        ul:first-of-type
            padding-left 0

            li
                list-style none

                &:before
                    content '»'
                    padding-right 8px
                    font-family sans-serif
</style>
