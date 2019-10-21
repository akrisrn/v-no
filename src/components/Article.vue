<template>
    <article :class="classObject" v-html="markdown"></article>
</template>

<script lang="ts">
    import {getDateString, getIndexFileData, getListFromData, getTime, getWrapRegExp} from '@/utils';
    import axios from 'axios';
    import MarkdownIt from 'markdown-it';
    import Prism from 'prismjs';
    import SmoothScroll from 'smooth-scroll';
    import {Component, Prop, PropSync, Vue} from 'vue-property-decorator';

    @Component
    export default class Article extends Vue {
        @PropSync('data') public syncData!: string;
        @Prop() public isIndex!: boolean;
        @Prop() public isCategory!: boolean;
        @Prop() public isSearch!: boolean;
        @Prop() public params!: { [index: string]: string };
        @Prop() public smoothScroll!: SmoothScroll;

        public classObject = [{
            index: this.isIndex,
        }, 'markdown-body'];

        // noinspection JSUnusedGlobalSymbols
        public markdownIt = new MarkdownIt({
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
                        const summary = this.markdownIt.render(match[3]).trim().replace(/^<p>(.*)<\/p>$/, '$1');
                        return `<details${classAttr}${open}><summary>${summary}</summary>`;
                    } else {
                        return '</details>';
                    }
                },
            });

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
                this.updatePre();
                this.updateTable();
                this.updateHeading();
                this.updateFootnote();
                this.updateImagePath();
                this.updateLinkPath();
                if (this.isCategory) {
                    this.updateCategoryList();
                } else if (this.isSearch) {
                    this.updateSearchList();
                } else if (this.isIndex) {
                    this.updateIndexList();
                }
                Prism.highlightAll();
                this.updateTextCount();
            }, 0);
        }

        public renderMD(data: string, noToc = false) {
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
                        let result = '';
                        try {
                            if (!article) {
                                article = document.createElement('article');
                                article.innerHTML = this.markdownIt.render(data);
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
                if (toc.length > 7 && !this.isCategory) {
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
                tocHtml = tocHtml.replace(/<ul>/g, `<ul class="toc${this.isCategory ? ' tags' : ''}">`);
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
                uls[0].classList.add('ul-a');
                uls[1].classList.add('ul-b');
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
                            this.smoothScroll.animateScroll(h.offsetTop - 10);
                            break;
                        }
                    }
                });
            });
        }

        public updatePre() {
            document.querySelectorAll('article pre').forEach((pre) => {
                pre.classList.add('line-numbers');
            });
        }

        // noinspection JSMethodCanBeStatic
        public updateTable() {
            document.querySelectorAll('article table').forEach((table) => {
                const thead = table.querySelector('thead');
                if (thead) {
                    let isTheadEmpty = true;
                    for (const th of thead.querySelectorAll('th')) {
                        if (th.innerText) {
                            isTheadEmpty = false;
                            break;
                        }
                    }
                    if (isTheadEmpty) {
                        thead.remove();
                    }
                }
            });
        }

        public updateHeading() {
            document.querySelectorAll<HTMLHeadingElement>('article>h1,article>h2,article>h3,article>h4,article>h5,article>h6').forEach((h) => {
                let link = h.querySelector('.heading-link');
                if (!link) {
                    link = document.createElement('a');
                    link.classList.add('heading-link');
                    h.append(link);
                }
                link.addEventListener('click', () => {
                    this.smoothScroll.animateScroll(h.offsetTop - 10);
                });
            });
        }

        public updateFootnote() {
            document.querySelectorAll<HTMLLinkElement>('article .footnote-backref').forEach((backref, i) => {
                const fnref = document.getElementById(`fnref${i + 1}`);
                if (fnref) {
                    fnref.addEventListener('click', (e) => {
                        e.preventDefault();
                        this.smoothScroll.animateScroll(backref.offsetTop - 10);
                    });
                    fnref.removeAttribute('href');
                    backref.addEventListener('click', (e) => {
                        e.preventDefault();
                        this.smoothScroll.animateScroll(fnref.offsetTop - 10);
                    });
                    backref.removeAttribute('href');
                }
            });
        }

        public updateImagePath() {
            document.querySelectorAll<HTMLImageElement>('article img').forEach((img) => {
                let parent = img.parentElement!;
                if (parent.tagName === 'A') {
                    parent = parent.parentElement!;
                }
                const src = img.getAttribute('src')!;
                const match = src.match(/#(.+)$/);
                if (match) {
                    const width = parseInt(match[1], 0);
                    if (isNaN(width)) {
                        if (match[1].startsWith('.')) {
                            match[1].substr(1).split('.').forEach((cls) => {
                                cls = cls.trim();
                                if (['hidden', 'left', 'right'].includes(cls)) {
                                    parent.classList.add(cls);
                                } else {
                                    img.classList.add(cls);
                                }
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

                let loadings = parent.previousElementSibling;
                if (!parent.classList.contains('hidden') || (loadings && loadings.classList.contains('lds-ellipsis'))) {
                    parent.classList.add('hidden');
                    if (!loadings || !loadings.classList.contains('lds-ellipsis')) {
                        loadings = document.createElement('div');
                        loadings.classList.add('lds-ellipsis');
                        for (let i = 0; i < 4; i++) {
                            loadings.append(document.createElement('div'));
                        }
                        parent.parentElement!.insertBefore(loadings, parent);
                    }
                    if (img.naturalWidth === 0) {
                        img.onload = () => {
                            parent.classList.remove('hidden');
                            loadings!.remove();
                        };
                    } else {
                        parent.classList.remove('hidden');
                        loadings.remove();
                    }
                }

                if (parent.tagName === 'DT') {
                    parent.parentElement!.classList.add('center');
                } else {
                    if (parent.parentElement!.tagName !== 'BLOCKQUOTE') {
                        parent.classList.add('center');
                    }
                }
            });
        }

        public updateTextCount() {
            const textCount = document.querySelector<HTMLElement>('#text-count');
            if (textCount) {
                let count = 0;
                document.querySelectorAll('article > *:not(#toc):not(pre)').forEach((element) => {
                    if (element.textContent) {
                        count += element.textContent.replace(/\s/g, '').length;
                    }
                });
                const countStr = count.toString();
                const countList = [];
                let start = 0;
                for (let i = Math.floor(countStr.length / 3); i >= 0; i--) {
                    const end = countStr.length - i * 3;
                    if (end === 0) {
                        continue;
                    }
                    countList.push(countStr.substring(start, end));
                    start = end;
                }
                textCount.innerHTML = countList.join(',');
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
                    const params: { [index: string]: string } = {};
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
                                    line = line.replace(m[0], result.replace(/\\n/g, '\n'));
                                });
                                return line;
                            }
                            return line;
                        }).join('\n');
                        // 规避递归节点重复问题。
                        try {
                            a.parentElement!.outerHTML = this.renderMD(data, true);
                        } catch (e) {
                            return;
                        }
                        this.updateDD();
                        this.updateTable();
                        this.updateImagePath();
                        this.updateTextCount();
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
                } else if (href.startsWith('http://') || href.startsWith('https://')) {
                    // noinspection JSDeprecatedSymbols
                    a.target = '_blank';
                    a.rel = 'noopener noreferrer';
                }
            });
        }

        public updateIndexList() {
            document.querySelectorAll('article ul:not(.toc)').forEach((ul) => {
                const lis: Array<{ node: HTMLLIElement, time: number }> = [];
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

        public updateCategoryListActual(pageData: string) {
            const list = getListFromData(pageData);
            if (list.length > 0) {
                const tagDict: { [index: string]: string[] } = {};
                list.forEach((item) => {
                    item.tags.forEach((tag) => {
                        if (tagDict[tag] === undefined) {
                            tagDict[tag] = [];
                        }
                        tagDict[tag].push(`- [${item.title}](${item.href})`);
                    });
                });
                this.syncData = this.syncData.replace('[list]', Object.keys(tagDict).sort().map((key) => {
                    const count = `<span class="count">（${tagDict[key].length}）</span>`;
                    return `###### ${key}${count}\n\n${tagDict[key].join('\n')}`;
                }).join('\n\n'));
                setTimeout(() => {
                    this.updateToc();
                    this.updateHeading();
                    this.updateLinkPath();
                    this.updateIndexList();
                    this.updateTextCount();
                    document.querySelectorAll('#toc li > a').forEach((a) => {
                        const count = a.querySelector('span.count');
                        if (count) {
                            a.removeChild(count);
                            a.parentElement!.append(count);
                        }
                    });
                }, 0);
            }
        }

        public updateCategoryList() {
            getIndexFileData(this.updateCategoryListActual);
        }

        public updateSearchListActual(pageData: string) {
            const queryContent = this.params.content ? decodeURIComponent(this.params.content) : '';
            const resultUl = document.querySelector('ul#result')!;
            const list = getListFromData(pageData);
            if (list.length > 0) {
                const header = document.querySelector('header')!;
                let count = 0;
                list.forEach((item) => {
                    axios.get(item.href).then((response) => {
                        const data = response.data as string;
                        if (data.toLowerCase().indexOf(queryContent.toLowerCase()) >= 0) {
                            const li = document.createElement('li');
                            const a = document.createElement('a');
                            a.href = item.href;
                            a.innerText = item.title;
                            li.append(a);
                            const results = [''];
                            const regexp = new RegExp(queryContent, 'ig');
                            let match;
                            while ((match = regexp.exec(data)) !== null) {
                                results.push(data.substring(match.index - 10, match.index) +
                                    `<span style="color: red">${match[0]}</span>` +
                                    data.substring(match.index + match[0].length, regexp.lastIndex + 10));
                            }
                            results.push('');
                            const blockquote = document.createElement('blockquote');
                            const p = document.createElement('p');
                            p.innerHTML = `${results.join('......')}`;
                            blockquote.append(p);
                            li.append(blockquote);
                            resultUl.append(li);
                            this.updateLinkPath();
                            this.updateIndexList();
                            this.updateTextCount();
                        }
                    }).finally(() => {
                        if (++count === list.length) {
                            header.innerText = 'Search done';
                        } else {
                            header.innerText = `Searching...(${count}/${list.length})`;
                        }
                    });
                });
            }
        }

        public updateSearchList() {
            const queryContent = this.params.content ? decodeURIComponent(this.params.content) : '';
            const resultUl = document.querySelector('ul#result');
            const searchInput = document.querySelector('input#search-input') as HTMLInputElement | null;
            if (searchInput) {
                searchInput.value = queryContent;
                searchInput.addEventListener('keyup', (event) => {
                    if (event.key === 'Enter') {
                        event.preventDefault();
                        searchInput.value = searchInput.value.trim();
                        const param = searchInput.value ? `?content=${encodeURIComponent(searchInput.value)}` : '';
                        const indexOf = location.href.indexOf('?');
                        location.href = ((indexOf >= 0) ? location.href.substring(0, indexOf) : location.href) + param;
                    }
                });
            }
            if (queryContent && resultUl) {
                getIndexFileData(this.updateSearchListActual);
            }
        }

        public get markdown() {
            return this.renderMD(this.syncData);
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

        a
            color #287BDE !important
            text-decoration none !important
            cursor pointer !important

            &:hover
                text-decoration underline !important

        hr
            height 1px
            background-color transparent
            border-bottom 1px solid lightgray

        h1, h2
            border-bottom-color lightgray
            padding-bottom 8px

        p.left
            float left
            margin-right 16px

        p.right
            float right
            margin-left 16px

        p.left, p.right
            margin-bottom 0

            @media screen and (max-width: 750px)
                float none
                margin-right 0
                margin-left 0
                margin-bottom 16px

        img
            margin-top 8px
            background-color transparent

            for i in 1..6
                {'&.w' + i * 100}
                    width 100%
                    max-width i * 100px

            for i in 1..5
                {'&.h' + i * 100}
                    height i * 100px

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
                    margin-right 8px

                + dd
                    margin-top -16px

            &.center dd:before
                content none

        pre
            background-color #2b2b2b

        blockquote
            margin 24px 0
            padding 0 32px
            border-left none
            position relative

            &:before
                font-family Arial
                content '“'
                font-size 4em
                position absolute
                top -32px
                left 0

        kbd
            margin-bottom 3px

        table
            thead tr
                border-bottom 2px solid #c6cbd1

            tr
                border-top none

            tr + tr
                border-top 1px solid #c6cbd1

            tr, tr:nth-child(2n)
                background-color transparent

            td, th
                border none

            th
                text-align left

        details
            overflow auto
            margin 24px 0
            padding 0 16px
            box-shadow 0 2px 2px 0 rgba(0, 0, 0, 0.14), 0 1px 5px 0 rgba(0, 0, 0, 0.12), 0 3px 1px -2px rgba(0, 0, 0, 0.2)
            border-radius 3px
            border-left 6px solid rgba(68, 138, 255, 0.5)

            ::-webkit-details-marker
                display none

            ::-moz-list-bullet
                font-size 0

            summary
                outline none
                margin 0 -16px
                padding 6px 16px
                background-color rgba(68, 138, 255, 0.1)

                h1, h2
                    border-bottom none
                    padding-bottom 0

                h1, h2, h3, h4, h5, h6
                    display inline

                + *
                    margin-top 16px

                &:after
                    content '▲'
                    float right
                    font-size 13px
                    color rgba(68, 138, 255, 0.5)

            &:not([open])
                summary:after
                    content '▼'

            &.readonly summary
                pointer-events none

                &:after
                    content none

            &.empty summary
                display none

            &.success
                border-left-color rgba(0, 200, 83, 0.5)

                summary
                    background-color rgba(0, 200, 83, 0.1)

                    &:after
                        color rgba(0, 200, 83, 0.5)

            &.warning
                border-left-color rgba(255, 145, 0, 0.5)

                summary
                    background-color rgba(255, 145, 0, 0.1)

                    &:after
                        color rgba(255, 145, 0, 0.5)

            &.danger
                border-left-color rgba(255, 23, 68, 0.5)

                summary
                    background-color rgba(255, 23, 68, 0.1)

                    &:after
                        color rgba(255, 23, 68, 0.5)

        #toc
            font-size 13px
            margin-bottom 16px

            .ul-a, .ul-b
                display inline-table
                max-width 348px

                @media screen and (max-width: 750px)
                    max-width none
                    width 100%

            .ul-a
                margin-bottom .25em

            .ul-b
                margin-bottom 0

        .footnotes
            font-size 13px
            color gray

            ol
                margin-top -8px
                margin-bottom -16px

                li + li p
                    margin-top 0

            .footnote-backref
                font-family -apple-system, BlinkMacSystemFont, Segoe UI, Helvetica, Arial, sans-serif, Segoe UI Symbol

        .center
            text-align center

        .hidden
            display none

        .count:before
            content '-'
            margin-left 8px

        h1, h2, h3, h4, h5, h6
            &:hover
                .heading-link
                    opacity 1

        .heading-link
            opacity 0
            transition opacity 0.5s

            &:before
                content '#'
                margin-left 0.3em
                cursor pointer

        div.code-toolbar > .toolbar
            .toolbar-item + .toolbar-item
                margin-left 3px

            button
                cursor pointer
                outline none

            button, span
                color darkgray
                transition color 0.5s

                &:hover
                    color lightgray

    .index
        ul.toc.tags
            padding-left 0

            li
                display inline

                + li:before
                    content '|'
                    margin-right 12px

        ul:not(.toc)
            padding-left 0

            li
                list-style none
                overflow hidden
                text-overflow ellipsis
                white-space nowrap

                &:before
                    content '»'
                    margin-right 8px

                blockquote
                    font-style normal
                    margin 0
                    padding-left 16px
                    padding-right 0
                    white-space normal
                    font-size 13px

                    &:before
                        content none

                code
                    color darkgray
                    background-color transparent !important
                    padding 0
                    font-size 12px
                    font-family -apple-system, BlinkMacSystemFont, Segoe UI, Helvetica, Arial, sans-serif, Apple Color Emoji, Segoe UI Emoji, Segoe UI Symbol

                    &:before
                        content '#'
                        margin-right 2px

                .date
                    margin-left 8px

            .more
                font-size 13px
                color darkgray
                border-top 1px dashed
                margin-top 16px
                height 8px

                span
                    background-color #f1f1f1
                    transition background-color 0.5s, color 0.5s
                    position relative
                    top -16px
                    padding-right 8px
                    cursor pointer

                    &:hover
                        color gray

                    &:before
                        content '#'
                        margin-right 2px

        #search-input
            width 100%
            background-color transparent
            border none
            outline none

    .lds-ellipsis
        position relative
        width 50px
        height 100px
        margin 0 auto

        div
            position absolute
            top 45px
            width 10px
            height 10px
            border-radius 50%
            background-color darkgray
            animation-timing-function cubic-bezier(0, 1, 1, 0)

            &:nth-child(1)
                animation lds-ellipsis1 1s infinite

            &:nth-child(2)
                animation lds-ellipsis2 1s infinite

            &:nth-child(3)
                left 20px
                animation lds-ellipsis2 1s infinite

            &:nth-child(4)
                left 40px
                animation lds-ellipsis3 1s infinite

            @keyframes lds-ellipsis1
                from
                    transform scale(0)
                to
                    transform scale(1)

            @keyframes lds-ellipsis2
                from
                    transform translate(0, 0)
                to
                    transform translate(20px, 0)

            @keyframes lds-ellipsis3
                from
                    transform scale(1)
                to
                    transform scale(0)
</style>
