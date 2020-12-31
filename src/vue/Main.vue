<template>
  <transition name="slide-fade">
    <main v-if="isShow" :class="isError ? 'error' : null">
      <div v-if="cover" id="cover" class="center">
        <img :src="cover" alt="cover"/>
      </div>
      <div v-if="!isError" id="bar" class="bar">
        <code v-if="!isIndexFile" class="item-home">
          <a :href="homePath" @click.prevent="returnHome">«</a>
        </code>
        <code v-if="startDate" class="item-date">{{ isIndexFile ? endDate : startDate }}</code>
        <code v-if="creator" class="item-creator">{{ creator }}</code>
        <code v-for="tag of tags" :key="tag" class="item-tag">
          <template v-for="link of getQueryTagLinks(tag)">
            <a :key="link[0]" :href="link[0]">{{ link[1] }}</a>
          </template>
        </code>
        <code v-for="(flag, i) of otherFlags" :key="i" :class="`item-${flag[0]}`">{{ flag[1] }}</code>
        <code class="item-raw">
          <a :href="rawFilePath" target="_blank">{{ config.messages.raw }}</a>
        </code>
      </div>
      <div v-if="!isRedirectPage && redirectFrom[0].length > 0" id="redirect-from">{{ config.messages.redirectFrom }}
        <a v-for="(path, i) of redirectFrom[0]" :key="path" :href="`#${path}`">{{ redirectFrom[1][i] }}</a>
      </div>
      <header>{{ title }}</header>
      <Article :fileData="fileData" :query="query" :showTime="showTime"></Article>
      <div v-if="!isError" id="backlinks">
        <span v-if="!hasLoadedBacklinks" :class="['icon', { sync: isLoadingBacklinks }]"
              v-html="isLoadingBacklinks ? iconSync : iconBacklink"></span>
        <span v-if="isLoadingBacklinks">{{ config.messages.loading }}</span>
        <a v-else-if="!hasLoadedBacklinks" @click="getBacklinks">{{ config.messages.showBacklinks }}</a>
        <template v-else>
          <ul v-if="backlinkFiles.length > 0">
            <li v-for="file of backlinkFiles" :key="file.path" class="article" v-html="getListHtml(file)"></li>
          </ul>
          <span v-else>{{ config.messages.noBacklinks }}</span>
        </template>
      </div>
      <footer v-if="!isIndexFile">
        <a :href="homePath" class="home" @click.prevent="returnHome">{{ config.messages.returnHome }}</a>
        <template v-if="!isError && startDate">
          <span class="filler"></span>
          <span class="date">{{ endDate !== startDate ? endDate + lastUpdatedMessage : startDate }}</span>
        </template>
      </footer>
    </main>
  </transition>
</template>

<script lang="ts">
  import { config, confList, enableMultiConf, getSelectConf } from '@/ts/config';
  import { cleanEventListenerDict, createList, dispatchEvent, getIcon, getQueryTagLinks, scroll } from '@/ts/element';
  import { definedFlags, EEvent, EFlag, EIcon, EMark } from '@/ts/enums';
  import { addBaseUrl, buildHash, formatQuery, parseQuery, parseRoute, returnHome, shortenPath } from '@/ts/path';
  import { getMarkRegExp } from '@/ts/regexp';
  import { state } from '@/ts/store';
  import { chopStr, destructors, snippetMark } from '@/ts/utils';
  import { exposeToWindow } from '@/ts/window';
  import { importFileTs } from '@/ts/async';
  import Article from '@/vue/Article.vue';
  import { RawLocation, Route } from 'vue-router';
  import { Component, Vue, Watch } from 'vue-property-decorator';

  Component.registerHooks([
    'beforeRouteUpdate',
  ]);

  @Component({ components: { Article } })
  export default class Main extends Vue {
    fileTs: TFileTs | null = null;

    fileData = '';
    title = '';
    tags: string[] = [];
    startDate = '';
    endDate = '';
    cover = '';
    creator = '';
    updater = '';
    otherFlags: [string, string][] = [];

    links: string[] = [];
    backlinks: string[] = [];

    backlinkFiles: TFile[] = [];
    isLoadingBacklinks = false;
    hasLoadedBacklinks = false;

    isShow = false;
    showTime = 0;

    isError = false;

    isRedirectPage = false;
    redirectFrom: [string[], string[]] = [[], []];

    get config() {
      return config;
    }

    get homePath() {
      return state.homePath;
    }

    get filePath() {
      const { path, anchor, query } = parseRoute(this.$route);
      state.filePath = path;
      state.anchor = anchor;
      state.queryStr = query;
      return state.filePath;
    }

    get anchor() {
      return state.anchor;
    }

    get queryStr() {
      return state.queryStr;
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

    get iconSync() {
      return getIcon(EIcon.sync);
    }

    get iconBacklink() {
      return getIcon(EIcon.backlink, 18);
    }

    created() {
      const homePath = this.homePath;
      const shortFilePath = this.shortFilePath;
      if (document.body.id === 'prerender') {
        let path = homePath;
        if (!this.isIndexFile) {
          path += `#${shortFilePath}`;
        }
        location.href = path + location.search;
        return;
      }
      if (location.search) {
        const query = location.search.substr(1) + (this.queryStr ? `&${this.queryStr}` : '');
        location.href = homePath + buildHash({
          path: shortFilePath,
          anchor: this.anchor,
          query: formatQuery(parseQuery(query)),
        });
        return;
      }
      if (enableMultiConf) {
        const conf = this.query.conf;
        if (conf && confList![0].includes(conf) && getSelectConf() !== conf) {
          localStorage.setItem('conf', conf);
          location.reload();
          return;
        }
      }
      exposeToWindow({
        mainSelf: this,
        reload: this.reload,
        filePath: this.filePath,
      });
      this.getData().then(({ data, flags, links }) => this.setData(data, flags, links));
    }

    beforeRouteUpdate(to: Route, from: Route, next: (to?: RawLocation | false | ((vm: Vue) => void)) => void) {
      const routeTo = parseRoute(to);
      const routeFrom = parseRoute(from);
      if (routeTo.path === routeFrom.path && routeTo.query === routeFrom.query) {
        return;
      }
      this.isShow = false;
      next();
      exposeToWindow({ filePath: this.filePath });
      if (!this.isRedirectPage) {
        this.redirectFrom = [[], []];
      } else {
        this.isRedirectPage = false;
      }
      this.reload(true);
    }

    reload(toTop = false) {
      cleanEventListenerDict();
      this.getData().then(({ data, flags, links }) => {
        document.querySelectorAll('.custom').forEach(element => element.remove());
        let destructor = destructors.shift();
        while (destructor) {
          if (typeof destructor === 'function') {
            destructor();
          }
          destructor = destructors.shift();
        }
        this.setData(data, flags, links);
        if (toTop) {
          scroll(0, false);
        }
      });
    }

    async getData() {
      if (!this.fileTs) {
        this.fileTs = await importFileTs();
      }
      const filePath = this.filePath;
      if (!filePath.endsWith('.md')) {
        this.isError = true;
        const { data, flags } = this.fileTs.createErrorFile(filePath);
        return { data, flags, links: [] };
      }
      const promises = [];
      promises.push(this.fileTs.getFile(filePath));
      const commonPath = this.config.paths.common;
      if (commonPath && filePath !== commonPath) {
        promises.push(this.fileTs.getFile(commonPath));
      }
      const files = await Promise.all(promises);
      const file = files[0];
      let data = file.data;
      const flags = file.flags;
      const links = Object.values(file.links).filter(link => link.isMarkdown).map(link => link.href);
      if (file.isError) {
        this.isError = true;
        return { data, flags, links };
      }
      this.isError = false;
      let match = data.match(getMarkRegExp(EMark.redirect));
      if (match) {
        match = match[1].match(/^(\/\S+\.md)(?:#(\S+))?(?:\?(\S+))?$/);
        if (match && !this.redirectFrom[0].includes(filePath)) {
          this.isRedirectPage = true;
          this.redirectFrom[0].push(filePath);
          this.redirectFrom[1].push(flags.title);
          const [, path, anchor, query] = match;
          location.hash = buildHash({
            path: shortenPath(path),
            anchor: anchor || this.anchor,
            query: query || this.queryStr,
          });
          return { data, flags, links };
        }
      }
      if (this.hasLoadedBacklinks) {
        this.getBacklinks().then();
      }
      if (files.length < 2 || files[1].isError) {
        return { data, flags, links };
      }
      const commonData = files[1].data;
      let headerData = '';
      let footerData = commonData;
      const [key, value] = chopStr(commonData, snippetMark);
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
      return { data, flags, links };
    }

    setData(data: string, flags: IFlags, links: string[]) {
      this.setFlags(flags);
      this.fileData = data;
      this.links = [...links];
      this.isShow = true;
      this.showTime = new Date().getTime();
      this.$nextTick(() => dispatchEvent(EEvent.mainShown, this.showTime));
    }

    setFlags(flags: IFlags) {
      this.title = flags.title;
      this.tags = flags.tags ? [...flags.tags] : [];
      this.startDate = flags.startDate || '';
      this.endDate = flags.endDate || '';
      this.cover = flags.cover || '';
      this.creator = flags.creator || '';
      this.updater = flags.updater || '';
      this.otherFlags = [];
      Object.keys(flags).sort().forEach(key => {
        if (!definedFlags.includes(key as EFlag)) {
          this.addFlag(key, flags[key] as string, false);
        }
      });
    }

    addFlag(key: string, value: string, sort = true) {
      this.otherFlags.push([key, value]);
      if (sort) {
        this.otherFlags = this.otherFlags.sort((a, b) => a[0].localeCompare(b[0]));
      }
    }

    // noinspection JSUnusedGlobalSymbols
    removeFlag(key: string) {
      for (let i = 0; i < this.otherFlags.length; i++) {
        if (this.otherFlags[i][0] === key) {
          this.otherFlags.splice(i, 1);
          break;
        }
      }
    }

    async getBacklinks() {
      this.isLoadingBacklinks = true;
      if (!this.fileTs) {
        this.fileTs = await importFileTs();
      }
      const { files, backlinks } = await this.fileTs.getFiles();
      const paths = backlinks[this.filePath];
      if (paths && paths.length > 0) {
        this.backlinks = [...paths];
        this.backlinkFiles = paths.map(path => {
          return JSON.parse(JSON.stringify(files[path])) as TFile;
        }).sort(this.fileTs.sortFiles);
      } else {
        this.backlinks = [];
        this.backlinkFiles = [];
      }
      this.isLoadingBacklinks = false;
      if (!this.hasLoadedBacklinks) {
        this.hasLoadedBacklinks = true;
      }
    }

    @Watch('title')
    onTitleChanged() {
      document.title = this.title;
      if (this.config.siteName && this.config.siteName !== this.title) {
        document.title += ` - ${this.config.siteName}`;
      }
    }

    @Watch('cover')
    onCoverChanged() {
      if (this.cover) {
        return;
      }
      const firstElement = this.$el.firstElementChild;
      if (firstElement && firstElement.classList.contains('lds-ellipsis')) {
        firstElement.remove();
      }
    }

    getListHtml(file: TFile) {
      return createList(file).innerHTML;
    }

    getQueryTagLinks(tag: string) {
      return getQueryTagLinks(tag);
    }

    returnHome() {
      returnHome();
    }
  }
</script>
