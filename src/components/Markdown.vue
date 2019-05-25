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
            this.markdownIt.linkify.tlds();
        }

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

        pre
            background-color #2d2d2d

        .footnote-ref > a, a.footnote-backref
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
