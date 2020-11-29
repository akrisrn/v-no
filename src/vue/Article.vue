<template>
  <article ref="article" :class="isRendering ? 'rendering' : null" v-html="markdown"/>
</template>

<script lang="ts">
  import { renderMD } from '@/ts/markdown';
  import { updateCategoryPage, updateDom, updateSearchPage, updateSnippet } from '@/ts/update';
  import { removeClass, replaceInlineScript } from '@/ts/utils';
  import { config } from '@/ts/config';
  import { Component, Prop, Vue } from 'vue-property-decorator';

  @Component
  export default class Article extends Vue {
    @Prop() filePath!: string;
    @Prop() data!: string;
    @Prop() query!: Dict<string>;

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
    }

    updateData(data: string) {
      if (data !== this.mdData) {
        if (data) {
          this.markdown = renderMD(data);
          this.$nextTick(() => {
            updateDom();
            this.renderComplete();
          });
        } else {
          this.markdown = '';
          this.renderComplete();
        }
      } else {
        this.renderComplete();
      }
    }

    renderComplete() {
      this.isRendering = false;
      this.$nextTick(() => removeClass(this.$refs.article));
    }
  }
</script>

<style lang="scss">@import "../scss/article";</style>
