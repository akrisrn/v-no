<template>
    <transition name="slide-fade">
        <main v-if="show">
            <Markdown :data="data" :isIndex="isIndex"></Markdown>
            <footer v-if="!isIndex">
                <a class="home" v-on:click="returnHome">« Return to home</a>
                <div v-if="!isError" class="date">{{ date }}</div>
            </footer>
        </main>
    </transition>
</template>

<script lang="ts">
    import {Component, Vue, Watch} from 'vue-property-decorator';
    import axios from 'axios';
    import resource from '@/resource';
    import {error2markdown, getDate} from '@/utils';
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
            this.updateData(to.path);
        }

        @Watch('show')
        public onShowChanged() {
            if (this.show) {
                window.scrollTo(0, 0);
            }
        }

        // noinspection JSUnusedGlobalSymbols
        public created() {
            this.updateData(this.$route.params.pathMatch);
        }

        public get isIndex() {
            return this.$route.params.pathMatch === '/' + process.env.VUE_APP_INDEX_FILE;
        }

        public get date() {
            return getDate(this.$route.params.pathMatch);
        }

        public returnHome() {
            this.$router.push('/');
        }

        // noinspection JSMethodCanBeStatic
        public isAllowedRender(path: string) {
            for (const allowedSuffix of process.env.VUE_APP_ALLOWED_SUFFIXES.split(',')) {
                if (path.endsWith(allowedSuffix)) {
                    return true;
                }
            }
            return false;
        }

        public setData(data: string) {
            this.show = true;
            this.data = data;
        }

        public updateData(path: string) {
            if (this.isAllowedRender(path)) {
                axios.get(path).then((response) => {
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

        footer
            font-size 14px
            border-top 1px solid #e4e4e4
            padding-top 8px
            margin-top 16px

            a.home
                color #0366d6
                text-decoration none
                cursor pointer

                &:hover
                    text-decoration underline

        .date
            float right
            color darkgray
</style>
