<template>
  <article class="markdown-body" v-html="markdown"/>
</template>

<script lang="ts">
  import { renderMD } from '@/ts/markdown';
  import { updateCategoryList, updateDom, updateSearchList, updateSnippet } from '@/ts/update';
  import { exposeToWindow } from '@/ts/utils';
  import { config } from '@/ts/config';
  import { Component, Prop, PropSync, Vue } from 'vue-property-decorator';

  @Component
  export default class Article extends Vue {
    @PropSync('data') syncData!: string;
    @Prop() path!: string;
    @Prop() params!: Dict<string>;

    get markdown() {
      return renderMD(this.path, this.syncData);
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
          updateSnippet(this.syncData).then(data => {
            this.syncData = data;
            setTimeout(() => {
              updateDom();
            }, 0);
          });
          updateDom();
        },
      });
    }

    // noinspection JSUnusedGlobalSymbols
    mounted() {
      updateSnippet(this.syncData).then(data => {
        if (this.isCategory) {
          updateCategoryList(data).then(data => {
            this.syncData = data;
            setTimeout(() => {
              updateDom();
            }, 0);
          });
        } else {
          this.syncData = data;
          setTimeout(() => {
            if (this.isSearch) {
              updateSearchList(this.params);
            }
            updateDom();
          }, 0);
        }
      });
      setTimeout(() => {
        updateDom();
      }, 0);
    }
  }
</script>

<style lang="scss">@import "../scss/article";</style>
