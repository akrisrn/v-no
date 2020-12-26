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
          <template v-for="link of getSearchTagLinks(tag)">
            <a :key="link[0]" :href="link[0]">{{ link[1] }}</a>
          </template>
        </code>
        <code v-for="(flag, i) of otherFlags" :key="i" :class="`item-${flag[0]}`">{{ flag[1] }}</code>
        <code class="item-raw">
          <a :href="rawFilePath" target="_blank">{{ config.messages.raw }}</a>
        </code>
      </div>
      <header>{{ title }}</header>
      <Article :anchor="anchor" :fileData="fileData" :filePath="filePath" :query="query" :showTime="showTime"></Article>
      <div v-if="!isError" id="backlinks">
        <div v-if="!hasLoadedBacklinks" :class="['icon', { loading: isLoadingBacklinks }]"
             v-html="isLoadingBacklinks ? iconSync : iconBacklink"></div>
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
  import { bang } from '@/ts';
  import { config, confList, enableMultiConf, getSelectConf } from '@/ts/config';
  import {
    cleanEventListenerDict,
    createList,
    getIcon,
    getSearchTagLinks,
    scroll,
    simpleUpdateLinkPath,
  } from '@/ts/element';
  import { definedFlags, EFlag, EIcon } from '@/ts/enums';
  import { addBaseUrl, buildHash, formatQuery, parseQuery, parseRoute, returnHome, shortenPath } from '@/ts/path';
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

    anchor = '';
    queryStr = '';

    links: string[] = [];
    backlinks: string[] = [];

    backlinkFiles: TFile[] = [];
    isLoadingBacklinks = false;
    hasLoadedBacklinks = false;

    isShow = false;
    showTime = 0;

    isError = false;
    isCancel = false;

    get homePath() {
      return state.homePath;
    }

    get config() {
      return config;
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
      if (enableMultiConf) {
        const conf = this.query.conf;
        if (conf && confList![0].includes(conf) && getSelectConf() !== conf) {
          localStorage.setItem('conf', conf);
          location.reload();
          this.isCancel = true;
          return;
        }
      }
      exposeToWindow({
        mainSelf: this,
        reload: this.reload,
        filePath: this.filePath,
      });
      bang();
      this.getData().then(({ data, flags, links }) => this.setData(data, flags, links));
    }

    mounted() {
      if (this.isCancel) {
        return;
      }
      simpleUpdateLinkPath();
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
      const { createErrorFile, getFile } = this.fileTs;
      const filePath = this.filePath;
      if (!filePath.endsWith('.md')) {
        this.isError = true;
        const { data, flags, links } = createErrorFile(filePath);
        return { data, flags, links };
      }
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
      const links = file.links;
      if (file.isError) {
        this.isError = true;
        return { data, flags, links };
      }
      this.isError = false;
      if (this.hasLoadedBacklinks) {
        this.getBacklinks().then();
      }
      if (files.length < 2 || files[1].isError) {
        return { data, flags, links };
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
      return { data, flags, links };
    }

    setData(data: string, flags: IFlags, links: string[]) {
      this.setFlags(flags);
      this.fileData = data;
      this.links = [...links];
      this.isShow = true;
      this.showTime = new Date().getTime();
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
      const { getFiles, sortFiles } = this.fileTs;
      const { files, backlinks } = await getFiles();
      const paths = backlinks[this.filePath];
      if (paths && paths.length > 0) {
        this.backlinks = [...paths];
        this.backlinkFiles = paths.map(path => {
          return JSON.parse(JSON.stringify(files[path])) as TFile;
        }).sort(sortFiles);
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

    getListHtml(file: TFile) {
      return createList(file).innerHTML;
    }

    getSearchTagLinks(tag: string) {
      return getSearchTagLinks(tag);
    }

    returnHome() {
      returnHome();
    }
  }
</script>
