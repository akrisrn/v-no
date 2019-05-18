<template>
    <main>
        <Markdown :data="data"></Markdown>
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

        // noinspection JSUnusedLocalSymbols
        @Watch('$route')
        public onRouteChanged(to: any, from: any) {
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

        public updateData(path: string) {
            if (this.isAllowedRender(path)) {
                axios.get(path).then((response) => {
                    this.data = response.data;
                }).catch((error) => {
                    this.data = error2markdown(error);
                });
            } else {
                this.data = resource.notAllowedRender;
            }
        }
    }
</script>

<style lang="stylus">
    main
        max-width 700px
        margin 24px auto

        @media screen and (max-width: 750px)
            margin-left 16px
            margin-right 16px
</style>
