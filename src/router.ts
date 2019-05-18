import Vue from 'vue';
import Router from 'vue-router';
// @ts-ignore
// noinspection TypeScriptPreferShortImport
import {INDEX_FILE} from '../app.config.js';

Vue.use(Router);

export default new Router({
    routes: [
        {
            path: '/',
            name: 'root',
            redirect: INDEX_FILE,
        }, {
            path: '*',
            name: 'index',
            component: () => import('./views/Index.vue'),
        },
    ],
});
