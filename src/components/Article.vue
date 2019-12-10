<template>
    <article :class="classObject" v-html="markdown"/>
</template>

<script lang="ts">
    import {renderMD} from '@/utils/markdown';
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
    } from '@/utils/update';
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

<style>@import '~github-markdown-css/github-markdown.css';</style>

<style lang="stylus">
    .markdown-body
        font-size 15px
        line-height 2
        color #4a4a4a

        > :first-child dt:first-of-type
            margin-top 0 !important

        a
            color #287BDE !important
            text-decoration none !important
            cursor pointer !important

            &:hover
                text-decoration underline !important

        hr
            height 1px
            background-color transparent
            border-bottom 1px solid lightgray

        h1, h2
            border-bottom-color lightgray
            padding-bottom 8px

        p.left
            float left
            margin-right 16px

        p.right
            float right
            margin-left 16px

        p.left, p.right
            margin-bottom 0

            @media screen and (max-width: 750px)
                float none
                margin-right 0
                margin-left 0
                margin-bottom 16px

        img
            margin-top 8px
            background-color transparent

            for i in 1..6
                {'&.w' + i * 100}
                    width 100%
                    max-width i * 100px

            for i in 1..5
                {'&.h' + i * 100}
                    height i * 100px

        mark
            border-radius 3px
            background-color rgba(255, 235, 59, 0.5)
            box-shadow 0.25em 0 0 rgba(255, 235, 59, 0.5), -0.25em 0 0 rgba(255, 235, 59, 0.5)

        dl
            dt
                font-style normal
                font-weight normal

            dd
                font-size 13px
                color gray
                padding 0

                &:before
                    content '»'
                    margin-right 8px

                + dd
                    margin-top -16px

            &.center dd:before
                content none

        pre
            background-color #2b2b2b

        blockquote
            margin 24px 0
            padding 0 32px
            border-left none
            position relative

            &:before
                font-family Arial
                content '“'
                font-size 4em
                position absolute
                top -32px
                left 0

        kbd
            margin-bottom 3px

        table
            thead tr
                border-bottom 2px solid #c6cbd1

            tr
                border-top none

            tr + tr
                border-top 1px solid #c6cbd1

            tr, tr:nth-child(2n)
                background-color transparent

            td, th
                border none

            th
                text-align left

        details
            overflow auto
            margin 24px 0
            padding 0 16px
            box-shadow 0 2px 2px 0 rgba(0, 0, 0, 0.14), 0 1px 5px 0 rgba(0, 0, 0, 0.12), 0 3px 1px -2px rgba(0, 0, 0, 0.2)
            border-radius 3px
            border-left 6px solid rgba(68, 138, 255, 0.5)

            ::-webkit-details-marker
                display none

            ::-moz-list-bullet
                font-size 0

            summary
                outline none
                margin 0 -16px
                padding 6px 16px
                background-color rgba(68, 138, 255, 0.1)

                h1, h2
                    border-bottom none
                    padding-bottom 0

                h1, h2, h3, h4, h5, h6
                    display inline

                + *
                    margin-top 16px

                &:after
                    content '▲'
                    float right
                    font-size 13px
                    color rgba(68, 138, 255, 0.5)

            &:not([open])
                summary:after
                    content '▼'

            &.readonly summary
                pointer-events none

                &:after
                    content none

            &.empty summary
                display none

            &.success
                border-left-color rgba(0, 200, 83, 0.5)

                summary
                    background-color rgba(0, 200, 83, 0.1)

                    &:after
                        color rgba(0, 200, 83, 0.5)

            &.warning
                border-left-color rgba(255, 145, 0, 0.5)

                summary
                    background-color rgba(255, 145, 0, 0.1)

                    &:after
                        color rgba(255, 145, 0, 0.5)

            &.danger
                border-left-color rgba(255, 23, 68, 0.5)

                summary
                    background-color rgba(255, 23, 68, 0.1)

                    &:after
                        color rgba(255, 23, 68, 0.5)

        #toc
            font-size 13px
            margin-bottom 16px

            .ul-a, .ul-b
                display inline-table
                max-width 348px

                @media screen and (max-width: 750px)
                    max-width none
                    width 100%

            .ul-a
                margin-bottom .25em

            .ul-b
                margin-bottom 0

        .footnotes
            font-size 13px
            color gray

            ol
                margin-top -8px
                margin-bottom -16px

                li + li p
                    margin-top 0

            .footnote-backref
                font-family -apple-system, BlinkMacSystemFont, Segoe UI, Helvetica, Arial, sans-serif, Segoe UI Symbol

        .center
            text-align center

        .hidden
            display none

        .count:before
            content '-'
            margin-left 8px

        h1, h2, h3, h4, h5, h6
            &:hover
                .heading-link
                    opacity 1

        .heading-link
            opacity 0
            transition opacity 0.5s

            &:before
                content '#'
                margin-left 0.3em
                cursor pointer

        div.code-toolbar > .toolbar
            .toolbar-item + .toolbar-item
                margin-left 3px

            button
                cursor pointer
                outline none

            button, span
                color darkgray
                transition color 0.5s

                &:hover
                    color lightgray

    .index
        ul.toc.tags
            padding-left 0

            li
                display inline

                + li:before
                    content '|'
                    margin-right 12px

        ul:not(.toc)
            padding-left 0

            li
                list-style none
                overflow hidden
                text-overflow ellipsis
                white-space nowrap

                &:before
                    content '»'
                    margin-right 8px

                blockquote
                    font-style normal
                    margin 0
                    padding-left 16px
                    padding-right 0
                    white-space normal
                    font-size 13px

                    &:before
                        content none

                code
                    color darkgray
                    background-color transparent !important
                    padding 0
                    font-size 12px
                    font-family -apple-system, BlinkMacSystemFont, Segoe UI, Helvetica, Arial, sans-serif, Apple Color Emoji, Segoe UI Emoji, Segoe UI Symbol

                    &:before
                        content '#'
                        margin-right 2px

                .date
                    margin-left 8px

            .more
                font-size 13px
                color darkgray
                border-top 1px dashed
                margin-top 16px
                height 8px

                span
                    background-color #f1f1f1
                    transition background-color 0.5s, color 0.5s
                    position relative
                    top -16px
                    padding-right 8px
                    cursor pointer

                    &:hover
                        color gray

                    &:before
                        content '#'
                        margin-right 2px

        #search-input
            width 100%
            background-color transparent
            border none
            outline none

    .lds-ellipsis
        position relative
        width 50px
        height 100px
        margin 0 auto

        div
            position absolute
            top 45px
            width 10px
            height 10px
            border-radius 50%
            background-color darkgray
            animation-timing-function cubic-bezier(0, 1, 1, 0)

            &:nth-child(1)
                animation lds-ellipsis1 1s infinite

            &:nth-child(2)
                animation lds-ellipsis2 1s infinite

            &:nth-child(3)
                left 20px
                animation lds-ellipsis2 1s infinite

            &:nth-child(4)
                left 40px
                animation lds-ellipsis3 1s infinite

            @keyframes lds-ellipsis1
                from
                    transform scale(0)
                to
                    transform scale(1)

            @keyframes lds-ellipsis2
                from
                    transform translate(0, 0)
                to
                    transform translate(20px, 0)

            @keyframes lds-ellipsis3
                from
                    transform scale(1)
                to
                    transform scale(0)
</style>
