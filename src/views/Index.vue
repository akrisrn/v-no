<template>
    <div>
        <div :class="{hidden: !isCoverShow}" id="header">
            <div :class="{hidden: !isCoverShow}" id="cover" v-if="cover">
                <div :style="{backgroundImage: `url(${cover})`}"></div>
            </div>
            <transition name="slide-fade">
                <header :class="{float: isHeaderFloat}" v-if="show">{{ title }}</header>
            </transition>
        </div>
        <transition name="slide-fade">
            <main :class="{error: isError}" v-if="show">
                <!--suppress JSUnresolvedVariable -->
                <Article :data="data" :isCategory="isCategory" :isIndex="isIndex" :setCover="setCover"
                         @update:data="data = $event">
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
        public title = '';
        public isCoverShow = true;
        public isHeaderFloat = false;
        public isError = false;

        public beforeRouteUpdate(to: any, from: any, next: any) {
            next();
            if (!this.cover) {
                this.cover = ' ';
            }
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

        // noinspection JSUnusedGlobalSymbols
        public mounted() {
            window.addEventListener('scroll', () => {
                const coverDiv = document.querySelector<HTMLDivElement>('#cover div');
                if (coverDiv) {
                    coverDiv.style.backgroundPositionY = -(window.scrollY < 0 ? 0 : window.scrollY) + 'px';
                }
            });
        }

        // noinspection JSUnusedGlobalSymbols
        public setCover(url: string) {
            if (url === '') {
                this.isCoverShow = false;
                this.isHeaderFloat = false;
            } else {
                this.isCoverShow = true;
                this.isHeaderFloat = true;
                this.cover = url;
            }
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
        transition all 0.5s !important

    .slide-fade-leave-active
        transition all 1s cubic-bezier(1.0, 0.5, 0.8, 1.0) !important

    .slide-fade-enter, .slide-fade-leave-to
        transform translateY(10px) !important
        opacity 0 !important

    #header
        height 250px
        transition height 1s

        &.hidden
            height 120px

            header
                max-width 700px
                margin 0 auto

            + main
                margin-top 0
                padding-top 24px
                border-top 3px double darkgray

        @media screen and (max-width: 750px)
            height 150px

        #cover
            width 100%
            height 250px
            background-color darkgray
            overflow hidden
            position absolute
            transition height 1s

            &.hidden
                height 0

            div
                height 100%
                filter brightness(0.8) opacity(0.8) blur(3px)
                background-size 100%
                transform scale(1.1)

            @media screen and (max-width: 750px)
                height 150px

        header
            padding 0 24px
            color #4a4a4a
            font-family -apple-system, BlinkMacSystemFont, Segoe UI, Helvetica, Arial, sans-serif, Apple Color Emoji, Segoe UI Emoji, Segoe UI Symbol
            font-size 30px
            font-weight bold
            text-align center
            position relative
            top 50%
            transform translateY(-50%)

            &.float
                color #f1f1f1
                font-size 40px
                text-shadow 3px 3px 3px #1e1e1e
                transition font-size 1s

                @media screen and (max-width: 750px)
                    font-size 30px

    main
        max-width 700px
        margin 24px auto

        @media screen and (max-width: 750px)
            margin-left 16px
            margin-right 16px

        footer
            margin-top 16px
            padding-top 8px
            border-top 1px solid lightgray

            a.home:before
                font-family sans-serif
                content '« '

        .date
            float right
            color darkgray
</style>
