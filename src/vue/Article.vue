<template>
  <article ref="article" :class="isRendering ? 'rendering' : null" v-html="html"/>
</template>

<script lang="ts">
  import { config } from '@/ts/config';
  import { dispatchEvent, removeClass, scroll } from '@/ts/element';
  import { EEvent } from '@/ts/enums';
  import { exposeToWindow } from '@/ts/window';
  import { importMarkdownTs } from '@/ts/async';
  import { Component, Prop, Vue, Watch } from 'vue-property-decorator';

  @Component
  export default class Article extends Vue {
    @Prop() filePath!: string;
    @Prop() fileData!: string;
    @Prop() anchor!: string;
    @Prop() query!: TQuery;
    @Prop() showTime!: number;

    $refs!: {
      article: HTMLElement;
    };
    markdownTs!: TMarkdownTs;
    startTime = 0;
    isRendering = true;
    html = '';
    renderData = '';

    get sourceData() {
      return this.fileData ? this.markdownTs.utils.replaceInlineScript(this.filePath, this.fileData) : '';
    }

    get isCategoryFile() {
      return this.filePath === config.paths.category;
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

    @Watch('showTime')
    renderMD() {
      this.startTime = new Date().getTime();
      this.isRendering = true;
      if (this.updateHtml(this.sourceData)) {
        return;
      }
      const { updateCategoryPage, updateDom, updateSearchPage, updateSnippet } = this.markdownTs;
      this.$nextTick(() => {
        Promise.all([
          updateSnippet(this.sourceData),
          updateDom(),
        ]).then(([data]) => {
          if (!this.isCategoryFile) {
            this.updateData(data);
            if (this.isSearchFile) {
              this.$nextTick(() => updateSearchPage(this.query.content || ''));
            }
          } else if (data) {
            updateCategoryPage(data).then(data => this.updateData(data));
          } else {
            this.updateData(data);
          }
        });
      });
    }

    updateData(data: string) {
      if (data === this.sourceData) {
        this.renderComplete();
        return;
      }
      if (this.updateHtml(data)) {
        return;
      }
      this.$nextTick(() => {
        this.markdownTs.updateDom().then(() => {
          this.renderComplete();
        });
      });
    }

    updateHtml(data: string) {
      if (!data) {
        this.html = '';
        this.renderData = '';
        this.renderComplete();
        return true;
      }
      this.html = this.markdownTs.renderMD(data) + '<!-- ' + this.showTime + ' -->';
      this.renderData = data;
      return false;
    }

    renderComplete() {
      this.isRendering = false;
      this.$nextTick(() => {
        removeClass(this.$refs.article);
        const anchorRegExp = this.markdownTs.utils.getAnchorRegExp();
        if (!anchorRegExp.test(this.anchor)) {
          return;
        }
        const element = document.querySelector<HTMLElement>(`article > *[id="${this.anchor}"]`);
        if (element && element.offsetTop > 0) {
          scroll(element.offsetTop - 6);
        }
      });
      dispatchEvent(EEvent.rendered, new Date().getTime() - this.startTime, 100);
    }

    @Watch('html')
    onHTMLChanged() {
      dispatchEvent(EEvent.htmlChanged, new Date().getTime());
    }
  }
</script>
