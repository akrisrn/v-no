<template>
  <div>
    <div id="top">
      <div>
        <img :src="favicon" alt=""/>
        <a :href="baseUrl" @click.prevent="returnHome">{{ config.siteName ? config.siteName : 'INDEX' }}</a>
        <span></span>
        <a :href="`#${config.readmeFile}`">README</a>
        <a :href="`#${config.categoryFile}`">CATEGORIES</a>
        <a :href="`#${config.archiveFile}`">ARCHIVES</a>
        <a v-if="isHashMode" :href="`#${config.searchFile}`">SEARCH</a>
      </div>
    </div>
    <transition name="slide-fade">
      <main v-if="isShow" :class="{error: isError}">
        <div v-if="cover" id="cover">
          <img :src="cover" alt="cover"/>
        </div>
        <div v-if="!isError" id="bar" class="markdown-body">
          <code v-if="!isHome" class="item-home">
            <a :href="baseUrl" @click.prevent="returnHome">«</a>
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
        <Article :data="data" :isCategory="isCategory" :isSearch="isSearch" :params="params"
                 :path="path" @update:data="data = $event">
        </Article>
        <footer v-if="!isHome" class="markdown-body">
          <a :href="baseUrl" class="home" @click.prevent="returnHome">Return to home</a>
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
  import { getFile } from '@/ts/data';
  import { getDateString } from '@/ts/date';
  import { error2markdown } from '@/ts/markdown';
  import { getQueryLink } from '@/ts/query';
  import {
    addBaseUrl,
    axiosGet,
    config,
    EFlag,
    exposeToWindow,
    getSnippetData,
    isExternalLink,
    isHashMode,
    messages,
    toggleClass,
  } from '@/ts/utils';
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
    data = '';
    title = '';
    tags: string[] = [];
    updated = '';
    cover = '';
    isShow = false;
    isError = false;
    isDark = false;
    isZen = false;
    toggleDark: HTMLElement | null = null;
    toggleZen: HTMLElement | null = null;
    toTop: HTMLElement | null = null;
    keyInput = '';
    inputBinds: Dict<() => void> = {};
    params: Dict<string> = {};
    isHashMode = isHashMode();
    baseUrl: string = process.env.BASE_URL;
    indexPath: string = process.env.VUE_APP_INDEX_PATH;
    favicon: string = addBaseUrl(config.favicon);
    config = config;

    get path() {
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
              path.substr(indexOf + 1).split('&').forEach(param => {
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
            return addBaseUrl(path);
          }
        }
        return addBaseUrl(this.config.indexFile);
      }
      path = addBaseUrl(path);
      if (path.endsWith('.html')) {
        return path.replace(/\.html$/, '.md');
      }
      return path;
    }

    get isIndexPath() {
      let path = this.$route.path;
      if (path.endsWith('/')) {
        path += 'index.html';
      }
      return path === '/' + this.indexPath;
    }

    get isHome() {
      return this.path === addBaseUrl(this.config.indexFile);
    }

    get isCategory() {
      return this.path === addBaseUrl(this.config.categoryFile);
    }

    // noinspection JSUnusedGlobalSymbols
    get isArchive() {
      return this.path === addBaseUrl(this.config.archiveFile);
    }

    get isSearch() {
      return this.path === addBaseUrl(this.config.searchFile);
    }

    get date() {
      return getDateString(this.path);
    }

    get metaThemeColor() {
      return this.isDark ? (this.isZen ? '#2b2b2b' : '#3b3b3b') : (this.isZen ? '#efefef' : '#ffffff');
    }

    // noinspection JSUnusedGlobalSymbols
    beforeRouteUpdate(to: Route, from: Route, next: (to?: RawLocation | false | ((vm: Vue) => void)) => void) {
      this.isShow = false;
      next();
      this.updateData(false);
    }

    @Watch('isShow')
    onIsShowChanged() {
      if (this.isShow) {
        scroll(0, false);
      }
    }

    @Watch('isDark')
    onIsDarkChanged() {
      document.querySelector('meta[name=theme-color]')!.setAttribute('content', this.metaThemeColor);
      const elements = [this.toggleDark, this.toggleZen, this.toTop, document.body] as HTMLElement[];
      if (this.isDark) {
        this.toggleDark!.innerText = '☆';
        elements.forEach(element => {
          element.classList.add('dark');
        });
        localStorage.setItem('dark', String(true));
      } else {
        this.toggleDark!.innerText = '★';
        elements.forEach(element => {
          element.classList.remove('dark');
        });
        localStorage.removeItem('dark');
      }
    }

    @Watch('isZen')
    onIsZenChanged() {
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
    created() {
      const icon = document.querySelector<HTMLLinkElement>('link[rel="icon"]')!;
      icon.href = this.favicon;
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
    mounted() {
      addEventListener('keydown', event => {
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

    returnHome() {
      let home = '/';
      if (this.isIndexPath) {
        let indexPath = this.indexPath;
        if (indexPath.endsWith('index.html')) {
          indexPath = indexPath.substring(0, indexPath.length - 10);
        }
        home += indexPath;
      }
      if (this.$route.fullPath !== home) {
        this.$router.push(home);
      }
    }

    setFlags(flags: IFlags) {
      this.title = flags.title ? flags.title : this.path.substr(1);
      if (this.config.siteName && this.config.siteName !== this.title) {
        document.title = `${this.title} - ${this.config.siteName}`;
      } else {
        document.title = `${this.title}`;
      }
      this.tags = flags.tags;
      if (flags.updated.length !== 0) {
        const updatedList = flags.updated;
        const timeList = updatedList.map(updated => {
          return new Date(updated.match(/^[0-9]+$/) ? parseInt(updated) : updated).getTime();
        }).filter(time => !isNaN(time));
        if (timeList.length > 1) {
          this.updated = new Date(Math.max(...timeList)).toDateString();
        } else {
          this.updated = timeList.length === 1 ? new Date(timeList[0]).toDateString() : '';
        }
      } else {
        this.updated = '';
      }
      if (flags.cover) {
        const cover = flags.cover.startsWith('![](') ? flags.cover.substring(4, flags.cover.length - 1) : flags.cover;
        this.cover = !isExternalLink(cover) ? addBaseUrl(cover) : cover;
      } else {
        this.cover = '';
      }
    }

    setData(data: string) {
      const { data: newData, flags } = getFile(data);
      this.setFlags(flags);
      this.data = newData;
      this.isShow = true;
    }

    updateData(isFirst = true) {
      if (this.path.endsWith('.md')) {
        const promises = [axiosGet<string>(this.path)];
        if (this.config.commonFile) {
          const commonFile = addBaseUrl(this.config.commonFile);
          if (this.path !== commonFile) {
            promises.push(axiosGet<string>(commonFile));
          }
        }
        Promise.all(promises).then(responses => {
          this.isError = false;
          let data = responses[0].data;
          if (responses.length > 1) {
            data += '\n\n' + getSnippetData(responses[1].data);
          }
          this.setData(data);
          if (!isFirst) {
            document.querySelectorAll('.custom').forEach(element => {
              element.remove();
            });
          }
        }).catch(error => {
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
            statusText: messages.notFound,
          },
        } as AxiosError));
      }
    }

    addInputBind(input: string, bind: () => void) {
      this.inputBinds[input] = bind;
    }

    addInputBinds(binds: Dict<() => void>) {
      Object.keys(binds).forEach(key => {
        this.inputBinds[key] = binds[key];
      });
    }

    getTagLink(tag: string) {
      return getQueryLink(EFlag.tags, tag);
    }
  }
</script>

<style lang="scss">@import "../scss/home";</style>
