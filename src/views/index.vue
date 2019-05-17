<template>
    <main>
        <article class="markdown-body" v-html="markdown"></article>
    </main>
</template>

<script lang="ts">
    import {Component, Vue, Watch} from 'vue-property-decorator';
    import axios from 'axios';
    import MarkdownIt from 'markdown-it';
    import hljs from 'highlight.js';
    import resource from '@/resource';
    import {error2markdown} from '@/utils';
    // @ts-ignore
    // noinspection TypeScriptPreferShortImport
    import {ALLOWED_SUFFIXES} from '../../app.config.js';

    // noinspection JSUnusedGlobalSymbols
    @Component
    export default class Index extends Vue {
        public static isAllowedRender(path: string) {
            for (const allowedSuffix of ALLOWED_SUFFIXES) {
                if (path.endsWith(allowedSuffix)) {
                    return true;
                }
            }
            return false;
        }

        public markdown = '';
        // noinspection JSUnusedGlobalSymbols
        public markdownIt = new MarkdownIt({
            highlight(str, lang) {
                if (lang && hljs.getLanguage(lang)) {
                    return hljs.highlight(lang, str).value;
                }
                return '';
            },
            linkify: true,
        });

        // noinspection JSUnusedLocalSymbols
        @Watch('$route')
        public onRouteChanged(to: any, from: any) {
            this.updateMarkdown(to.path);
        }

        // noinspection JSUnusedGlobalSymbols
        public created() {
            this.updateMarkdown(this.$route.params.pathMatch);
        }

        public setTitle(data: string) {
            document.title = data.startsWith('# ') ? data.split('\n')[0].substr(2).trim() :
                this.$route.params.pathMatch.substr(1);
            return data;
        }

        public setMarkdown(data: string) {
            this.markdown = this.markdownIt.render(this.setTitle(data));
        }

        public updateMarkdown(path: string) {
            if (Index.isAllowedRender(path)) {
                axios.get(path).then((response) => {
                    this.setMarkdown(response.data);
                }).catch((error) => {
                    this.setMarkdown(error2markdown(error));
                });
            } else {
                this.setMarkdown(resource.notAllowedRender);
            }
        }
    }
</script>

<style>@import '~github-markdown-css/github-markdown.css';</style>
<style>@import '~highlight.js/styles/github.css';</style>

<style lang="stylus">
    main
        max-width 700px
        margin 24px auto

    .markdown-body
        line-height 2
        color #4a4a4a

        h1, h2, h3, h4, h5, h6
            color #24292e
</style>
