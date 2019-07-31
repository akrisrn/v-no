<template>
    <router-view></router-view>
</template>

<style lang="stylus">
    body
        margin 0
        background-color #f1f1f1
        transition background-color 0.5s

        &.dark
            background-color #2b2b2b !important

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

                    td + td, th + th
                        border-left-color: darkgray !important

            .index ul:not(.toc) .more span
                background-color #2b2b2b !important

            footer
                border-top-color darkgray !important
</style>
