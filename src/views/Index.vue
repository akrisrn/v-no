<template>
    <div>
        <div :class="{hide: !isCoverShow}" :style="{backgroundImage: `url(${cover})`}" id="cover" v-if="cover"></div>
        <transition name="slide-fade">
            <main :class="{error: isError}" v-if="show">
                <header><img :src="icon" alt id="icon" v-if="icon"/>{{ title }}</header>
                <!--suppress JSUnresolvedVariable -->
                <Article :data="data" :isCategory="isCategory" :isIndex="isIndex" :setCover="setCover"
                         :setIcon="setIcon" @update:data="data = $event">
                </Article>
                <footer class="markdown-body" v-if="!isIndex || isCategory">
                    <a class="home" href="/" v-on:click.prevent="returnHome">Return to home</a>
                    <span class="date" v-if="!isError">{{ date }}</span>
                </footer>
            </main>
        </transition>
    </div>
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
        public cover = '';
        public isCoverShow = true;
        public icon = '';
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

        public setCover(url: string) {
            if (url === '') {
                this.isCoverShow = false;
            } else {
                this.isCoverShow = true;
                this.cover = url;
            }
        }

        public setIcon(url: string) {
            this.icon = url;
        }

        public returnHome() {
            let home = '/';
            if (this.isIndexPath) {
                let indexPath = process.env.VUE_APP_INDEX_PATH;
                if (indexPath.endsWith('index.html')) {
                    indexPath = indexPath.replace(/index\.html$/, '');
                }
                home += indexPath;
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
            document.title = this.title;
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
            let path = this.$route.path;
            if (path.endsWith('/')) {
                path += 'index.html';
            }
            return path === '/' + process.env.VUE_APP_INDEX_PATH;
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

    body
        margin 0

    main
        max-width 700px
        margin 24px auto

        @media screen and (max-width: 750px)
            margin-left 16px
            margin-right 16px

        header
            color #4a4a4a
            font-family -apple-system, BlinkMacSystemFont, Segoe UI, Helvetica, Arial, sans-serif, Apple Color Emoji, Segoe UI Emoji, Segoe UI Symbol
            font-size 30px
            font-weight 600
            text-align center
            margin-bottom 24px

        footer
            margin-top 16px
            padding-top 8px
            border-top 1px solid #e4e4e4

            a.home:before
                content '« '
                font-family sans-serif

        .date
            float right
            color darkgray

    #cover
        height 250px
        background-color white
        background-size 100%
        background-attachment fixed
        box-shadow 0 2px 2px 0 rgba(0, 0, 0, 0.14), 0 1px 5px 0 rgba(0, 0, 0, 0.12), 0 3px 1px -2px rgba(0, 0, 0, 0.2)
        transition height 1s ease

        &.hide
            height 0

        @media screen and (max-width: 750px)
            height 150px

    #icon
        height 40px
        margin-right 16px
</style>
