<template>
    <div>
        <transition name="slide-fade">
            <main :class="{error: isError}" v-if="isShow">
                <div id="cover" v-if="cover">
                    <!--suppress HtmlUnknownTarget -->
                    <img :src="cover" alt="cover"/>
                </div>
                <div class="markdown-body" id="bar" v-if="!isError">
                    <code class="item-home" v-if="!isHome">
                        <a @click.prevent="returnHome" href="/">«</a>
                    </code>
                    <code class="item-date" v-if="date">{{ date }}</code>
                    <code class="item-author">
                        <a :href="getAuthorLink(author)">{{ author }}</a>
                    </code>
                    <code class="item-tag" v-for="tag in tags">
                        <a :href="getTagLink(tag)">{{ tag }}</a>
                    </code>
                    <code class="item-count">
                        <span id="text-count"/>
                    </code>
                    <code class="item-raw">
                        <a :href="path" target="_blank">Raw</a>
                    </code>
                </div>
                <header>{{ title }}</header>
                <!--suppress JSUnresolvedVariable -->
                <Article :data="data" :isCategory="isCategory" :isIndex="isIndex" :isSearch="isSearch" :params="params"
                         @update:data="data = $event">
                </Article>
                <footer class="markdown-body" v-if="!isHome">
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
    import {setFlag} from '@/ts/data';
    import {getDateString} from '@/ts/date';
    import {EFlag} from '@/ts/enums';
    import {error2markdown} from '@/ts/markdown';
    import {getQueryLink} from '@/ts/query';
    import resource from '@/ts/resource';
    import {splitTags} from '@/ts/utils';
    import Article from '@/vue/Article.vue';
    import axios from 'axios';
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
        public cover = '';
        public isShow = false;
        public isError = false;
        public isDark = false;
        public toggleDark: HTMLElement | null = null;
        public toTop: HTMLElement | null = null;
        public keyInput = '';
        public inputBinds: { [index: string]: () => void } = {};
        public params: { [index: string]: string | undefined } = {};

        public get path() {
            this.params = {};
            let path = this.$route.path;
            const hash = this.$route.hash;
            if (this.isIndexPath) {
                path = '/';
            }
            if (path === '/') {
                if (hash.startsWith('#/')) {
                    path = hash.substr(1);
                    if (path !== '/') {
                        const indexOf = path.indexOf('?');
                        if (indexOf >= 0) {
                            path.substring(indexOf + 1).split('&').forEach((param) => {
                                const indexOfEQ = param.indexOf('=');
                                if (indexOfEQ >= 0) {
                                    this.params[param.substring(0, indexOfEQ)] = param.substring(indexOfEQ + 1);
                                }
                            });
                            path = path.substring(0, indexOf);
                        }
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
                process.env.VUE_APP_ARCHIVE_FILE, process.env.VUE_APP_SEARCH_FILE].includes(this.path.substr(1));
        }

        public get isHome() {
            return this.path.substr(1) === process.env.VUE_APP_INDEX_FILE;
        }

        public get isCategory() {
            return this.path.substr(1) === process.env.VUE_APP_CATEGORY_FILE;
        }

        // noinspection JSUnusedGlobalSymbols
        public get isArchive() {
            return this.path.substr(1) === process.env.VUE_APP_ARCHIVE_FILE;
        }

        public get isSearch() {
            return this.path.substr(1) === process.env.VUE_APP_SEARCH_FILE;
        }

        public get date() {
            return getDateString(this.path);
        }

        public beforeRouteUpdate(to: any, from: any, next: () => void) {
            next();
            this.isShow = false;
            this.updateData();
        }

        @Watch('isShow')
        public onIsShowChanged() {
            if (this.isShow) {
                scrollTo(0, 0);
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
                scrollTo(0, document.body.offsetHeight);
                this.keyInput += '_';
            });
            this.addInputBind('G', () => {
                scrollTo(0, 0);
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
                scrollTo(0, 0);
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

        public setTitle(data: string) {
            return setFlag(data, '^#', (match) => {
                this.title = match;
            }, () => {
                this.title = this.path.substr(1);
            }, () => {
                document.title = this.title;
            });
        }

        public setAuthor(data: string) {
            return setFlag(data, `@${EFlag.author}:`, (match) => {
                this.author = match;
            }, () => {
                this.author = process.env.VUE_APP_AUTHOR;
            });
        }

        public setTags(data: string) {
            return setFlag(data, `@${EFlag.tags}:`, (match) => {
                this.tags = splitTags(match);
            }, () => {
                this.tags = [];
            });
        }

        public setCover(data: string) {
            return setFlag(data, `@${EFlag.cover}:`, (match) => {
                this.cover = match.startsWith('![](') ? match.substring(4, match.length - 1) : match;
            }, () => {
                this.cover = '';
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
                    const data = this.setCover(this.setTags(this.setAuthor(response.data)));
                    this.setData(data);
                }).catch((error) => {
                    this.isError = true;
                    this.cover = '';
                    this.setData(error2markdown(error));
                });
            } else {
                this.isError = true;
                this.cover = '';
                this.setData(error2markdown({
                    response: {
                        status: 404,
                        statusText: resource.notFound,
                    },
                } as any));
            }
        }

        public addInputBind(input: string, bind: () => void) {
            this.inputBinds[input] = bind;
        }

        public getAuthorLink(author: string) {
            return getQueryLink(EFlag.author, author);
        }

        public getTagLink(tag: string) {
            return getQueryLink(EFlag.tags, tag);
        }
    }
</script>

<style lang="stylus">@import 'src/styl/_fade.styl';</style>
<style lang="stylus">@import 'src/styl/_main.styl';</style>
<style lang="stylus">@import 'src/styl/_tools.styl';</style>
