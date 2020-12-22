<template>
  <article ref="article" :class="isRendering ? 'rendering' : null" v-html="markdown"/>
</template>

<script lang="ts">
  import { config } from '@/ts/config';
  import { dispatchEvent, removeClass, scroll } from '@/ts/element';
  import { EEvent } from '@/ts/enums';
  import { Component, Prop, Vue } from 'vue-property-decorator';
  import { importMarkdownTs } from '@/ts/async';
  import { exposeToWindow } from '@/ts/window';

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
    anchorRegExp!: RegExp;
    timeStart = new Date().getTime();

    get isCategoryFile() {
      return this.filePath === config.paths.category;
    }

    get isSearchFile() {
      return this.filePath === config.paths.search;
    }

    // noinspection JSUnusedGlobalSymbols
    async created() {
      exposeToWindow({ articleSelf: this });
      const markdown = await importMarkdownTs();
      this.anchorRegExp = markdown.utils.getAnchorRegExp();
      if (this.data) {
        this.mdData = markdown.utils.replaceInlineScript(this.filePath, this.data);
      }
      if (!this.mdData) {
        this.renderComplete();
        return;
      }
      this.markdown = markdown.renderMD(this.mdData);
      this.$nextTick(() => {
        Promise.all([
          markdown.updateSnippet(this.mdData),
          markdown.updateDom(),
        ]).then(([data]) => {
          if (!this.isCategoryFile) {
            this.updateData(data, markdown);
            if (this.isSearchFile) {
              this.$nextTick(() => markdown.updateSearchPage(this.query.content || ''));
            }
          } else if (data) {
            markdown.updateCategoryPage(data).then(data => this.updateData(data, markdown));
          } else {
            this.updateData(data, markdown);
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
        if (!this.anchorRegExp.test(this.anchor)) {
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
