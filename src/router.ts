import Vue from 'vue';
import Router from 'vue-router';
import Home from '@/vue/Home.vue';

Vue.use(Router);

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
