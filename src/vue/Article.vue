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

    get sourceData() {
      return this.fileData ? this.markdownTs.utils.replaceInlineScript(this.filePath, this.fileData) : '';
    }

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

    @Watch('showTime')
    renderMD() {
      this.startTime = new Date().getTime();
      this.isRendering = true;
      if (this.updateRenderData(this.sourceData)) {
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
      if (this.updateRenderData(data)) {
        return;
      }
      this.$nextTick(() => {
        this.markdownTs.updateDom().then(() => {
          this.renderComplete();
        });
      });
    }

    updateRenderData(data: string) {
      if (data) {
        this.renderData = data;
        return false;
      }
      this.renderData = '';
      this.renderComplete();
      return true;
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

    @Watch('html')
    onHTMLChanged() {
      this.$nextTick(() => dispatchEvent(EEvent.htmlChanged, new Date().getTime()));
    }
  }
</script>
