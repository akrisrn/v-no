<template>
    <div>
        <transition name="slide-fade">
            <main :class="{error: isError}" v-if="isShow">
                <div class="markdown-body" id="bar" v-if="!isError">
                    <code class="item-date" v-if="date">{{ date }}</code>
                    <code class="item-author">{{ author }}</code>
                    <code class="item-tag" v-for="tag in tags">{{ tag }}</code>
                    <code class="item-count"><span id="text-count"></span></code>
                    <code class="item-raw"><a :href="path" target="_blank">Raw</a></code>
                </div>
                <header>{{ title }}</header>
                <!--suppress JSUnresolvedVariable -->
                <Article :data="data" :isCategory="isCategory" :isIndex="isIndex"
                         :smoothScroll="smoothScroll" @update:data="data = $event">
                </Article>
                <footer class="markdown-body" v-if="!isIndex || isCategory || isArchive">
                    <a @click.prevent="returnHome" class="home" href="/">Return to home</a>
                    <span class="date" v-if="!isError">{{ date }}</span>
                </footer>
            </main>
        </transition>
        <span id="toggle-dark">★</span>
        <span id="to-top">〒</span>
    </div>
</template>

<script lang="ts">
    import Article from '@/components/Article.vue';
    import {error2markdown, getDateString, getWrapRegExp} from '@/utils';
    import axios from 'axios';
    import SmoothScroll from 'smooth-scroll';
    import {Component, Vue, Watch} from 'vue-property-decorator';

    Component.registerHooks([
        'beforeRouteUpdate',
    ]);

    @Component({components: {Article}})
    export default class Index extends Vue {
        public data = '';
        public title = '';
        public author = '';
        public tags: string[] = [];
        public isShow = false;
        public isError = false;
        public isDark = false;
        public smoothScroll = new SmoothScroll();
        public toggleDark: HTMLElement | null = null;
        public toTop: HTMLElement | null = null;
        public keyInput = '';
        public inputBinds: { [index: string]: () => void } = {};

        public beforeRouteUpdate(to: any, from: any, next: () => void) {
            next();
            this.isShow = false;
            this.updateData();
        }

        @Watch('isShow')
        public onIsShowChanged() {
            if (this.isShow) {
                this.scrollToTop(false);
            }
        }

        @Watch('isDark')
        public onIsDarkChanged() {
            const metaThemeColor = document.querySelector('meta[name=theme-color]')!;
            if (this.isDark) {
                metaThemeColor.setAttribute('content', '#2b2b2b');
                this.toggleDark!.innerText = '☆';
                this.toggleDark!.classList.add('dark');
                this.toTop!.classList.add('dark');
                document.body.classList.add('dark');
                localStorage.setItem('dark', String(true));
            } else {
                metaThemeColor.setAttribute('content', '#efefef');
                this.toggleDark!.innerText = '★';
                this.toggleDark!.classList.remove('dark');
                this.toTop!.classList.remove('dark');
                document.body.classList.remove('dark');
                localStorage.removeItem('dark');
            }
        }

        // noinspection JSUnusedGlobalSymbols
        public created() {
            // @ts-ignore
            window.addInputBind = this.addInputBind;
            this.addInputBind('home', () => {
                if (document.querySelector('.prerender')) {
                    location.href = '/';
                } else {
                    this.returnHome();
                }
            });
            this.addInputBind('gg', () => {
                this.smoothScroll.animateScroll(document.body.offsetHeight);
                this.keyInput += '_';
            });
            this.addInputBind('G', () => {
                this.smoothScroll.animateScroll(0);
            });
            this.addInputBind('dark', () => {
                this.isDark = !this.isDark;
            });
            this.addInputBind('Backspace', () => {
                this.keyInput = this.keyInput.replace(/.?Backspace$/, '');
            });
            this.isDark = !!localStorage.getItem('dark');
            this.updateData();
        }

        // noinspection JSUnusedGlobalSymbols
        public mounted() {
            addEventListener('keydown', (event) => {
                this.keyInput += event.key;
                for (const key of Object.keys(this.inputBinds)) {
                    if (this.keyInput.endsWith(key)) {
                        this.inputBinds[key]();
                        break;
                    }
                }
            });
            this.toggleDark = document.querySelector<HTMLElement>('#toggle-dark')!;
            this.toggleDark.addEventListener('click', () => {
                this.isDark = !this.isDark;
            });
            this.toTop = document.querySelector<HTMLElement>('#to-top')!;
            this.toTop.addEventListener('click', () => {
                this.scrollToTop();
            });
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

        public setFlag(data: string, flag: string, onMatch?: (match: string) => void, onNotMatch?: () => void,
                       onDone?: () => void) {
            const match = data.match(getWrapRegExp(flag, '\n'));
            if (match) {
                if (onMatch) {
                    onMatch(match[1]);
                }
                data = data.replace(match[0], '');
            } else {
                if (onNotMatch) {
                    onNotMatch();
                }
            }
            if (onDone) {
                onDone();
            }
            return data;
        }

        public setTitle(data: string) {
            return this.setFlag(data, '^#', (match) => {
                this.title = match;
            }, () => {
                this.title = this.path.substr(1);
            }, () => {
                document.title = this.title;
            });
        }

        public setAuthor(data: string) {
            return this.setFlag(data, '@author:', (match) => {
                this.author = match;
            }, () => {
                this.author = process.env.VUE_APP_AUTHOR;
            });
        }

        public setTags(data: string) {
            return this.setFlag(data, '@tags:', (match) => {
                this.tags = match.split(/\s*[,，]\s*/);
            }, () => {
                this.tags = [];
            });
        }

        public setData(data: string) {
            this.isShow = true;
            this.data = this.setTitle(data);
        }

        public updateData() {
            if (this.path.endsWith('.md')) {
                axios.get(this.path).then((response) => {
                    this.isError = false;
                    this.setData(this.setTags(this.setAuthor(response.data)));
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

        // noinspection JSMethodCanBeStatic
        public scrollToTop(isSmooth = true) {
            if (isSmooth) {
                this.smoothScroll.animateScroll(0);
            } else {
                scrollTo(0, 0);
            }
        }

        public addInputBind(input: string, bind: () => void) {
            this.inputBinds[input] = bind;
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
                        if (path.endsWith('/')) {
                            path += 'index.md';
                        }
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
            return [process.env.VUE_APP_INDEX_FILE, process.env.VUE_APP_CATEGORY_FILE,
                process.env.VUE_APP_ARCHIVE_FILE].includes(this.path.substr(1));
        }

        public get isCategory() {
            return this.path.substr(1) === process.env.VUE_APP_CATEGORY_FILE;
        }

        public get isArchive() {
            return this.path.substr(1) === process.env.VUE_APP_ARCHIVE_FILE;
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

    main
        max-width 700px
        margin 32px auto
        transition margin 0.5s

        @media screen and (max-width: 750px)
            margin 16px

        header
            color #4a4a4a
            font-family -apple-system, BlinkMacSystemFont, Segoe UI, Helvetica, Arial, sans-serif, Apple Color Emoji, Segoe UI Emoji, Segoe UI Symbol
            font-size 32px
            font-weight 600
            margin 12px 0 16px
            padding-bottom 12px
            border-bottom 1px solid lightgray

        footer
            margin-top 16px
            padding-top 8px
            border-top 1px solid lightgray

            a.home:before
                content '« '

        .date
            float right
            color darkgray

        #bar
            code
                display inline-block
                font-size 12px
                padding-top 0
                padding-bottom 0
                margin-right 8px

                &.item-date
                    background-color rgba(68, 138, 255, 0.1)

                &.item-author
                    background-color rgba(0, 200, 83, 0.1)

                    &:before
                        content '@'
                        margin-right 2px

                &.item-tag
                    background-color rgba(255, 145, 0, 0.1)

                    &:before
                        content '#'
                        margin-right 2px

                &.item-count
                    background-color rgba(255, 23, 68, 0.1)

                    &:after
                        content 'W'
                        margin-left 2px

    #toggle-dark, #to-top
        position fixed
        right 16px
        cursor pointer
        font-size 20px
        color transparent
        transition color 0.5s

        &:hover
            color #4a4a4a

        &.dark:hover
            color #bebebe

    #toggle-dark
        top 16px

    #to-top
        bottom 8px
</style>
