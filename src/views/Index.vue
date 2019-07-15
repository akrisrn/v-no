<template>
    <transition name="slide-fade">
        <main :class="{error: isError}" v-if="show">
            <header>{{ title }}</header>
            <!--suppress JSUnresolvedVariable -->
            <Article :data="data" :isCategory="isCategory" :isIndex="isIndex" @update:data="data = $event"></Article>
            <footer v-if="!isIndex || isCategory">
                <a class="home" v-on:click="returnHome">Return to home</a>
                <span class="date" v-if="!isError">{{ date }}</span>
            </footer>
        </main>
    </transition>
</template>

<script lang="ts">
    import Article from '@/components/Article.vue';
    import {error2markdown, getDateString, getWrapRegExp} from '@/utils';
    import axios from 'axios';
    import {Component, Vue, Watch} from 'vue-property-decorator';

    Component.registerHooks([
        'beforeRouteUpdate',
    ]);

    // noinspection JSUnusedGlobalSymbols
    @Component({components: {Article}})
    export default class Index extends Vue {
        public show = false;
        public data = '';
        public title = '';
        public isError = false;

        public beforeRouteUpdate(to: any, from: any, next: any) {
            next();
            this.show = false;
            this.updateData();
        }

        @Watch('show')
        public onShowChanged() {
            if (this.show) {
                window.scrollTo(0, 0);
            }
        }

        // noinspection JSUnusedGlobalSymbols
        public created() {
            this.updateData();
        }

        public returnHome() {
            let home = '/';
            if (this.isIndexPath) {
                home += process.env.VUE_APP_INDEX_PATH;
            }
            this.$router.push(home);
        }

        public setTitle() {
            const titleMatch = this.data.match(getWrapRegExp('^#', '\n'));
            if (titleMatch) {
                this.title = titleMatch[1];
                this.data = this.data.replace(titleMatch[0], '');
            } else {
                this.title = this.path.substr(1);
            }
            if (!document.title) {
                document.title = this.title;
            }
        }

        public setData(data: string) {
            this.show = true;
            this.data = data;
            this.setTitle();
        }

        public updateData() {
            if (this.path.endsWith('.md')) {
                axios.get(this.path).then((response) => {
                    this.setData(response.data);
                }).catch((error) => {
                    this.isError = true;
                    this.setData(error2markdown(error));
                });
            } else {
                this.isError = true;
                this.setData(error2markdown({
                    response: {
                        status: 404,
                        statusText: 'Not Found',
                    },
                } as any));
            }
        }

        public get path() {
            let path = this.$route.path;
            const hash = this.$route.hash;
            if (this.isIndexPath) {
                path = '/';
            }
            if (path === '/') {
                if (hash.startsWith('#/')) {
                    path = hash.substr(1);
                    if (path !== '/') {
                        return path;
                    }
                }
                return '/' + process.env.VUE_APP_INDEX_FILE;
            }
            if (path.endsWith('.html')) {
                return path.replace(/\.html$/, '.md');
            }
            return path;
        }

        public get isIndexPath() {
            return this.$route.path === '/' + process.env.VUE_APP_INDEX_PATH;
        }

        public get isIndex() {
            return [process.env.VUE_APP_INDEX_FILE, process.env.VUE_APP_CATEGORY_FILE].includes(this.path.substr(1));
        }

        public get isCategory() {
            return this.path.substr(1) === process.env.VUE_APP_CATEGORY_FILE;
        }

        public get date() {
            return getDateString(this.path);
        }
    }
</script>

<style lang="stylus">
    .slide-fade-enter-active
        transition all .3s ease

    .slide-fade-leave-active
        transition all .8s cubic-bezier(1.0, 0.5, 0.8, 1.0)

    .slide-fade-enter, .slide-fade-leave-to
        transform translateX(10px)
        opacity 0

    md-font-family = -apple-system, BlinkMacSystemFont, Segoe UI, Helvetica, Arial, sans-serif, Apple Color Emoji, Segoe UI Emoji, Segoe UI Symbol

    body
        margin 0

    main
        max-width 700px
        margin 24px auto

        @media screen and (max-width: 750px)
            margin-left 16px
            margin-right 16px

        header
            color #24292e
            font-family md-font-family
            font-size 30px
            font-weight 600
            line-height 1.25
            margin-bottom 16px
            padding-bottom 8px
            border-bottom 1px solid #e4e4e4

        footer
            font-family md-font-family
            font-size 15px
            line-height 2
            margin-top 16px
            padding-top 8px
            border-top 1px solid #e4e4e4

            a.home
                color #0366d6
                text-decoration none
                cursor pointer

                &:before
                    content '« '
                    font-family sans-serif

                &:hover
                    text-decoration underline

        .date
            float right
            color darkgray
</style>
