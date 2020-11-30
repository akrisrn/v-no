<template>
  <article ref="article" :class="isRendering ? 'rendering' : null" v-html="markdown"/>
</template>

<script lang="ts">
  import { config } from '@/ts/config';
  import { replaceInlineScript, updateCategoryPage, updateSnippet } from '@/ts/data';
  import { removeClass, updateDom, updateSearchPage } from '@/ts/dom';
  import { renderMD } from '@/ts/markdown';
  import scroll from '@/ts/scroll';
  import { exposeToWindow } from '@/ts/window';
  import { Component, Prop, Vue } from 'vue-property-decorator';

  @Component
  export default class Article extends Vue {
    @Prop() filePath!: string;
    @Prop() data!: string;
    @Prop() query!: Dict<string>;
    @Prop() hash!: string;

    $refs!: {
      article: HTMLElement;
    };
    mdData = this.data ? replaceInlineScript(this.data) : '';
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
      if (this.mdData) {
        this.markdown = renderMD(this.mdData);
        this.$nextTick(() => updateDom());
        updateSnippet(this.mdData).then(data => {
          if (this.isCategoryFile) {
            if (data) {
              updateCategoryPage(data).then(data => this.updateData(data));
            } else {
              this.updateData(data);
            }
          } else {
            this.updateData(data);
            if (this.isSearchFile) {
              this.$nextTick(() => updateSearchPage(this.query));
            }
          }
        });
      } else {
        this.renderComplete();
      }
      exposeToWindow({
        renderMD: (data: string) => {
          data = data.trim();
          if (data) {
            data = replaceInlineScript(data);
          }
          return data ? renderMD(data) : '';
        },
        updateDom: () => updateDom(),
      });
    }

    updateData(data: string) {
      if (data !== this.mdData) {
        if (data) {
          this.markdown = renderMD(data);
          this.$nextTick(() => {
            updateDom();
            this.renderComplete();
          });
          return;
        }
        this.markdown = '';
      }
      this.renderComplete();
    }

    renderComplete() {
      this.isRendering = false;
      this.$nextTick(() => {
        removeClass(this.$refs.article);
        if (/^h[2-6]-\d+$/.test(this.hash)) {
          const heading = document.querySelector<HTMLHeadingElement>(`article > *[id="${this.hash}"]`);
          if (heading) {
            scroll(heading.offsetTop - 6);
          }
        }
      });
    }
  }
</script>

<style lang="scss">@import "../scss/article";</style>
