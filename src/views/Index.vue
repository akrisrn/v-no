<template>
    <transition name="slide-fade">
        <main v-if="show">
            <!--suppress JSUnresolvedVariable -->
            <Markdown :data="data" :isCategory="isCategory" :isIndex="isIndex" :path="path"
                      @update:data="data = $event"></Markdown>
            <footer class="markdown-body" v-if="!isIndex || isCategory">
                <a class="home" v-on:click="returnHome">Return to home</a>
                <span class="date" v-if="!isError">{{ date }}</span>
            </footer>
        </main>
    </transition>
</template>

<script lang="ts">
    import {Component, Vue, Watch} from 'vue-property-decorator';
    import axios from 'axios';
    import resource from '@/resource';
    import {error2markdown, getDateString} from '@/utils';
    import Markdown from '@/components/Markdown.vue';

    // noinspection JSUnusedGlobalSymbols
    @Component({components: {Markdown}})
    export default class Index extends Vue {
        public data = '';
        public show = false;
        public isError = false;

        // noinspection JSUnusedLocalSymbols
        @Watch('$route')
        public onRouteChanged(to: any, from: any) {
            this.show = false;
            this.updateData();
        }

        @Watch('show')
        public onShowChanged() {
            if (this.show) {
                window.scrollTo(0, 0);
            }
        }

        // noinspection JSUnusedGlobalSymbols
        public created() {
            this.updateData();
        }

        public get isIndex() {
            const path = this.path.substr(1);
            return [process.env.VUE_APP_INDEX_FILE, process.env.VUE_APP_CATEGORY_FILE].includes(path);
        }

        public get isCategory() {
            const path = this.path.substr(1);
            return path === process.env.VUE_APP_CATEGORY_FILE;
        }

        public get date() {
            return getDateString(this.path);
        }

        public get path() {
            if (this.$route.params.pathMatch === '/') {
                return '/' + process.env.VUE_APP_INDEX_FILE;
            }
            return this.$route.params.pathMatch;
        }

        public returnHome() {
            this.$router.push('/');
        }

        // noinspection JSMethodCanBeStatic
        public isAllowedRender(path: string) {
            for (const allowedSuffix of process.env.VUE_APP_ALLOWED_SUFFIXES.split(',')) {
                if (allowedSuffix && path.endsWith(allowedSuffix)) {
                    return true;
                }
            }
            return false;
        }

        public setData(data: string) {
            this.show = true;
            this.data = data;
        }

        public updateData() {
            if (this.isAllowedRender(this.path)) {
                axios.get(this.path).then((response) => {
                    this.setData(response.data);
                }).catch((error) => {
                    this.isError = true;
                    this.setData(error2markdown(error));
                });
            } else {
                this.isError = true;
                this.setData(resource.notAllowedRender);
            }
        }
    }
</script>

<style lang="stylus">
    .slide-fade-enter-active
        transition all .3s ease

    .slide-fade-leave-active
        transition all .8s cubic-bezier(1.0, 0.5, 0.8, 1.0)

    .slide-fade-enter, .slide-fade-leave-to
        transform translateX(10px)
        opacity 0

    main
        max-width 700px
        margin 24px auto

        @media screen and (max-width: 750px)
            margin-left 16px
            margin-right 16px

        footer.markdown-body
            border-top 1px solid #e4e4e4
            margin-top 16px
            padding-top 8px

            a.home
                color #0366d6
                text-decoration none
                cursor pointer

                &:before
                    content '« '
                    font-family sans-serif

                &:hover
                    text-decoration underline

        .date
            float right
            color darkgray
</style>
