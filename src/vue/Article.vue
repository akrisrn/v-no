<template>
  <article ref="article" :class="isRendering ? 'rendering' : null" v-html="html"/>
</template>

<script lang="ts">
  import { config } from '@/ts/config';
  import { dispatchEvent, removeClass, scroll } from '@/ts/element';
  import { EEvent } from '@/ts/enums';
  import { Component, Prop, Vue, Watch } from 'vue-property-decorator';
  import { importMarkdownTs } from '@/ts/async';
  import { exposeToWindow } from '@/ts/window';

  @Component
  export default class Article extends Vue {
    @Prop() filePath!: string;
    @Prop() data!: string;
    @Prop() anchor!: string;
    @Prop() query!: TQuery;
    @Prop() showTime!: number;

    $refs!: {
      article: HTMLElement;
    };
    markdown!: TMarkdownTs;
    timeStart = 0;
    isRendering = true;
    html = '';

    get sourceData() {
      return this.data ? this.markdown.utils.replaceInlineScript(this.filePath, this.data) : '';
    }

    get isCategoryFile() {
      return this.filePath === config.paths.category;
    }

    get isSearchFile() {
      return this.filePath === config.paths.search;
    }

    // noinspection JSUnusedGlobalSymbols
    async created() {
      exposeToWindow({ articleSelf: this });
      this.markdown = await importMarkdownTs();
      this.renderMD();
    }

    @Watch('showTime')
    renderMD() {
      this.timeStart = new Date().getTime();
      this.isRendering = true;
      if (!this.sourceData) {
        this.html = '';
        this.renderComplete();
        return;
      }
      const { renderMD, updateCategoryPage, updateDom, updateSearchPage, updateSnippet } = this.markdown;
      this.html = renderMD(this.sourceData);
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
      if (!data) {
        this.html = '';
        this.renderComplete();
        return;
      }
      const { renderMD, updateDom } = this.markdown;
      this.html = renderMD(data);
      this.$nextTick(() => {
        updateDom().then(() => {
          this.renderComplete();
        });
      });
    }

    renderComplete() {
      this.isRendering = false;
      this.$nextTick(() => {
        removeClass(this.$refs.article);
        const anchorRegExp = this.markdown.utils.getAnchorRegExp();
        if (!anchorRegExp.test(this.anchor)) {
          return;
        }
        const element = document.querySelector<HTMLElement>(`article > *[id="${this.anchor}"]`);
        if (element && element.offsetTop > 0) {
          scroll(element.offsetTop - 6);
        }
      });
      dispatchEvent(EEvent.rendered, new Date().getTime() - this.timeStart, 100);
    }
  }
</script>

<style lang="scss">@import "../scss/article";</style>
