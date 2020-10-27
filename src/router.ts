import Vue from 'vue';
import Router from 'vue-router';

Vue.use(Router);

const Home = () => import(/* webpackChunkName: "home" */ '@/vue/Home.vue');

const router = new Router({
  mode: 'history',
  base: process.env.BASE_URL,
  routes: [{
    path: '*',
    name: 'home',
    component: Home,
  }],
});

export default router;
