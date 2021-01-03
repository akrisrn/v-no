import { state } from '@/ts/store';
import Vue from 'vue';
import VueRouter from 'vue-router';

Vue.use(VueRouter);

const Main = () => import(/* webpackChunkName: "main" */ '@/vue/Main.vue').then(main => {
  state.initing = false;
  return main;
});

const router = new VueRouter({
  mode: 'history',
  base: process.env.VUE_APP_PUBLIC_PATH,
  routes: [{
    path: '*',
    name: 'main',
    component: Main,
  }],
});

export default router;
