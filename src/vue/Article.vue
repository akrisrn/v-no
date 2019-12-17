<template>
    <article :class="classObject" v-html="markdown"/>
</template>

<script lang="ts">
    import {renderMD} from '@/ts/markdown';
    import {
        updateCategoryList,
        updateDD,
        updateFootnote,
        updateHeading,
        updateImagePath,
        updateIndexList,
        updateLinkPath,
        updatePre,
        updateSearchList,
        updateTable,
        updateTextCount,
        updateToc,
    } from '@/ts/update';
    import Prism from 'prismjs';
    import {Component, Prop, PropSync, Vue} from 'vue-property-decorator';

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
        public mounted() {
            // 规避 mount 后仍然可以查询到旧节点的问题。
            setTimeout(() => {
                updateDD();
                updateToc();
                updatePre();
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
                Prism.highlightAll();
                updateTextCount();
            }, 0);
        }

        public updateData(data: string) {
            this.syncData = data;
        }
    }
</script>

<style lang="css">@import '~github-markdown-css/github-markdown.css';</style>
<style lang="stylus">@import '../styl/markdown.styl';</style>
<style lang="stylus">@import '../styl/index.styl';</style>
<style lang="stylus">@import '../styl/loadings.styl';</style>