<template>
    <router-view></router-view>
</template>

<style lang="stylus">
    body
        margin 0

        &, .markdown-body pre, .markdown-body code
            transition background-color 0.5s

        .markdown-body:not(footer), .markdown-body a
            transition color 0.5s

        .markdown-body blockquote
            transition border-left-color 0.5s

        .markdown-body h1, .markdown-body h2, .markdown-body table thead tr
            transition border-bottom-color 0.5s

        .markdown-body table tr + tr, footer
            transition border-top-color 0.5s

        &.dark
            header, .markdown-body
                color #bebebe !important

            .markdown-body
                a
                    color #6d9cbe !important

                h1, h2
                    border-bottom-color darkgray !important

                blockquote
                    border-left-color darkgray !important

                pre, code
                    background-color #1e1e1e !important

                table
                    thead tr
                        border-bottom-color darkgray !important

                    tr + tr
                        border-top-color darkgray !important

            .index ul:not(.toc) .more span
                background-color #2b2b2b !important

            footer
                border-top-color darkgray !important
</style>
