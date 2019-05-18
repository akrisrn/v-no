<template>
    <main>
        <transition name="slide-fade">
            <Markdown v-if="show" :data="data"></Markdown>
        </transition>
    </main>
</template>

<script lang="ts">
    import {Component, Vue, Watch} from 'vue-property-decorator';
    import axios from 'axios';
    import resource from '@/resource';
    import {error2markdown} from '@/utils';
    import Markdown from '@/components/Markdown.vue';
    // @ts-ignore
    // noinspection TypeScriptPreferShortImport
    import {ALLOWED_SUFFIXES} from '../../app.config.js';

    // noinspection JSUnusedGlobalSymbols
    @Component({components: {Markdown}})
    export default class Index extends Vue {
        public data = '';
        public show = false;

        // noinspection JSUnusedLocalSymbols
        @Watch('$route')
        public onRouteChanged(to: any, from: any) {
            this.show = false;
            this.updateData(to.path);
        }

        // noinspection JSUnusedGlobalSymbols
        public created() {
            this.updateData(this.$route.params.pathMatch);
        }

        // noinspection JSMethodCanBeStatic
        public isAllowedRender(path: string) {
            for (const allowedSuffix of ALLOWED_SUFFIXES) {
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
                    this.setData(error2markdown(error));
                });
            } else {
                this.setData(resource.notAllowedRender);
            }
        }
    }
</script>

<style lang="stylus">
    main
        max-width 700px
        margin 24px auto

        .slide-fade-enter-active
            transition all .3s ease

        .slide-fade-leave-active
            transition all .8s cubic-bezier(1.0, 0.5, 0.8, 1.0)

        .slide-fade-enter, .slide-fade-leave-to
            transform translateX(10px)
            opacity 0

        @media screen and (max-width: 750px)
            margin-left 16px
            margin-right 16px
</style>
