<template>
  <article :class="isRendering ? 'rendering' : null" v-html="html"/>
</template>

<script lang="ts">
  import { config } from '@/ts/config';
  import { dispatchEvent, removeClass, scroll } from '@/ts/element';
  import { EEvent } from '@/ts/enums';
  import { changeAnchor, changeQueryContent } from '@/ts/path';
  import { getAnchorRegExp } from '@/ts/regexp';
  import { state } from '@/ts/store';
  import { exposeToWindow } from '@/ts/window';
  import { importMarkdownTs } from '@/ts/async';
  import { Component, Prop, Vue, Watch } from 'vue-property-decorator';

  @Component
  export default class Article extends Vue {
    @Prop() fileData!: string;
    @Prop() query!: TQuery;
    @Prop() showTime!: number;

    markdownTs!: TMarkdownTs;
    startTime = 0;
    isRendering = true;
    renderData = '';

    get filePath() {
      return state.filePath;
    }

    get anchor() {
      return state.anchor;
    }

    get queryContent() {
      return this.query.content || '';
    }

    get html() {
      return this.renderData ? this.markdownTs.renderMD(this.renderData) + '<!-- ' + this.showTime + ' -->' : '';
    }

    get isSearchFile() {
      return this.filePath === config.paths.search;
    }

    async created() {
      exposeToWindow({ articleSelf: this });
      this.markdownTs = await importMarkdownTs();
      dispatchEvent(EEvent.articleCreated, new Date().getTime()).then();
      this.renderMD();
    }

    renderMD(data = this.fileData) {
      this.startTime = new Date().getTime();
      this.isRendering = true;
      if (data) {
        data = this.markdownTs.replaceInlineScript(this.filePath, data);
      }
      if (!data) {
        this.updateData('');
        return;
      }
      this.renderData = data;
      const { preprocessSearchPage, updateList, updateDom, updateSearchPage, updateSnippet } = this.markdownTs;
      this.$nextTick(() => {
        Promise.all([
          updateSnippet(data),
          updateDom(),
        ]).then(([newData]) => {
          if (!newData) {
            this.updateData('');
            return;
          }
          updateList(newData).then(newData => {
            if (!this.isSearchFile) {
              this.updateData(newData, data);
              return;
            }
            this.updateData(preprocessSearchPage(newData), data);
            this.$nextTick(() => updateSearchPage(this.queryContent));
          });
        });
      });
    }

    updateData(newData: string, data?: string) {
      if (data !== undefined && newData === data) {
        this.renderComplete();
        return;
      }
      this.renderData = newData;
      this.$nextTick(() => {
        this.markdownTs.updateDom().then(() => this.renderComplete());
      });
    }

    renderComplete() {
      this.isRendering = false;
      this.$nextTick(() => {
        removeClass(this.$el);
        dispatchEvent(EEvent.rendered, new Date().getTime() - this.startTime, 100);
        this.scrollToAnchor();
      });
    }

    @Watch('anchor')
    scrollToAnchor() {
      const anchorRegExp = getAnchorRegExp();
      if (!anchorRegExp.test(this.anchor)) {
        return;
      }
      const element = document.querySelector<HTMLElement>(`article > *[id="${this.anchor}"]`);
      if (element && element.offsetTop > 0) {
        scroll(element.offsetTop - 6);
        changeAnchor(this.anchor);
      }
    }

    @Watch('queryContent')
    onQueryContentChanged() {
      changeQueryContent(this.queryContent);
    }

    @Watch('fileData')
    @Watch('showTime')
    onShowTimeChanged() {
      this.renderMD();
    }

    @Watch('html')
    onHTMLChanged() {
      this.$nextTick(() => dispatchEvent(EEvent.htmlChanged, new Date().getTime()));
    }
  }
</script>
