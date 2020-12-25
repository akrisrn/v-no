<template>
  <article :class="isRendering ? 'rendering' : null" v-html="html"/>
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

    markdownTs!: TMarkdownTs;
    startTime = 0;
    isRendering = true;
    renderData = '';

    get html() {
      return this.renderData ? this.markdownTs.renderMD(this.renderData) + '<!-- ' + this.showTime + ' -->' : '';
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

    renderMD(data = this.fileData) {
      this.startTime = new Date().getTime();
      this.isRendering = true;
      if (data) {
        data = this.markdownTs.utils.replaceInlineScript(this.filePath, data);
      }
      if (!data) {
        this.renderData = '';
        this.renderComplete();
        return;
      }
      this.renderData = data;
      const { updateCategoryPage, updateDom, updateSearchPage, updateSnippet } = this.markdownTs;
      this.$nextTick(() => {
        Promise.all([
          updateSnippet(data),
          updateDom(),
        ]).then(([newData]) => {
          if (!newData) {
            this.renderData = '';
            this.renderComplete();
            return;
          }
          if (this.isCategoryFile) {
            updateCategoryPage(newData).then(newData => this.updateData(data, newData));
            return;
          }
          this.updateData(data, newData);
          if (this.isSearchFile) {
            this.$nextTick(() => updateSearchPage(this.query.content || ''));
          }
        });
      });
    }

    updateData(data: string, newData: string) {
      if (newData === data) {
        this.renderComplete();
        return;
      }
      this.renderData = newData;
      this.$nextTick(() => {
        this.markdownTs.updateDom().then(() => {
          this.renderComplete();
        });
      });
    }

    renderComplete() {
      this.isRendering = false;
      this.$nextTick(() => {
        removeClass(this.$el);
        dispatchEvent(EEvent.rendered, new Date().getTime() - this.startTime, 100);
        const anchorRegExp = this.markdownTs.utils.getAnchorRegExp();
        if (!anchorRegExp.test(this.anchor)) {
          return;
        }
        const element = document.querySelector<HTMLElement>(`article > *[id="${this.anchor}"]`);
        if (element && element.offsetTop > 0) {
          scroll(element.offsetTop - 6);
        }
      });
    }

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
