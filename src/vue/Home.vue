<template>
  <div>
    <div id="top">
      <div>
        <!--suppress HtmlUnknownTarget -->
        <img :src="this.favicon" alt=""/>
        <a href="/" @click.prevent="returnHome">{{ config.siteName ? config.siteName : 'HOME' }}</a>
        <span></span>
        <a :href="`#/${config.readmeFile}`">README</a>
        <a :href="`#/${config.categoryFile}`">CATEGORIES</a>
        <a :href="`#/${config.archiveFile}`">ARCHIVES</a>
        <a v-if="isHashMode" :href="`#/${config.searchFile}`">SEARCH</a>
      </div>
    </div>
    <transition name="slide-fade">
      <main v-if="isShow" :class="{error: isError}">
        <div v-if="cover" id="cover">
          <img :src="cover" alt="cover"/>
        </div>
        <div v-if="!isError" id="bar" class="markdown-body">
          <code v-if="!isHome" class="item-home">
            <a href="/" @click.prevent="returnHome">«</a>
          </code>
          <code v-if="date" class="item-date">{{ date }}</code>
          <code v-else-if="updated" class="item-date">{{ updated }}</code>
          <code v-for="tag in tags" :key="tag" class="item-tag">
            <a :href="getTagLink(tag)">{{ tag }}</a>
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
        <footer v-if="!isHome" class="markdown-body">
          <a class="home" href="/" @click.prevent="returnHome">Return to home</a>
          <template v-if="!isError">
            <span v-if="date" class="date">{{ updated ? `${updated} | Last updated` : date }}</span>
            <span v-else-if="updated" class="date">{{ updated }}</span>
          </template>
        </footer>
      </main>
    </transition>
    <span id="toggle-dark">★</span>
    <span id="toggle-zen">◈</span>
    <span id="to-top">と</span>
  </div>
</template>

<script lang="ts">
  import { getFlags } from '@/ts/data';
  import { getDateString } from '@/ts/date';
  import { EFlag, IFlags } from '@/ts/enums';
  import { error2markdown } from '@/ts/markdown';
  import { getQueryLink } from '@/ts/query';
  import resource from '@/ts/resource';
  import { axiosGet, config, exposeToWindow, isHashMode, splitFlag, toggleClass } from '@/ts/utils';
  import { scroll } from '@/ts/scroll';
  import axios, { AxiosError } from 'axios';
  import { Component, Vue, Watch } from 'vue-property-decorator';
  import { RawLocation, Route } from 'vue-router';

  Component.registerHooks([
    'beforeRouteUpdate',
  ]);

  const Article = () => import(/* webpackChunkName: "article" */ '@/vue/Article.vue');

  @Component({ components: { Article } })
  export default class Home extends Vue {
    public data = '';
    public title = '';
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

    public beforeRouteUpdate(to: Route, from: Route, next: (to?: RawLocation | false | ((vm: Vue) => void)) => void) {
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
          toggleClass(this.toTop!, 'spin');
          scroll(document.body.offsetHeight);
          this.keyInput += '_';
        },
        G: () => {
          toggleClass(this.toTop!, 'spin');
          scroll(0);
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
      // vue bind doesn't work on prerender page
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
        toggleClass(this.toTop!, 'spin');
        scroll(0);
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
      this.tags = flags.tags ? Array.from(new Set(splitFlag(flags.tags))) : [];
      if (flags.updated) {
        const updatedList = Array.from(new Set(splitFlag(flags.updated)));
        const timeList = updatedList.map((updated) => new Date(updated).getTime()).filter((time) => !isNaN(time));
        if (timeList.length > 1) {
          this.updated = new Date(Math.max(...timeList)).toDateString();
        } else {
          this.updated = timeList.length === 1 ? new Date(timeList[0]).toDateString() : '';
        }
      } else {
        this.updated = '';
      }
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
      this.isShow = true;
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
        } as AxiosError));
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

    public getTagLink(tag: string) {
      return getQueryLink(EFlag.tags, tag);
    }
  }
</script>

<style lang="scss">@import "../scss/home";</style>
