<template>
  <article class="markdown-body" v-html="markdown"/>
</template>

<script lang="ts">
  import { renderMD } from '@/ts/markdown';
  import {
    updateCategoryList,
    updateDD,
    updateFootnote,
    updateImagePath,
    updateLinkPath,
    updateSearchList,
    updateToc,
  } from '@/ts/update';
  import { exposeToWindow } from '@/ts/utils';
  import { config } from '@/ts/config';
  import Prism from 'prismjs';
  import { Component, Prop, PropSync, Vue } from 'vue-property-decorator';

  @Component
  export default class Article extends Vue {
    @PropSync('data') syncData!: string;
    @Prop() path!: string;
    @Prop() params!: Dict<string>;

    get markdown() {
      return renderMD(this.path, this.syncData, this.isCategory);
    }

    get isCategory() {
      return this.path === config.paths.category;
    }

    get isSearch() {
      return this.path === config.paths.search;
    }

    // noinspection JSUnusedGlobalSymbols
    created() {
      // noinspection JSUnusedGlobalSymbols
      exposeToWindow({
        renderMD: (data: string) => renderMD(this.path, data),
        updateMD: () => {
          updateDD();
          updateToc();
          updateFootnote();
          updateImagePath();
          updateLinkPath();
          Prism.highlightAll();
        },
      });
    }

    // noinspection JSUnusedGlobalSymbols
    mounted() {
      // 规避 mount 后仍然可以查询到旧节点的问题。
      setTimeout(() => {
        updateDD();
        updateToc();
        updateFootnote();
        updateImagePath();
        updateLinkPath();
        if (this.isCategory) {
          updateCategoryList(this.syncData, (data: string) => {
            this.syncData = data;
          });
        } else if (this.isSearch) {
          updateSearchList(this.params);
        }
        Prism.highlightAll();
      }, 0);
    }
  }
</script>

<style lang="scss">@import "../scss/article";</style>
