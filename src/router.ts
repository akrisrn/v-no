import Vue from 'vue';
import Router from 'vue-router';

Vue.use(Router);

const Index = () => import(/* webpackChunkName: "index" */ '@/vue/Index.vue');

// noinspection JSUnusedGlobalSymbols
export default new Router({
    mode: 'history',
    base: process.env.BASE_URL,
    routes: [{
        path: '*',
        name: 'index',
        component: Index,
    }],
});
