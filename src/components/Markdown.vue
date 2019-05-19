<template>
    <article class="markdown-body" :class="{index: isIndex}" v-html="markdown"></article>
</template>

<script lang="ts">
    import {Component, Prop, Vue} from 'vue-property-decorator';
    import MarkdownIt from 'markdown-it';
    import Prism from 'prismjs';
    import {getDate} from '@/utils';

    @Component
    export default class Markdown extends Vue {
        @Prop() public data!: string;
        @Prop() public isIndex!: boolean;

        // noinspection JSUnusedGlobalSymbols
        public markdownIt = new MarkdownIt({
            html: true,
            breaks: true,
            linkify: false,
            highlight(str, lang) {
                if (lang && Prism.languages[lang]) {
                    return Prism.highlight(str, Prism.languages[lang], lang);
                }
                return '';
            },
        }).use(require('markdown-it-sub')).use(require('markdown-it-sup')).use(require('markdown-it-footnote'))
            .use(require('markdown-it-deflist')).use(require('markdown-it-abbr')).use(require('markdown-it-emoji'))
            .use(require('markdown-it-ins')).use(require('markdown-it-mark'));

        // noinspection JSUnusedGlobalSymbols
        public mounted() {
            // 规避 mount 后仍然可以查询到旧节点的问题。
            setTimeout(() => {
                this.updateFootnote();
                this.updateLinkPath();
                if (this.isIndex) {
                    this.updateIndexList();
                }
            }, 0);
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

        public updateLinkPath() {
            document.querySelectorAll('a').forEach((a) => {
                if (a.href.endsWith('#')) {
                    a.href = '#' + new URL(a.href).pathname;
                }
            });
        }

        public setTitle() {
            document.title = this.data.startsWith('# ') ? this.data.split('\n')[0].substr(2).trim() :
                this.$route.params.pathMatch.substr(1);
        }

        // noinspection JSUnusedGlobalSymbols
        public get markdown() {
            this.setTitle();
            return this.markdownIt.render(this.data);
        }
    }
</script>

<style>@import '~github-markdown-css/github-markdown.css';</style>

<style lang="stylus">
    .markdown-body
        line-height 2
        color #4a4a4a

        h1, h2, h3, h4, h5, h6
            color #24292e

        h1, h2
            border-bottom 1px solid #e4e4e4

        mark
            border-radius 3px
            background-color rgba(255, 235, 59, 0.5)
            box-shadow 0.25em 0 0 rgba(255, 235, 59, 0.5), -0.25em 0 0 rgba(255, 235, 59, 0.5)

        dl
            dt
                font-style normal
                font-weight normal

            dd
                color dimgray
                padding 0
                font-size 14px

                &:before
                    content '»'
                    margin-right 8px

        .footnote-ref > a, a.footnote-backref
            color #0366d6
            text-decoration none
            cursor pointer

            &:hover
                text-decoration underline

        .footnotes-sep
            margin-bottom 16px

        .footnotes
            font-size 14px
            color dimgray

            &:before
                content 'Footnotes:'

            ol
                margin-bottom -12px

            .footnote-backref
                font-family serif

        .token.operator, .token.entity, .token.url, .language-css .token.string, .style .token.string
            background none

    .index
        ul
            padding-left 0

            li
                list-style none

                &:before
                    content '»'
                    padding-right 8px
</style>
