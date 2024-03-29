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
        <code v-for="(tag, i) of tags" :key="i" class="item-tag">
          <template v-for="(link, j) of getQueryTagLinks(tag)">
            <a :key="j" :href="link.href">{{ link.text }}</a>
          </template>
        </code>
        <code v-for="(flag, i) of otherFlags" :key="i" :class="`item-${flag.key}`">{{ flag.value }}</code>
        <code class="item-raw">
          <a :href="rawFilePath" target="_blank">{{ conf.messages.raw }}</a>
        </code>
      </div>
      <div v-if="!isRedirectPage && redirectFrom[0].length > 0" id="redirect-from">
        <span>{{ conf.messages.redirectFrom }}</span>
        <a v-for="(path, i) of redirectFrom[0]" :key="i" :href="`#${path}`">{{ redirectFrom[1][i] }}</a>
      </div>
      <header>{{ title }}</header>
      <Article :fileData="fileData" :query="query" :redirectTo="redirectTo" :showTime="showTime"
               :title="title"></Article>
      <div v-if="!isError" id="backlinks">
        <span v-if="!hasLoadedBacklinks" :class="['icon', { sync: isLoadingBacklinks }]"
              v-html="isLoadingBacklinks ? iconSync : iconBacklink"></span>
        <span v-if="isLoadingBacklinks">{{ conf.messages.loading }}</span>
        <a v-else-if="!hasLoadedBacklinks" @click="loadBacklinks">{{ conf.messages.showBacklinks }}</a>
        <template v-else>
          <ul v-if="backlinkFiles.length > 0">
            <li v-for="(file, i) of backlinkFiles" :key="i" class="article" v-html="getListHtml(file)"></li>
          </ul>
          <span v-else>{{ conf.messages.noBacklinks }}</span>
        </template>
      </div>
      <footer v-if="!isIndexFile">
        <a :href="homePath" class="home" @click.prevent="returnHome">{{ conf.messages.returnHome }}</a>
        <template v-if="!isError && startDate">
          <span class="filler"></span>
          <span class="date">{{ endDate !== startDate ? endDate + lastUpdatedMessage : startDate }}</span>
        </template>
      </footer>
    </main>
    <div v-else-if="initing" class="lds-ellipsis initing">
      <div v-for="i in 4" :key="i"></div>
    </div>
  </transition>
</template>

<script lang="ts">
  import { config, confList, enableMultiConf, getSelectConf } from '@/ts/config';
  import { cleanEventListenerDict, createList, dispatchEvent, getIcon, getQueryTagLinks, scroll } from '@/ts/element';
  import { EEvent, EFlag, EIcon, EMark } from '@/ts/enums';
  import { addBaseUrl, buildHash, formatQuery, parseQuery, parseRoute, returnHome, shortenPath } from '@/ts/path';
  import { getMarkRegExp } from '@/ts/regexp';
  import * as localStorage from '@/ts/storage';
  import { state } from '@/ts/store';
  import { chopStr, definedFlags, destructors } from '@/ts/utils';
  import { exposeToWindow } from '@/ts/window';
  import { importFileTs } from '@/ts/async';
  import Article from '@/vue/Article.vue';
  import { RawLocation, Route } from 'vue-router';
  import { Component, Vue } from 'vue-property-decorator';

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
    otherFlags: TFlag[] = [];

    links: string[] = [];
    backlinks: string[] = [];

    backlinkFiles: ISimpleFile[] = [];
    isLoadingBacklinks = false;
    hasLoadedBacklinks = false;

    showTime = 0;
    isShow = false;
    isError = false;

    isRedirectPage = false;
    redirectFrom: TRedirectList = [[], []];

    initing = true;

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

    get conf() {
      return config;
    }

    get isIndexFile() {
      return this.filePath === this.conf.paths.index;
    }

    get lastUpdatedMessage() {
      return ` | ${this.conf.messages.lastUpdated}${this.updater ? ` (${this.updater})` : ''}`;
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
        if (conf && confList[0].includes(conf) && getSelectConf() !== conf) {
          localStorage.setItem('conf', conf);
          location.reload();
          return;
        }
      }
      exposeToWindow({
        mainSelf: this,
        isIndexFile: this.isIndexFile,
        reload: this.reload,
      });
      this.$watch('title', () => {
        let title = this.title;
        const siteName = this.conf.siteName;
        if (siteName && siteName !== this.title) {
          title += ` - ${siteName}`;
        }
        document.title = title;
      });
      this.$watch('cover', () => {
        if (this.cover) {
          return;
        }
        const firstElement = this.$el.firstElementChild;
        if (firstElement && firstElement.classList.contains('lds-ellipsis')) {
          firstElement.remove();
        }
      });
      dispatchEvent(EEvent.mainCreated, new Date().getTime());
      this.getData().then(fileData => {
        this.setData(fileData);
        this.initing = false;
      });
    }

    beforeRouteUpdate(to: Route, from: Route, next: (to?: RawLocation | false | ((vm: Vue) => void)) => void) {
      const routeTo = parseRoute(to);
      const routeFrom = parseRoute(from);
      if (routeTo.path === routeFrom.path && routeTo.query === routeFrom.query) {
        if (routeTo.anchor !== routeFrom.anchor) {
          state.anchor = routeTo.anchor;
        }
        return;
      }
      this.isShow = false;
      next();
      if (!this.isRedirectPage) {
        this.redirectFrom = [[], []];
      } else {
        this.isRedirectPage = false;
      }
      this.reload(true);
    }

    reload(toTop = false) {
      cleanEventListenerDict();
      this.getData().then(fileData => {
        document.querySelectorAll('.custom').forEach(element => element.remove());
        let destructor = destructors.shift();
        while (destructor) {
          if (typeof destructor === 'function') {
            destructor();
          }
          destructor = destructors.shift();
        }
        this.setData(fileData);
        if (toTop) {
          scroll(0, false);
        }
      });
    }

    async getData(): Promise<TFileData | undefined> {
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
      const commonPath = this.conf.paths.common;
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
      if (this.hasLoadedBacklinks) {
        this.loadBacklinks().then();
      }
      if (getMarkRegExp(EMark.noCommon).test(data)) {
        data = data.replace(getMarkRegExp(EMark.noCommon, true, 'img'), '');
        return { data, flags, links };
      }
      if (files.length < 2 || files[1].isError) {
        return { data, flags, links };
      }
      const commonData = files[1].data;
      let headerData = '';
      let footerData = commonData;
      const [key, value] = chopStr(commonData, '--8<--');
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

    setData(fileData?: TFileData) {
      if (!fileData) {
        return;
      }
      this.setFlags(fileData.flags);
      this.fileData = fileData.data;
      this.links = fileData.links;
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
          this.addFlag(key, flags[key] as string);
        }
      });
      exposeToWindow({
        title: this.title,
        filePath: this.filePath,
      });
    }

    addFlag(key: string, value: string) {
      const flag: TFlag = { key, value };
      this.otherFlags.push(flag);
      return flag;
    }

    // noinspection JSUnusedGlobalSymbols
    removeFlag(key: string) {
      for (let i = 0; i < this.otherFlags.length; i++) {
        if (this.otherFlags[i].key === key) {
          this.otherFlags.splice(i, 1);
          return i;
        }
      }
      return -1;
    }

    redirectTo(path: string, anchor?: string, query?: string) {
      if (this.redirectFrom[0].includes(this.filePath)) {
        return false;
      }
      this.isRedirectPage = true;
      this.redirectFrom[0].push(this.filePath);
      this.redirectFrom[1].push(this.title);
      location.hash = buildHash({
        path: shortenPath(path),
        anchor: anchor || this.anchor,
        query: query || this.queryStr,
      });
      return true;
    }

    async loadBacklinks() {
      this.isLoadingBacklinks = true;
      if (!this.fileTs) {
        this.fileTs = await importFileTs();
      }
      const { files, backlinks } = await this.fileTs.getFiles();
      const paths = backlinks[this.filePath];
      if (paths && paths.length > 0) {
        this.backlinks = [...paths];
        this.backlinkFiles = paths.map(path => {
          const file = files[path];
          return {
            path: file.path,
            flags: JSON.parse(JSON.stringify(file.flags)),
          } as ISimpleFile;
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

    getListHtml(file: ISimpleFile) {
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

<style lang="scss">@import "../scss/main";</style>
