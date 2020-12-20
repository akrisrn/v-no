<template>
  <div id="app">
    <div id="top">
      <div>
        <img v-if="favicon" :src="favicon" alt="favicon"/>
        <a :href="homePath" @click.prevent="returnHome">{{ config.siteName || config.messages.home }}</a>
        <span class="filler"></span>
        <a :href="`#${shortPaths.readme}`"></a>
        <a :href="`#${shortPaths.archive}`"></a>
        <a :href="`#${shortPaths.category}`"></a>
        <a :href="`#${shortPaths.search}`"></a>
        <select v-if="enableMultiConf" v-model="selectConf" @change="confChanged">
          <option v-for="(conf, i) in confList[0]" :key="conf" :value="conf">{{ confList[1][i] }}</option>
        </select>
      </div>
    </div>
    <transition name="slide-fade">
      <main v-if="isShow" :class="isError ? 'error' : null">
        <div v-if="cover" id="cover" class="center">
          <img :src="cover" alt="cover"/>
        </div>
        <div v-if="!isError" id="bar" class="bar">
          <code v-if="!isIndexFile" class="item-home">
            <a :href="homePath" @click.prevent="returnHome">«</a>
          </code>
          <code v-if="date" class="item-date">{{ isIndexFile ? updated : date }}</code>
          <code v-if="creator" class="item-creator">{{ creator }}</code>
          <code v-for="tag in tags" :key="tag" class="item-tag">
            <template v-for="link in getSearchTagLinks(tag)">
              <a :key="link[0]" :href="link[0]">{{ link[1] }}</a>
            </template>
          </code>
          <code v-for="key in Object.keys(otherFlags).sort()" :key="key" :class="`item-${key}`">{{
              otherFlags[key]
            }}</code>
          <code class="item-raw">
            <a :href="rawFilePath" target="_blank">{{ config.messages.raw }}</a>
          </code>
        </div>
        <header>{{ title }}</header>
        <Article :anchor="anchor" :data="data" :filePath="filePath" :query="query"></Article>
        <div v-if="!isError" id="backlinks">
          <div v-if="!hasLoadedBacklinks" :class="['icon', { loading: isLoadingBacklinks }]"
               v-html="isLoadingBacklinks ? iconSync : iconBacklink"></div>
          <span v-if="isLoadingBacklinks">{{ config.messages.loading }}</span>
          <a v-else-if="!hasLoadedBacklinks" @click="getBacklinks">{{ config.messages.showBacklinks }}</a>
          <template v-else>
            <ul v-if="backlinkFiles.length > 0">
              <li v-for="file in backlinkFiles" :key="file.path" class="article" v-html="getListHtml(file)"></li>
            </ul>
            <span v-else>{{ config.messages.noBacklinks }}</span>
          </template>
        </div>
        <footer v-if="!isIndexFile">
          <a :href="homePath" class="home" @click.prevent="returnHome">{{ config.messages.returnHome }}</a>
          <template v-if="!isError && date">
            <span class="filler"></span>
            <span class="date">{{ updated !== date ? updated + lastUpdatedMessage : date }}</span>
          </template>
        </footer>
      </main>
    </transition>
    <span id="toggle-dark" @click="toggleDark">{{ darkMarks[isDark ? 1 : 0] }}</span>
    <span id="toggle-zen" ref="toggleZen" :class="isZen ? 'spin' : null" @click="toggleZen">{{ zenMark }}</span>
    <span id="to-top" ref="toTop" :class="isToTop ? 'spin' : null" @click="toTop()">{{ toTopMark }}</span>
  </div>
</template>

<script lang="ts">
  import { config, getSelectConf, shortPaths } from '@/ts/config';
  import { cleanEventListenerDict, createList, getIcon, removeClass, scroll, simpleUpdateLinkPath } from '@/ts/dom';
  import { EFlag, EIcon, flagValues } from '@/ts/enums';
  import {
    addBaseUrl,
    buildHash,
    formatQuery,
    getSearchTagLinks,
    homePath,
    parseQuery,
    parseRoute,
    shortenPath,
  } from '@/ts/path';
  import { chopStr, createErrorFile, destructors, snippetMark } from '@/ts/utils';
  import { exposeToWindow } from '@/ts/window';
  import { importFileTs, importMarkdownTs } from '@/ts/async';
  import Article from '@/vue/Article.vue';
  import { RawLocation, Route } from 'vue-router';
  import { Component, Vue } from 'vue-property-decorator';

  Component.registerHooks([
    'beforeRouteUpdate',
  ]);

  @Component({ components: { Article } })
  export default class Home extends Vue {
    $refs!: {
      toggleZen: HTMLSpanElement;
      toTop: HTMLSpanElement;
    };

    data = '';
    title = '';
    tags: string[] = [];
    date = '';
    updated = '';
    cover = '';
    creator = '';
    updater = '';
    otherFlags: Dict<string> = {};

    anchor = '';
    queryStr = '';

    backlinkFiles: TFile[] = [];
    isLoadingBacklinks = false;
    hasLoadedBacklinks = false;

    isShow = false;
    isError = false;
    isCancel = false;

    metaTheme!: HTMLMetaElement;
    isDark = false;
    isZen = false;
    isToTop = false;
    darkMarks = ['★', '☆'];
    zenMark = '▣';
    toTopMark = 'と';

    favicon = this.config.paths.favicon ? addBaseUrl(this.config.paths.favicon) : '';
    iconSync = getIcon(EIcon.sync);
    iconBacklink = getIcon(EIcon.backlink, 18);

    keyInput = '';
    inputBinds: Dict<() => void> = {};

    shortPaths = shortPaths;
    homePath = homePath;
    homeHash = buildHash({ path: this.shortPaths.index, anchor: '', query: '' });
    selectConf = getSelectConf();

    get config() {
      return config;
    }

    get confList() {
      const multiConf = this.config.multiConf;
      if (!multiConf) {
        return null;
      }
      const keys = Object.keys(multiConf).sort();
      const alias = keys.map(key => multiConf[key].alias || key);
      return [keys, alias];
    }

    get enableMultiConf() {
      return this.selectConf && this.confList && this.confList[0].length > 1;
    }

    get filePath() {
      const { path, anchor, query } = parseRoute(this.$route);
      this.anchor = anchor;
      this.queryStr = query;
      return path;
    }

    get shortFilePath() {
      return shortenPath(this.filePath);
    }

    get rawFilePath() {
      return addBaseUrl(this.filePath);
    }

    get query() {
      return parseQuery(this.queryStr);
    }

    get isIndexFile() {
      return this.filePath === this.config.paths.index;
    }

    get lastUpdatedMessage() {
      return ` | ${this.config.messages.lastUpdated}${this.updater ? ` (${this.updater})` : ''}`;
    }

    get metaThemeColor() {
      return this.isDark ? (this.isZen ? '#2b2b2b' : '#3b3b3b') : (this.isZen ? '#efefef' : '#ffffff');
    }

    // noinspection JSUnusedGlobalSymbols
    created() {
      const homePath = this.homePath;
      const shortFilePath = this.shortFilePath;
      if (document.body.id === 'prerender') {
        let path = homePath;
        if (!this.isIndexFile) {
          path += `#${shortFilePath}`;
        }
        location.href = path + location.search;
        this.isCancel = true;
        return;
      }
      if (location.search) {
        const query = location.search.substr(1) + (this.queryStr ? `&${this.queryStr}` : '');
        location.href = homePath + buildHash({
          path: shortFilePath,
          anchor: this.anchor,
          query: formatQuery(parseQuery(query)),
        });
        this.isCancel = true;
        return;
      }
      if (this.enableMultiConf) {
        const conf = this.query.conf;
        if (conf && this.confList![0].includes(conf) && this.selectConf !== conf) {
          localStorage.setItem('conf', conf);
          this.$router.go(0);
          this.isCancel = true;
          return;
        }
      }
      importMarkdownTs();
      this.getData().then(({ data, flags }) => this.setData(data, flags));
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
        home: () => this.returnHome(),
        gg: () => {
          this.toTop(document.body.offsetHeight);
          this.keyInput += '_';
        },
        G: () => this.toTop(),
        dark: () => this.toggleDark(),
        zen: () => this.toggleZen(),
        Backspace: () => this.keyInput = this.keyInput.replace(/.?Backspace$/, ''),
      });
      // noinspection JSUnusedGlobalSymbols
      exposeToWindow({
        getAxios: async () => {
          return (await importFileTs()).axios;
        },
        version: process.env.VUE_APP_VERSION,
        config: this.config,
        homePath,
        filePath: this.filePath,
        addInputBind: this.addInputBind,
        renderMD: this.renderMD,
        updateDom: this.updateDom,
        destructors,
      });
    }

    // noinspection JSUnusedGlobalSymbols
    mounted() {
      if (this.isCancel) {
        return;
      }
      simpleUpdateLinkPath();
      document.addEventListener('keydown', e => {
        if (document.activeElement && ['INPUT', 'TEXTAREA'].includes(document.activeElement.tagName)) {
          return;
        }
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
      });
    }

    // noinspection JSUnusedGlobalSymbols
    beforeRouteUpdate(to: Route, from: Route, next: (to?: RawLocation | false | ((vm: Vue) => void)) => void) {
      const routeTo = parseRoute(to);
      const routeFrom = parseRoute(from);
      if (routeTo.path === routeFrom.path && routeTo.query === routeFrom.query) {
        return;
      }
      this.isShow = false;
      next();
      exposeToWindow({ filePath: this.filePath });
      cleanEventListenerDict();
      this.getData().then(({ data, flags }) => {
        document.querySelectorAll('.custom').forEach(element => {
          element.remove();
        });
        let destructor = destructors.shift();
        while (destructor) {
          if (typeof destructor === 'function') {
            destructor();
          }
          destructor = destructors.shift();
        }
        this.setData(data, flags);
        scroll(0, false);
      });
    }

    async getData() {
      const filePath = this.filePath;
      if (!filePath.endsWith('.md')) {
        this.isError = true;
        const { data, flags } = createErrorFile(filePath);
        return { data, flags };
      }
      const { getFile } = await importFileTs();
      const promises = [];
      promises.push(getFile(filePath));
      const commonPath = this.config.paths.common;
      if (commonPath && filePath !== commonPath) {
        promises.push(getFile(commonPath));
      }
      const files = await Promise.all(promises);
      const file = files[0];
      let data = file.data;
      const flags = file.flags;
      if (file.isError) {
        this.isError = true;
        return { data, flags };
      }
      this.isError = false;
      if (this.hasLoadedBacklinks) {
        this.getBacklinks().then();
      }
      if (files.length < 2 || files[1].isError) {
        return { data, flags };
      }
      const commonData = files[1].data;
      let headerData = '';
      let footerData = commonData;
      const { key, value } = chopStr(commonData, snippetMark);
      if (value !== null) {
        headerData = key;
        footerData = value;
      }
      if (headerData) {
        data = headerData + '\n\n\n' + data;
      }
      if (footerData) {
        data += '\n\n\n' + footerData;
      }
      return { data, flags };
    }

    setData(data: string, flags: IFlags) {
      this.setFlags(flags);
      this.data = data;
      this.isShow = true;
    }

    setFlags(flags: IFlags) {
      this.title = flags.title;
      document.title = `${this.title}`;
      if (this.config.siteName && this.config.siteName !== this.title) {
        document.title += ` - ${this.config.siteName}`;
      }
      this.tags = flags.tags ? [...flags.tags] : [];
      this.date = flags.startDate || '';
      this.updated = flags.endDate || '';
      this.cover = flags.cover || '';
      this.creator = flags.creator || '';
      this.updater = flags.updater || '';
      this.otherFlags = {};
      Object.keys(flags).forEach(key => {
        if (!flagValues.includes(key as EFlag)) {
          this.otherFlags[key] = flags[key] as string;
        }
      });
    }

    returnHome() {
      if (location.hash) {
        location.hash = this.homeHash;
      }
    }

    confChanged() {
      localStorage.setItem('conf', this.selectConf);
      location.href = this.homePath;
    }

    getSearchTagLinks(tag: string) {
      return getSearchTagLinks(tag);
    }

    async getBacklinks() {
      this.isLoadingBacklinks = true;
      const { getFiles, sortFiles } = await importFileTs();
      const { files, backlinks } = await getFiles();
      const paths = backlinks[this.filePath];
      this.backlinkFiles = paths && paths.length > 0 ? paths.map(path => files[path]).sort(sortFiles) : [];
      this.isLoadingBacklinks = false;
      if (!this.hasLoadedBacklinks) {
        this.hasLoadedBacklinks = true;
      }
    }

    getListHtml(file: TFile) {
      return createList(file).innerHTML;
    }

    toggleDark() {
      this.isDark = !this.isDark;
      this.metaTheme.setAttribute('content', this.metaThemeColor);
      if (this.isDark) {
        document.body.classList.add('dark');
        localStorage.setItem('dark', String(true));
      } else {
        removeClass(document.body, 'dark');
        localStorage.removeItem('dark');
      }
    }

    toggleZen() {
      this.isZen = !this.isZen;
      this.metaTheme.setAttribute('content', this.metaThemeColor);
      if (this.isZen) {
        document.body.classList.add('zen');
        localStorage.setItem('zen', String(true));
      } else {
        this.$nextTick(() => removeClass(this.$refs.toggleZen));
        removeClass(document.body, 'zen');
        localStorage.removeItem('zen');
      }
    }

    toTop(height = 0) {
      if (this.isToTop) {
        return;
      }
      this.isToTop = true;
      scroll(height);
      setTimeout(() => {
        this.isToTop = false;
        this.$nextTick(() => removeClass(this.$refs.toTop));
      }, 500);
    }

    addInputBind(input: string, bind: () => void) {
      this.inputBinds[input] = bind;
    }

    addInputBinds(binds: Dict<() => void>) {
      Object.keys(binds).forEach(key => {
        this.addInputBind(key, binds[key]);
      });
    }

    async renderMD(data?: string) {
      if (!data) {
        return '';
      }
      data = data.trim();
      if (data) {
        const { renderMD: render, replaceInlineScript } = await importMarkdownTs();
        data = replaceInlineScript(this.filePath, data);
        return data ? render(data) : '';
      }
      return '';
    }

    async updateDom() {
      await (await importMarkdownTs()).updateDom();
    }
  }
</script>

<style lang="scss">@import "../scss/home";</style>
