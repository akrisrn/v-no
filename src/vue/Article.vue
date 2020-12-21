<template>
  <article ref="article" :class="isRendering ? 'rendering' : null" v-html="markdown"/>
</template>

<script lang="ts">
  import { config } from '@/ts/config';
  import { removeClass, scroll } from '@/ts/dom';
  import { EEvent } from '@/ts/enums';
  import { dispatchEvent, getAnchorRegExp } from '@/ts/utils';
  import { Component, Prop, Vue } from 'vue-property-decorator';
  import { importMarkdownTs } from '@/ts/async';

  @Component
  export default class Article extends Vue {
    @Prop() filePath!: string;
    @Prop() data!: string;
    @Prop() anchor!: string;
    @Prop() query!: TQuery;

    $refs!: {
      article: HTMLElement;
    };
    mdData = '';
    markdown = '';
    isRendering = true;
    timeStart = new Date().getTime();

    get isCategoryFile() {
      return this.filePath === config.paths.category;
    }

    get isSearchFile() {
      return this.filePath === config.paths.search;
    }

    // noinspection JSUnusedGlobalSymbols
    async created() {
      const markdownTs = await importMarkdownTs();
      const {
        renderMD,
        replaceInlineScript,
        updateCategoryPage,
        updateDom,
        updateSearchPage,
        updateSnippet,
      } = markdownTs;
      if (this.data) {
        this.mdData = replaceInlineScript(this.filePath, this.data);
      }
      if (!this.mdData) {
        this.renderComplete();
        return;
      }
      this.markdown = renderMD(this.mdData);
      this.$nextTick(() => {
        Promise.all([
          updateSnippet(this.mdData),
          updateDom(),
        ]).then(([data]) => {
          if (!this.isCategoryFile) {
            this.updateData(data, markdownTs);
            if (this.isSearchFile) {
              this.$nextTick(() => updateSearchPage(this.query.content || ''));
            }
          } else if (data) {
            updateCategoryPage(data).then(data => this.updateData(data, markdownTs));
          } else {
            this.updateData(data, markdownTs);
          }
        });
      });
    }

    updateData(data: string, { renderMD, updateDom }: TMarkdownTs) {
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
        updateDom().then(() => {
          this.renderComplete();
        });
      });
    }

    renderComplete() {
      this.isRendering = false;
      this.$nextTick(() => {
        removeClass(this.$refs.article);
        if (!getAnchorRegExp().test(this.anchor)) {
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
