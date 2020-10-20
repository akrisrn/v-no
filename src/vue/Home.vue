<template>
  <div>
    <div id="top">
      <div>
        <!--suppress HtmlUnknownTarget -->
        <img :src="this.favicon" alt=""/>
        <a @click.prevent="returnHome" href="/">{{ config.siteName ? config.siteName : 'HOME' }}</a>
        <span></span>
        <a :href="`#/${config.readmeFile}`">README</a>
        <a :href="`#/${config.categoryFile}`">CATEGORIES</a>
        <a :href="`#/${config.archiveFile}`">ARCHIVES</a>
        <a :href="`#/${config.searchFile}`" v-if="isHashMode">SEARCH</a>
      </div>
    </div>
    <transition name="slide-fade">
      <main :class="{error: isError}" v-if="isShow">
        <div id="cover" v-if="cover">
          <img :src="cover" alt="cover"/>
        </div>
        <div class="markdown-body" id="bar" v-if="!isError">
          <code class="item-home" v-if="!isHome">
            <a @click.prevent="returnHome" href="/">«</a>
          </code>
          <code class="item-date" v-if="date">{{ date }}</code>
          <code class="item-date" v-else-if="updated">{{ updated }}</code>
          <code class="item-author" v-for="author in authors">
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
          <template v-if="!isError">
            <span class="date" v-if="date">{{ updated ? `${updated}  (Last Updated)` : date }}</span>
            <span class="date" v-else-if="updated">{{ updated }}</span>
          </template>
        </footer>
      </main>
    </transition>
    <span id="toggle-dark">★</span>
    <span id="toggle-zen">◈</span>
    <span id="to-top">〒</span>
  </div>
</template>

<script lang="ts">
  import { getFlags } from '@/ts/data';
  import { getDateString } from '@/ts/date';
  import { EFlag, IFlags } from '@/ts/enums';
  import { error2markdown } from '@/ts/markdown';
  import { getQueryLink } from '@/ts/query';
  import resource from '@/ts/resource';
  import { axiosGet, config, exposeToWindow, isHashMode, splitFlag } from '@/ts/utils';
  import { scroll } from '@/ts/scroll';
  import axios from 'axios';
  import { Component, Vue, Watch } from 'vue-property-decorator';

  Component.registerHooks([
    'beforeRouteUpdate',
  ]);

  const Article = () => import(/* webpackChunkName: "article" */ '@/vue/Article.vue');

  @Component({ components: { Article } })
  export default class Home extends Vue {
    public data = '';
    public title = '';
    public authors: string[] = [];
    public tags: string[] = [];
    public updated = '';
    public cover = '';
    public isShow = false;
    public isError = false;
    public isDark = false;
    public isZen = false;
    public toggleDark: HTMLElement | null = null;
    public toggleZen: HTMLElement | null = null;
    public toTop: HTMLElement | null = null;
    public keyInput = '';
    public inputBinds: { [index: string]: () => void } = {};
    public params: { [index: string]: string | undefined } = {};
    public isHashMode = isHashMode();
    public baseUrl: string = process.env.BASE_URL;
    public indexPath: string = process.env.VUE_APP_INDEX_PATH;
    public favicon: string = this.baseUrl + process.env.VUE_APP_FAVICON;
    public config = config;

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
              path.substr(indexOf + 1).split('&').forEach((param) => {
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
            return this.baseUrl + path.substr(1);
          }
        }
        return this.baseUrl + this.config.indexFile;
      }
      path = this.baseUrl + path.substr(1);
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
      return path === '/' + this.indexPath;
    }

    public get isIndex() {
      return [
        this.config.indexFile,
        this.config.categoryFile,
        this.config.archiveFile,
        this.config.searchFile,
      ].map((file) => this.baseUrl + file).includes(this.path);
    }

    public get isHome() {
      return this.path === this.baseUrl + this.config.indexFile;
    }

    public get isCategory() {
      return this.path === this.baseUrl + this.config.categoryFile;
    }

    // noinspection JSUnusedGlobalSymbols
    public get isArchive() {
      return this.path === this.baseUrl + this.config.archiveFile;
    }

    public get isSearch() {
      return this.path === this.baseUrl + this.config.searchFile;
    }

    public get date() {
      return getDateString(this.path);
    }

    public get metaThemeColor() {
      return this.isDark ? (this.isZen ? '#2b2b2b' : '#3b3b3b') : (this.isZen ? '#efefef' : '#ffffff');
    }

    public beforeRouteUpdate(to: any, from: any, next: () => void) {
      this.isShow = false;
      next();
      this.updateData(false);
    }

    @Watch('isShow')
    public onIsShowChanged() {
      if (this.isShow) {
        scroll(0, false);
      }
    }

    @Watch('isDark')
    public onIsDarkChanged() {
      document.querySelector('meta[name=theme-color]')!.setAttribute('content', this.metaThemeColor);
      const elements = [this.toggleDark, this.toggleZen, this.toTop, document.body] as HTMLElement[];
      if (this.isDark) {
        this.toggleDark!.innerText = '☆';
        elements.forEach((element) => {
          element.classList.add('dark');
        });
        localStorage.setItem('dark', String(true));
      } else {
        this.toggleDark!.innerText = '★';
        elements.forEach((element) => {
          element.classList.remove('dark');
        });
        localStorage.removeItem('dark');
      }
    }

    @Watch('isZen')
    public onIsZenChanged() {
      document.querySelector('meta[name=theme-color]')!.setAttribute('content', this.metaThemeColor);
      if (this.isZen) {
        this.toggleZen!.classList.add('spin');
        document.body.classList.add('zen');
        localStorage.setItem('zen', String(true));
      } else {
        this.toggleZen!.classList.remove('spin');
        document.body.classList.remove('zen');
        localStorage.removeItem('zen');
      }
    }

    // noinspection JSUnusedGlobalSymbols
    public created() {
      // noinspection JSUnusedGlobalSymbols
      exposeToWindow({
        addInputBind: this.addInputBind,
        axios,
        isHashMode: this.isHashMode,
      });
      // noinspection JSUnusedGlobalSymbols
      this.addInputBinds({
        home: () => {
          if (document.body.classList.contains('prerender')) {
            location.href = this.baseUrl;
          } else {
            this.returnHome();
          }
        },
        gg: () => {
          scroll(document.body.offsetHeight);
          this.keyInput += '_';
        },
        G: () => {
          this.scrollToTop();
        },
        dark: () => {
          this.isDark = !this.isDark;
        },
        zen: () => {
          this.isZen = !this.isZen;
        },
        Backspace: () => {
          this.keyInput = this.keyInput.replace(/.?Backspace$/, '');
        },
      });
      this.isDark = !!localStorage.getItem('dark');
      this.isZen = !!localStorage.getItem('zen');
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
      // vue bind does't work on prerender page
      this.toggleDark = document.querySelector<HTMLElement>('#toggle-dark')!;
      this.toggleDark.addEventListener('click', () => {
        this.isDark = !this.isDark;
      });
      this.toggleZen = document.querySelector<HTMLElement>('#toggle-zen')!;
      this.toggleZen.addEventListener('click', () => {
        this.isZen = !this.isZen;
      });
      this.toTop = document.querySelector<HTMLElement>('#to-top')!;
      this.toTop.addEventListener('click', () => {
        this.scrollToTop();
      });
    }

    public returnHome() {
      let home = '/';
      if (this.isIndexPath) {
        let indexPath = this.indexPath;
        if (indexPath.endsWith('index.html')) {
          indexPath = indexPath.substring(0, indexPath.length - 10);
        }
        home += indexPath;
      }
      if (home === this.$route.fullPath) {
        this.$router.go(0);
      } else {
        this.$router.push(home);
      }
    }

    public setFlags(flags: IFlags) {
      this.title = flags.title ? flags.title : this.path.substr(1);
      if (this.config.siteName && this.config.siteName !== this.title) {
        document.title = `${this.title} - ${this.config.siteName}`;
      } else {
        document.title = `${this.title}`;
      }
      this.authors = flags.author ? splitFlag(flags.author) : [this.config.author];
      this.tags = flags.tags ? splitFlag(flags.tags) : [];
      this.updated = flags.updated ? new Date(flags.updated).toDateString() : '';
      if (flags.cover) {
        this.cover = flags.cover.startsWith('![](') ? flags.cover.substring(4, flags.cover.length - 1) : flags.cover;
      } else {
        this.cover = '';
      }
    }

    public setData(data: string) {
      const { data: newData, result: flags } = getFlags(data);
      this.setFlags(flags);
      this.data = newData;
      this.updateDescription();
      this.isShow = true;
    }

    public updateDescription() {
      const content = [];
      if (this.authors.length > 0) {
        content.push(`Author: ${this.authors.join()}`);
      }
      if (this.tags.length > 0) {
        content.push(`Tags: ${this.tags.join()}`);
      }
      if (this.date) {
        content.push(`Published: ${this.date}`);
      }
      document.querySelector<HTMLMetaElement>('meta[name=description]')!.content = content.join(' | ');
    }

    public updateData(isFirst = true) {
      if (this.path.endsWith('.md')) {
        const promises = [axiosGet(this.path)];
        if (this.config.commonFile) {
          promises.push(axiosGet(this.baseUrl + this.config.commonFile));
        }
        Promise.all(promises).then((responses) => {
          this.isError = false;
          this.setData(responses.map((response) => response.data).join('\n'));
          if (!isFirst) {
            document.querySelectorAll('.custom').forEach((element) => {
              element.remove();
            });
          }
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

    public addInputBinds(binds: { [index: string]: () => void }) {
      Object.keys(binds).forEach((key) => {
        this.inputBinds[key] = binds[key];
      });
    }

    public getAuthorLink(author: string) {
      return getQueryLink(EFlag.author, author);
    }

    public getTagLink(tag: string) {
      return getQueryLink(EFlag.tags, tag);
    }

    public scrollToTop() {
      scroll(0);
    }
  }
</script>

<style lang="scss">@import "../scss/home";</style>
