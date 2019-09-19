<template>
    <router-view></router-view>
</template>

<style lang="stylus">
    body
        margin 0

        &, .markdown-body pre, .markdown-body code
            transition background-color 0.5s

        header, .markdown-body, .markdown-body a
            transition color 0.5s

        .markdown-body hr, .markdown-body h1, .markdown-body h2, .markdown-body table thead tr
            transition border-bottom-color 0.5s

        .markdown-body table tr + tr
            transition border-top-color 0.5s

        .markdown-body img, .markdown-body kbd
            transition filter 0.5s

        &.dark
            header, .markdown-body
                color #bebebe !important

            .markdown-body
                a
                    color #6d9cbe !important

                hr, h1, h2
                    border-bottom-color darkgray !important

                pre, code
                    background-color #1e1e1e !important

                table
                    thead tr
                        border-bottom-color darkgray !important

                    tr + tr
                        border-top-color darkgray !important

                img, kbd
                    filter brightness(0.7) !important

            .index ul:not(.toc) .more span
                background-color #2b2b2b !important
</style>
