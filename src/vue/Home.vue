<template>
  <div id="app">
    <div id="top">
      <div>
        <img v-if="favicon" :src="favicon" alt=""/>
        <a :href="homePath" @click.prevent="returnHome">{{ config.siteName || config.messages.home }}</a>
        <span></span>
        <a :href="`#${config.paths.readme}`"></a>
        <a :href="`#${config.paths.archive}`"></a>
        <a :href="`#${config.paths.category}`"></a>
        <a :href="`#${config.paths.search}`"></a>
        <select v-if="selectConf && confList.length > 1" v-model="selectConf" @change="confChanged">
          <option v-for="conf in confList" :key="conf" :value="conf">{{ conf }}</option>
        </select>
      </div>
    </div>
    <transition name="slide-fade">
      <main v-if="isShow" :class="{error: isError}">
        <div v-if="cover" id="cover" class="center">
          <img :src="cover" alt="cover"/>
        </div>
        <div v-if="!isError" id="bar" class="markdown-body bar">
          <code v-if="!isIndexFile" class="item-home">
            <a :href="homePath" @click.prevent="returnHome">«</a>
          </code>
          <code v-if="date" class="item-date">{{ date }}</code>
          <code v-else-if="updated" class="item-date">{{ updated }}</code>
          <code v-for="tag in tags" :key="tag" class="item-tag">
            <template v-for="link in getSearchTagLinks(tag)">
              <a :key="link[0]" :href="link[0]">{{ link[1] }}</a>
            </template>
          </code>
          <code class="item-raw">
            <a :href="rawFilePath" target="_blank">{{ config.messages.raw }}</a>
          </code>
        </div>
        <header>{{ title }}</header>
        <Article :data="data" :filePath="filePath" :query="query"></Article>
        <div v-if="!isError" id="backlinks" class="markdown-body">
          <div :class="['icon', { loading: isLoadingBacklinks }]"
               v-html="isLoadingBacklinks ? iconSync : iconBacklink"></div>
          <span v-if="isLoadingBacklinks">{{ config.messages.loading }}</span>
          <a v-else-if="!hasLoadedBacklinks" @click="getBacklinks">{{ config.messages.showBacklinks }}</a>
          <template v-else>
            <ul v-if="backlinkFiles.length > 0">
              <li v-for="file in backlinkFiles" :key="file.path" class="article">
                <a :href="`#${file.path}`">{{ file.title }}</a>
                <div class="bar">
                  <code v-for="tag in file.tags" :key="tag" class="item-tag">
                    <template v-for="link in getSearchTagLinks(tag)">
                      <a :key="link[0]" :href="link[0]">{{ link[1] }}</a>
                    </template>
                  </code>
                  <code v-if="file.date" class="item-date">{{ file.date }}</code>
                </div>
              </li>
            </ul>
            <span v-else>{{ config.messages.noBacklinks }}</span>
          </template>
        </div>
        <footer v-if="!isIndexFile" class="markdown-body">
          <a :href="homePath" class="home" @click.prevent="returnHome">{{ config.messages.returnHome }}</a>
          <template v-if="!isError">
            <span v-if="date" class="date">
              {{ updated && updated !== date ? `${updated} | ${config.messages.lastUpdated}` : date }}
            </span>
            <span v-else-if="updated" class="date">{{ updated }}</span>
          </template>
        </footer>
      </main>
    </transition>
    <span id="toggle-dark" ref="toggleDark" @click="toggleDark">{{ darkMarks[0] }}</span>
    <span id="toggle-zen" ref="toggleZen" @click="toggleZen">{{ zenMark }}</span>
    <span id="to-top" ref="toTop" @click="toTop()">{{ toTopMark }}</span>
  </div>
</template>

<script lang="ts">
  import { getErrorFile, getFile, getFiles } from '@/ts/file';
  import {
    addBaseUrl,
    cleanEventListenerDict,
    EIcon,
    exposeToWindow,
    getDateRange,
    getIcon,
    getSearchTagLinks,
    isExternalLink,
    removeClass,
    scroll,
    sortFiles,
    transForSort,
  } from '@/ts/utils';
  import { config, getSelectConf } from '@/ts/config';
  import axios, { AxiosError } from 'axios';
  import { Component, Vue, Watch } from 'vue-property-decorator';
  import { RawLocation, Route } from 'vue-router';

  Component.registerHooks([
    'beforeRouteUpdate',
  ]);

  const Article = () => import(/* webpackChunkName: "article" */ '@/vue/Article.vue');

  @Component({ components: { Article } })
  export default class Home extends Vue {
    $refs!: {
      toggleDark: HTMLSpanElement;
      toggleZen: HTMLSpanElement;
      toTop: HTMLSpanElement;
    };

    selectConf = getSelectConf();
    confList = this.config.multiConf ? Object.keys(this.config.multiConf).sort() : [];

    data = '';
    title = '';
    tags: string[] = [];
    date = '';
    updated = '';
    cover = '';
    query: Dict<string> = {};

    backlinkFiles: TFileForSort[] = [];
    isLoadingBacklinks = false;
    hasLoadedBacklinks = false;

    isShow = false;
    isError = false;

    metaTheme!: HTMLMetaElement;
    isDark = false;
    isZen = false;
    darkMarks = ['★', '☆'];
    zenMark = '▣';
    toTopMark = 'と';

    favicon = this.config.paths.favicon ? addBaseUrl(this.config.paths.favicon) : '';
    iconSync = getIcon(EIcon.sync);
    iconBacklink = getIcon(EIcon.backlink, 18);

    keyInput = '';
    inputBinds: Dict<() => void> = {};

    indexPath: string = process.env.VUE_APP_INDEX_PATH;

    get config() {
      return config;
    }

    get shortIndexPath() {
      if (this.indexPath.endsWith('index.html')) {
        return this.indexPath.replace(/index\.html$/, '');
      }
      return this.indexPath;
    }

    get homePath() {
      return process.env.BASE_URL + this.shortIndexPath;
    }

    get homePathForRoute() {
      return `/${this.shortIndexPath}`;
    }

    get filePath() {
      this.query = {};
      let path = this.$route.path;
      if (path.endsWith('/')) {
        path += 'index.html';
      }
      if (path === `/${this.indexPath}`) {
        const hash = this.$route.hash;
        if (hash.startsWith('#/')) {
          path = hash.substr(1);
          if (path !== '/') {
            const indexOf = path.indexOf('?');
            if (indexOf >= 0) {
              path.substr(indexOf + 1).split('&').forEach(param => {
                const indexOfEQ = param.indexOf('=');
                if (indexOfEQ >= 0) {
                  this.query[param.substring(0, indexOfEQ)] = param.substring(indexOfEQ + 1);
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
      } else if (path.endsWith('.html')) {
        return path.replace(/\.html$/, '.md');
      } else {
        return path;
      }
    }

    get rawFilePath() {
      return addBaseUrl(this.filePath);
    }

    get isIndexFile() {
      return this.filePath === this.config.paths.index;
    }

    get metaThemeColor() {
      return this.isDark ? (this.isZen ? '#2b2b2b' : '#3b3b3b') : (this.isZen ? '#efefef' : '#ffffff');
    }

    @Watch('isShow')
    onIsShowChanged() {
      if (this.isShow) {
        scroll(0, false);
      }
    }

    @Watch('isDark')
    onIsDarkChanged() {
      this.metaTheme.setAttribute('content', this.metaThemeColor);
      if (this.isDark) {
        this.$refs.toggleDark.innerText = this.darkMarks[1];
        document.body.classList.add('dark');
        localStorage.setItem('dark', String(true));
      } else {
        this.$refs.toggleDark.innerText = this.darkMarks[0];
        removeClass(document.body, 'dark');
        localStorage.removeItem('dark');
      }
    }

    @Watch('isZen')
    onIsZenChanged() {
      this.metaTheme.setAttribute('content', this.metaThemeColor);
      if (this.isZen) {
        this.$refs.toggleZen.classList.add('spin');
        document.body.classList.add('zen');
        localStorage.setItem('zen', String(true));
      } else {
        removeClass(this.$refs.toggleZen, 'spin');
        removeClass(document.body, 'zen');
        localStorage.removeItem('zen');
      }
    }

    // noinspection JSUnusedGlobalSymbols
    created() {
      if (document.body.id === 'prerender') {
        let filePath = this.filePath;
        if (filePath.endsWith('index.md')) {
          filePath = filePath.replace(/index\.md$/, '');
        }
        const hashPath = filePath === '/' ? this.homePath : `${this.homePath}#${filePath}`;
        location.href = hashPath + location.search;
        return;
      }
      const match = this.filePath.match(/\.(.*?)\.md$/);
      if (match) {
        if (this.confList.includes(match[1]) && this.selectConf !== match[1]) {
          localStorage.setItem('conf', match[1]);
          this.$router.go(0);
          return;
        }
      }
      this.updateData();
      this.isDark = !!localStorage.getItem('dark');
      this.isZen = !!localStorage.getItem('zen');
      this.metaTheme = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]')!;
      const icon = document.querySelector<HTMLLinkElement>('link[rel="icon"]')!;
      if (this.favicon) {
        icon.href = this.favicon;
      } else if (icon) {
        icon.remove();
      }
      // noinspection JSUnusedGlobalSymbols
      this.addInputBinds({
        home: () => {
          this.returnHome();
        },
        gg: () => {
          this.toTop(document.body.offsetHeight);
          this.keyInput += '_';
        },
        G: () => {
          this.toTop();
        },
        dark: () => {
          this.toggleDark();
        },
        zen: () => {
          this.toggleZen();
        },
        Backspace: () => {
          this.keyInput = this.keyInput.replace(/.?Backspace$/, '');
        },
      });
      // noinspection JSUnusedGlobalSymbols
      exposeToWindow({
        version: process.env.VUE_APP_VERSION,
        axios,
        homePath: this.homePath,
        filePath: this.filePath,
        addInputBind: this.addInputBind,
      });
    }

    // noinspection JSUnusedGlobalSymbols
    mounted() {
      addEventListener('keydown', e => {
        if (!document.activeElement || !['INPUT', 'TEXTAREA'].includes(document.activeElement.tagName)) {
          this.keyInput += e.key;
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
    }

    // noinspection JSUnusedGlobalSymbols
    beforeRouteUpdate(to: Route, from: Route, next: (to?: RawLocation | false | ((vm: Vue) => void)) => void) {
      this.isShow = false;
      next();
      exposeToWindow({ filePath: this.filePath });
      cleanEventListenerDict();
      document.querySelectorAll('.custom').forEach(element => {
        element.remove();
      });
      this.updateData();
    }

    updateData() {
      if (this.filePath.endsWith('.md')) {
        const promises = [getFile(this.filePath)];
        const commonPath = this.config.paths.common;
        if (commonPath && this.filePath !== commonPath) {
          promises.push(getFile(commonPath));
        }
        Promise.all(promises).then(files => {
          this.isError = false;
          let data = files[0].data;
          if (files.length > 1) {
            const commonData = files[1].data;
            let headerData = '';
            let footerData = commonData;
            const indexOf = commonData.indexOf('--8<--');
            if (indexOf >= 0) {
              headerData = commonData.substring(0, indexOf).trimEnd();
              footerData = commonData.substring(indexOf + 6).trimStart();
            }
            if (headerData) {
              data = headerData + '\n\n' + data;
            }
            if (footerData) {
              data += '\n\n' + footerData;
            }
          }
          this.setData(data, files[0].flags);
          if (this.hasLoadedBacklinks) {
            this.getBacklinks();
          }
        }).catch((error: AxiosError) => {
          this.isError = true;
          const { data, flags } = getErrorFile(error);
          this.setData(data, flags);
        });
      } else {
        setTimeout(() => {
          this.isError = true;
          const { data, flags } = getErrorFile({
            response: {
              status: 404,
              statusText: 'Not Found',
            },
          } as AxiosError);
          this.setData(data, flags);
        }, 0);
      }
    }

    setData(data: string, flags: IFlags) {
      this.setFlags(flags);
      this.data = data;
      this.isShow = true;
    }

    setFlags(flags: IFlags) {
      this.title = flags.title || this.filePath;
      document.title = `${this.title}`;
      if (this.config.siteName && this.config.siteName !== this.title) {
        document.title += ` - ${this.config.siteName}`;
      }
      this.tags = [...flags.tags];
      [this.date, this.updated] = getDateRange(this.filePath, flags.updated);
      if (flags.cover) {
        const cover = flags.cover.startsWith('![](') ? flags.cover.substring(4, flags.cover.length - 1) : flags.cover;
        this.cover = !isExternalLink(cover) ? addBaseUrl(cover) : cover;
      } else {
        this.cover = '';
      }
    }

    returnHome() {
      if (this.$route.fullPath !== this.homePathForRoute) {
        this.$router.push(this.homePathForRoute);
      }
    }

    getSearchTagLinks(tag: string) {
      return getSearchTagLinks(tag);
    }

    getBacklinks() {
      this.isLoadingBacklinks = true;
      getFiles().then(({ files, backlinks }) => {
        const paths = backlinks[this.filePath];
        this.backlinkFiles = paths && paths.length > 0 ? paths.map(path => {
          return transForSort(files[path]);
        }).sort(sortFiles) : [];
        this.isLoadingBacklinks = false;
        if (!this.hasLoadedBacklinks) {
          this.hasLoadedBacklinks = true;
        }
      });
    }

    confChanged() {
      localStorage.setItem('conf', this.selectConf);
      location.href = this.homePath;
    }

    toggleDark() {
      this.isDark = !this.isDark;
    }

    toggleZen() {
      this.isZen = !this.isZen;
    }

    toTop(height = 0) {
      this.addTempClass(this.$refs.toTop, 'spin');
      scroll(height);
    }

    addTempClass(element: Element, cls: string, timeout = 500) {
      if (!element.classList.contains(cls)) {
        element.classList.add(cls);
        setTimeout(() => {
          removeClass(element, cls);
        }, timeout);
      }
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
