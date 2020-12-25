import Vue from 'vue';
import Router from 'vue-router';

Vue.use(Router);

const Home = () => import(/* webpackChunkName: "main" */ '@/vue/Home.vue');

const router = new Router({
  mode: 'history',
  base: process.env.VUE_APP_PUBLIC_PATH,
  routes: [{
    path: '*',
    name: 'home',
    component: Home,
  }],
});

export default router;
