<template>
  <article class="markdown-body" v-html="markdown"/>
</template>

<script lang="ts">
  import { renderMD } from '@/ts/markdown';
  import { updateCategoryPage, updateDom, updateSearchPage, updateSnippet } from '@/ts/update';
  import { exposeToWindow, replaceInlineScript } from '@/ts/utils';
  import { config } from '@/ts/config';
  import { noRequest, resetRequestCount } from '@/ts/file';
  import { Component, Prop, Vue } from 'vue-property-decorator';

  @Component
  export default class Article extends Vue {
    @Prop() data!: string;
    @Prop() path!: string;
    @Prop() query!: Dict<string>;

    mdData = this.data ? replaceInlineScript(this.data) : '';
    markdown = this.mdData ? renderMD(this.mdData) : '';

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
        renderMD: (data: string) => {
          data = data.trim();
          if (data) {
            data = replaceInlineScript(data);
          }
          return data ? renderMD(data) : '';
        },
        updateMD: () => {
          if (this.mdData) {
            resetRequestCount();
            updateSnippet(this.mdData).then(data => this.updateData(data));
          }
          setTimeout(() => updateDom(), 0);
        },
      });
    }

    // noinspection JSUnusedGlobalSymbols
    mounted() {
      if (this.mdData) {
        resetRequestCount();
        updateSnippet(this.mdData).then(data => {
          if (this.isCategory) {
            if (data) {
              updateCategoryPage(data).then(data => this.updateData(data));
            } else {
              this.updateData(data);
            }
          } else {
            this.updateData(data);
            if (this.isSearch) {
              setTimeout(() => updateSearchPage(this.query), 0);
            }
          }
        });
      }
      setTimeout(() => updateDom(), 0);
    }

    updateData(data: string) {
      if (data !== this.mdData) {
        if (data) {
          this.markdown = renderMD(data);
          if (!noRequest()) {
            setTimeout(() => updateDom(), 0);
          }
        } else {
          this.markdown = '';
        }
      }
    }
  }
</script>

<style lang="scss">@import "../scss/article";</style>
