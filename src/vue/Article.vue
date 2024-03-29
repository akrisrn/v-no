<template>
  <article :class="isRendering ? 'rendering' : null" v-html="html"/>
</template>

<script lang="ts">
  import { config } from '@/ts/config';
  import { dispatchEvent, getSyncSpan, removeClass, scroll } from '@/ts/element';
  import { EEvent, EMark } from '@/ts/enums';
  import { changeAnchor, changeQueryContent } from '@/ts/path';
  import { getAnchorRegExp, getMarkRegExp, getSnippetRegExp } from '@/ts/regexp';
  import { state } from '@/ts/store';
  import { exposeToWindow } from '@/ts/window';
  import { importFileTs, importMarkdownTs } from '@/ts/async';
  import { Component, Prop, Vue } from 'vue-property-decorator';

  @Component
  export default class Article extends Vue {
    @Prop() fileData!: string;
    @Prop() title!: string;
    @Prop() query!: TQuery;
    @Prop() showTime!: number;
    @Prop() redirectTo!: (path: string, anchor?: string, query?: string) => boolean;

    markdownTs!: TMarkdownTs;
    startTime = 0;
    isRendering = true;
    renderData = '';
    asyncResults: TAsyncResult[] = [];
    resultsBeforeRendered: TAsyncResult[] = [];
    heading: THeading | undefined;

    get filePath() {
      return state.filePath;
    }

    get anchor() {
      return state.anchor;
    }

    get queryContent() {
      return this.query.content || '';
    }

    get isSearchFile() {
      return this.filePath === config.paths.search;
    }

    get html() {
      return this.renderData ? this.markdownTs.renderMD(this.renderData) + '<!-- ' + this.showTime + ' -->' : '';
    }

    async created() {
      exposeToWindow({
        articleSelf: this,
        isSearchFile: this.isSearchFile,
      });
      this.markdownTs = await importMarkdownTs();
      this.$watch(() => [this.fileData, this.showTime], () => this.renderMD());
      this.$watch('html', () => {
        this.$nextTick(() => dispatchEvent(EEvent.htmlChanged, new Date().getTime()));
      });
      this.$watch('asyncResults', () => {
        if (this.asyncResults.length === 0) {
          return;
        }
        const result = this.asyncResults[this.asyncResults.length - 1];
        if (this.isRendering) {
          this.resultsBeforeRendered.push(result);
        }
        if (this.markdownTs.updateAsyncScript(result)) {
          this.markdownTs.updateDom().then(this.updateHeading);
        }
      });
      this.$watch('anchor', () => this.scrollToAnchor());
      this.$watch('queryContent', () => changeQueryContent(this.queryContent));
      dispatchEvent(EEvent.articleCreated, new Date().getTime()).then();
      this.renderMD();
    }

    renderMD(data = this.fileData) {
      this.isRendering = true;
      this.startTime = new Date().getTime();
      if (data) {
        data = this.markdownTs.updateInlineScript(this.filePath, this.title, data, false, this.asyncResults);
      }
      if (!data) {
        this.updateRenderData().then(() => this.renderComplete());
        return;
      }
      let match = data.match(getMarkRegExp(EMark.redirect));
      if (match) {
        match = match[1].match(/^(\/\S+\.md)(?:#(\S+))?(?:\?(\S+))?$/);
        if (match) {
          const [, path, anchor, query] = match;
          if (this.redirectTo(path, anchor, query)) {
            return;
          }
        }
      }
      if (this.isSearchFile && this.queryContent || getMarkRegExp(EMark.list).test(data)) {
        importFileTs().then(file => file.getFiles());
      }
      const span = getSyncSpan();
      const loadingData = data.replace(getSnippetRegExp('gm'), span)
          .replace(getMarkRegExp(`(${[EMark.list, EMark.input, EMark.result].join('|')})`, true, 'img'), span)
          .replace(getMarkRegExp(`(${[EMark.number, EMark.count, EMark.time].join('|')})`, false, 'ig'), span);
      this.updateRenderData(loadingData).then(() => {
        this.markdownTs.updateDom().then(this.updateHeading);
        this.markdownTs.updateSnippet(data, [this.filePath], this.asyncResults).then(data => {
          if (!data) {
            this.updateRenderData().then(() => this.renderComplete());
            return;
          }
          this.markdownTs.updateList(data).then(data => {
            if (!data || !this.isSearchFile) {
              this.updateRenderData(data).then(() => this.renderComplete());
              return;
            }
            this.updateRenderData(this.markdownTs.preprocessSearchPage(data)).then(() => {
              this.renderComplete();
              this.markdownTs.updateSearchPage(this.queryContent).then(() => {
                this.markdownTs.updateDom().then(this.updateHeading);
              });
            });
          });
        });
      });
    }

    async updateRenderData(data = '') {
      this.renderData = data;
      await this.$nextTick();
    }

    renderComplete() {
      this.markdownTs.updateDom().then(this.updateHeading).then(() => {
        this.isRendering = false;
        this.$nextTick(() => {
          removeClass(this.$el);
          dispatchEvent(EEvent.rendered, new Date().getTime() - this.startTime, 100);
          this.scrollToAnchor();
        });
        if (this.resultsBeforeRendered.length === 0) {
          return;
        }
        let needUpdate = false;
        let result = this.resultsBeforeRendered.shift();
        while (result) {
          if (this.markdownTs.updateAsyncScript(result) && !needUpdate) {
            needUpdate = true;
          }
          result = this.resultsBeforeRendered.shift();
        }
        if (needUpdate) {
          this.markdownTs.updateDom().then(this.updateHeading);
        }
      });
    }

    scrollToAnchor() {
      if (!getAnchorRegExp().test(this.anchor)) {
        return;
      }
      const element = document.querySelector<HTMLElement>(`article > *[id="${this.anchor}"]`);
      if (element && element.offsetTop > 0) {
        scroll(element.offsetTop - 6);
        changeAnchor(this.anchor);
      }
    }

    updateHeading(heading: THeading) {
      this.heading = heading;
    }
  }
</script>

<style lang="scss">@import "../scss/article";</style>
