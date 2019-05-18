import Vue from 'vue';
import Router from 'vue-router';

Vue.use(Router);

export default new Router({
    routes: [
        {
            path: '/',
            name: 'root',
            redirect: process.env.VUE_APP_INDEX_FILE,
        }, {
            path: '*',
            name: 'index',
            component: () => import('./views/Index.vue'),
        },
    ],
});
