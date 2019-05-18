<template>
    <article class="markdown-body" v-html="markdown"></article>
</template>

<script lang="ts">
    import {Component, Prop, Vue} from 'vue-property-decorator';
    import MarkdownIt from 'markdown-it';
    import hljs from 'highlight.js';

    @Component
    export default class Markdown extends Vue {
        @Prop() public data!: string;

        // noinspection JSUnusedGlobalSymbols
        public markdownIt = new MarkdownIt({
            html: true,
            breaks: true,
            linkify: true,
            highlight(str, lang) {
                if (lang && hljs.getLanguage(lang)) {
                    return hljs.highlight(lang, str).value;
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

        public setTitle() {
            document.title = this.data.startsWith('# ') ? this.data.split('\n')[0].substr(2).trim() :
                this.$route.params.pathMatch.substr(1);
        }

        public get markdown() {
            this.setTitle();
            return this.markdownIt.render(this.data);
        }
    }
</script>

<style>@import '~github-markdown-css/github-markdown.css';</style>
<style>@import '~highlight.js/styles/idea.css';</style>

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
                margin-bottom -8px

            .footnote-backref
                font-family serif
</style>
