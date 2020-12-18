<template>
  <article ref="article" :class="isRendering ? 'rendering' : null" v-html="markdown"/>
</template>

<script lang="ts">
  import { config } from '@/ts/config';
  import { replaceInlineScript, updateCategoryPage, updateSnippet } from '@/ts/data';
  import { removeClass, scroll, updateDom, updateSearchPage } from '@/ts/dom';
  import { renderMD } from '@/ts/markdown';
  import { getAnchorRegExp } from '@/ts/regexp';
  import { renderedEvent } from '@/ts/utils';
  import { exposeToWindow } from '@/ts/window';
  import { Component, Prop, Vue } from 'vue-property-decorator';

  @Component
  export default class Article extends Vue {
    @Prop() filePath!: string;
    @Prop() data!: string;
    @Prop() anchor!: string;
    @Prop() query!: TQuery;

    $refs!: {
      article: HTMLElement;
    };
    mdData = this.data ? replaceInlineScript(this.filePath, this.data) : '';
    markdown = '';
    isRendering = true;

    get isCategoryFile() {
      return this.filePath === config.paths.category;
    }

    get isSearchFile() {
      return this.filePath === config.paths.search;
    }

    // noinspection JSUnusedGlobalSymbols
    created() {
      exposeToWindow({
        renderMD: (data: string) => {
          data = data.trim();
          if (data) {
            data = replaceInlineScript(this.filePath, data);
          }
          return data ? renderMD(data) : '';
        },
        updateDom: () => updateDom(),
      });
      if (!this.mdData) {
        this.renderComplete();
        return;
      }
      this.markdown = renderMD(this.mdData);
      this.$nextTick(() => updateDom());
      updateSnippet(this.mdData).then(data => {
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
    }

    updateData(data: string) {
      if (data === this.mdData) {
        this.renderComplete();
        return;
      }
      if (!data) {
        this.markdown = '';
        this.renderComplete();
        return;
      }
      this.markdown = renderMD(data);
      this.$nextTick(() => {
        updateDom();
        this.renderComplete();
      });
    }

    renderComplete() {
      this.isRendering = false;
      this.$nextTick(() => {
        removeClass(this.$refs.article);
        if (!getAnchorRegExp().test(this.anchor)) {
          return;
        }
        const heading = document.querySelector<HTMLHeadingElement>(`article > *[id="${this.anchor}"]`);
        if (heading) {
          scroll(heading.offsetTop - 6);
        }
      });
      setTimeout(() => {
        document.dispatchEvent(renderedEvent);
      }, 100);
    }
  }
</script>

<style lang="scss">@import "../scss/article";</style>
