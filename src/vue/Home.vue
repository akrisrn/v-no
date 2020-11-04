<template>
  <div>
    <div id="top">
      <div>
        <img :src="favicon" alt=""/>
        <a :href="baseUrl" @click.prevent="returnHome">{{ config.siteName || config.messages.home }}</a>
        <span></span>
        <a :href="`#${config.paths.readme}`">{{ config.messages.readme }}</a>
        <a :href="`#${config.paths.archive}`">{{ config.messages.archive }}</a>
        <template v-if="isHashMode">
          <a :href="`#${config.paths.category}`">{{ config.messages.category }}</a>
          <a :href="`#${config.paths.search}`">{{ config.messages.search }}</a>
        </template>
      </div>
    </div>
    <transition name="slide-fade">
      <main v-if="isShow" :class="{error: isError}">
        <div v-if="cover" id="cover">
          <img :src="cover" alt="cover"/>
        </div>
        <div v-if="!isError" id="bar" class="markdown-body bar">
          <code v-if="!isHome" class="item-home">
            <a :href="baseUrl" @click.prevent="returnHome">«</a>
          </code>
          <code v-if="date" class="item-date">{{ date }}</code>
          <code v-else-if="updated" class="item-date">{{ updated }}</code>
          <code v-for="tag in tags" :key="tag" class="item-tag">
            <a :href="getSearchTagUrl(tag)">{{ tag }}</a>
          </code>
          <code class="item-raw">
            <a :href="rawPath" target="_blank">{{ config.messages.raw }}</a>
          </code>
        </div>
        <header>{{ title }}</header>
        <Article :data="data" :params="params" :path="path" @update:data="data = $event"></Article>
        <div v-if="!isError" id="backlinks" class="markdown-body">
          <div :class="['icon', { loading: isLoadingBacklinks }]"
               v-html="isLoadingBacklinks ? iconSync : iconBacklink"></div>
          <span v-if="isLoadingBacklinks">{{ config.messages.loading }}</span>
          <a v-else-if="!hasLoadedBacklinks" @click.prevent="getBacklinks">{{ config.messages.showBacklinks }}</a>
          <template v-else>
            <ul v-if="backlinkFiles.length > 0">
              <li v-for="file in backlinkFiles" :key="file.path" class="article">
                <a :href="`#${file.path}`">{{ file.title }}</a>
                <div class="bar">
                  <code v-for="tag in file.tags" :key="tag" class="item-tag">
                    <a :href="getSearchTagUrl(tag)">{{ tag }}</a>
                  </code>
                  <code v-if="file.date" class="item-date">{{ file.date }}</code>
                </div>
              </li>
            </ul>
            <span v-else>{{ config.messages.noBacklinks }}</span>
          </template>
        </div>
        <footer v-if="!isHome" class="markdown-body">
          <a :href="baseUrl" class="home" @click.prevent="returnHome">{{ config.messages.returnHome }}</a>
          <template v-if="!isError">
            <span v-if="date" class="date">{{ updated ? `${updated} | ${config.messages.lastUpdated}` : date }}</span>
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
  import { getErrorFile, getFile, getFiles } from '@/ts/file';
  import {
    addBaseUrl,
    addTempClass,
    baseFiles,
    buildQueryContent,
    config,
    degradeHeading,
    EFlag,
    EIcon,
    exposeToWindow,
    getDateFromPath,
    getIcon,
    getLastedDate,
    isExternalLink,
    isHashMode,
    removeClass,
    scroll,
  } from '@/ts/utils';
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

    backlinkFiles: TBacklinkFile[] = [];
    isLoadingBacklinks = false;
    hasLoadedBacklinks = false;

    isHashMode = isHashMode();
    isShow = false;
    isError = false;
    isDark = false;
    isZen = false;
    toggleDark: HTMLElement | null = null;
    toggleZen: HTMLElement | null = null;
    toTop: HTMLElement | null = null;

    keyInput = '';
    inputBinds: Dict<() => void> = {};

    config = config;
    favicon = addBaseUrl(config.paths.favicon);

    baseUrl: string = process.env.BASE_URL;
    indexPath: string = process.env.VUE_APP_INDEX_PATH;

    params: Dict<string> = {};

    iconSync = getIcon(EIcon.sync);
    iconBacklink = getIcon(EIcon.backlink, 18);

    get path() {
      this.params = {};
      let path = this.$route.path;
      const hash = this.$route.hash;
      if (this.isIndexPath) {
        path = '/';
      }
      if (path !== '/') {
        if (path.endsWith('.html')) {
          return path.replace(/\.html$/, '.md');
        }
        return path;
      }
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
          return path;
        }
      }
      return this.config.paths.index;
    }

    get rawPath() {
      return addBaseUrl(this.path);
    }

    get isIndexPath() {
      let path = this.$route.path;
      if (path.endsWith('/')) {
        path += 'index.html';
      }
      return path === `/${this.indexPath}`;
    }

    get isHome() {
      return this.path === this.config.paths.index;
    }

    get date() {
      return getDateFromPath(this.path);
    }

    get metaThemeColor() {
      return this.isDark ? (this.isZen ? '#2b2b2b' : '#3b3b3b') : (this.isZen ? '#efefef' : '#ffffff');
    }

    // noinspection JSUnusedGlobalSymbols
    beforeRouteUpdate(to: Route, from: Route, next: (to?: RawLocation | false | ((vm: Vue) => void)) => void) {
      this.isShow = false;
      next();
      this.backlinkFiles = [];
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
      if (this.isDark) {
        this.toggleDark!.innerText = '☆';
        document.body.classList.add('dark');
        localStorage.setItem('dark', String(true));
      } else {
        this.toggleDark!.innerText = '★';
        removeClass(document.body, 'dark');
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
        removeClass(this.toggleZen!, 'spin');
        removeClass(document.body, 'zen');
        localStorage.removeItem('zen');
      }
    }

    // noinspection JSUnusedGlobalSymbols
    created() {
      this.updateData();
      this.isDark = !!localStorage.getItem('dark');
      this.isZen = !!localStorage.getItem('zen');
      const icon = document.querySelector<HTMLLinkElement>('link[rel="icon"]')!;
      icon.href = this.favicon;
      // noinspection JSUnusedGlobalSymbols
      this.addInputBinds({
        home: () => {
          if (this.isHashMode) {
            this.returnHome();
          } else {
            location.href = this.baseUrl;
          }
        },
        gg: () => {
          addTempClass(this.toTop!, 'spin');
          scroll(document.body.offsetHeight);
          this.keyInput += '_';
        },
        G: () => {
          addTempClass(this.toTop!, 'spin');
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
      // noinspection JSUnusedGlobalSymbols
      exposeToWindow({
        axios,
        baseUrl: this.baseUrl,
        isHash: this.isHashMode,
        addInputBind: this.addInputBind,
      });
    }

    // noinspection JSUnusedGlobalSymbols
    mounted() {
      addEventListener('keydown', event => {
        if (!document.activeElement || !['INPUT', 'TEXTAREA'].includes(document.activeElement.tagName)) {
          this.keyInput += event.key;
          if (this.keyInput.length > 20) {
            this.keyInput = this.keyInput.substr(10);
          }
          for (const key of Object.keys(this.inputBinds)) {
            if (this.keyInput.endsWith(key)) {
              this.inputBinds[key]();
              break;
            }
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
        addTempClass(this.toTop!, 'spin');
        scroll(0);
      });
    }

    returnHome() {
      let home = '/';
      if (this.isIndexPath) {
        let indexPath = this.indexPath;
        if (indexPath.endsWith('index.html')) {
          indexPath = indexPath.replace(/index\.html$/, '');
        }
        home += indexPath;
      }
      if (this.$route.fullPath !== home) {
        this.$router.push(home);
      }
    }

    setFlags(flags: IFlags) {
      this.title = flags.title || this.path;
      if (this.config.siteName && this.config.siteName !== this.title) {
        document.title = `${this.title} - ${this.config.siteName}`;
      } else {
        document.title = `${this.title}`;
      }
      this.tags = flags.tags;
      this.updated = getLastedDate(flags.updated);
      if (flags.cover) {
        const cover = flags.cover.startsWith('![](') ? flags.cover.substring(4, flags.cover.length - 1) : flags.cover;
        this.cover = !isExternalLink(cover) ? addBaseUrl(cover) : cover;
      } else {
        this.cover = '';
      }
    }

    setData(data: string, flags: IFlags) {
      this.setFlags(flags);
      this.data = data;
      this.isShow = true;
    }

    updateData(isFirst = true) {
      if (this.path.endsWith('.md')) {
        const promises = [getFile(this.path)];
        if (this.config.paths.common) {
          if (this.path !== this.config.paths.common) {
            promises.push(getFile(this.config.paths.common));
          }
        }
        Promise.all(promises).then(files => {
          this.isError = false;
          let data = files[0].data;
          if (files.length > 1) {
            data += '\n\n' + degradeHeading(files[1].data);
          }
          this.setData(data, files[0].flags);
          if (!isFirst) {
            if (this.hasLoadedBacklinks) {
              this.getBacklinks();
            }
            document.querySelectorAll('.custom').forEach(element => {
              element.remove();
            });
          }
        }).catch((error: AxiosError) => {
          this.isError = true;
          const { data, flags } = getErrorFile(error);
          this.setData(data, flags);
        });
      } else {
        this.isError = true;
        const { data, flags } = getErrorFile({
          response: {
            status: 404,
            statusText: config.messages.notFound,
          },
        } as AxiosError);
        this.setData(data, flags);
      }
    }

    getSearchTagUrl(tag: string) {
      return buildQueryContent(`@${EFlag.tags}:${tag}`, true);
    }

    getBacklinks() {
      this.isLoadingBacklinks = true;
      getFiles((files, backlinks) => {
        this.backlinkFiles = (backlinks[this.path] || []).map(path => {
          const flags = files[path].flags;
          return {
            path,
            title: flags.title || path,
            tags: flags.tags,
            date: getDateFromPath(path) || getLastedDate(flags.updated),
          } as TBacklinkFile;
        }).sort((a, b) => {
          if (baseFiles.includes(a.path)) {
            return baseFiles.includes(b.path) ? a.title.localeCompare(b.title) : 1;
          }
          return baseFiles.includes(b.path) ? -1 : a.title.localeCompare(b.title);
        });
        this.isLoadingBacklinks = false;
        this.hasLoadedBacklinks = true;
      });
    }

    addInputBind(input: string, bind: () => void) {
      this.inputBinds[input] = bind;
    }

    addInputBinds(binds: Dict<() => void>) {
      Object.keys(binds).forEach(key => {
        this.addInputBind(key, binds[key]);
      });
    }
  }
</script>

<style lang="scss">@import "../scss/home";</style>
