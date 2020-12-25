import Vue from 'vue';
import Router from 'vue-router';

Vue.use(Router);

const Main = () => import(/* webpackChunkName: "main" */ '@/vue/Main.vue');

const router = new Router({
  mode: 'history',
  base: process.env.VUE_APP_PUBLIC_PATH,
  routes: [{
    path: '*',
    name: 'main',
    component: Main,
  }],
});

export default router;
