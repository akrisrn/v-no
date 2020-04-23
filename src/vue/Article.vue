<template>
    <article :class="classObject" v-html="markdown"/>
</template>

<script lang="ts">
  import { renderMD } from '@/ts/markdown';
  import {
    updateCategoryList,
    updateDD,
    updateFootnote,
    updateHeading,
    updateImagePath,
    updateIndexList,
    updateLinkPath,
    updateSearchList,
    updateTable,
    updateTextCount,
    updateToc,
  } from '@/ts/update';
  import Prism from 'prismjs';
  import { Component, Prop, PropSync, Vue } from 'vue-property-decorator';

  @Component
  export default class Article extends Vue {
    @PropSync('data') public syncData!: string;
    @Prop() public isIndex!: boolean;
    @Prop() public isCategory!: boolean;
    @Prop() public isSearch!: boolean;
    @Prop() public params!: { [index: string]: string | undefined };

    public classObject = [{
      index: this.isIndex,
    }, 'markdown-body'];

    public get markdown() {
      return renderMD(this.syncData, this.isCategory);
    }

    // noinspection JSUnusedGlobalSymbols
    public created() {
      // @ts-ignore
      window.renderMD = (data: string) => renderMD(data, false, true);
      // @ts-ignore
      window.updateMD = () => {
        updateDD();
        updateTable();
        updateHeading();
        updateImagePath();
        updateLinkPath(false);
        updateTextCount();
        Prism.highlightAll();
      };
    }

    // noinspection JSUnusedGlobalSymbols
    public mounted() {
      // 规避 mount 后仍然可以查询到旧节点的问题。
      setTimeout(() => {
        updateDD();
        updateToc();
        updateTable();
        updateHeading();
        updateFootnote();
        updateImagePath();
        updateLinkPath(this.isCategory);
        if (this.isCategory) {
          updateCategoryList(this.syncData, this.updateData, this.isCategory);
        } else if (this.isSearch) {
          updateSearchList(this.params, this.isCategory);
        } else if (this.isIndex) {
          updateIndexList(this.isCategory);
        }
        updateTextCount();
        Prism.highlightAll();
      }, 0);
    }

    public updateData(data: string) {
      this.syncData = data;
    }
  }
</script>

<style lang="stylus">@import '../styl/article.styl'</style>
