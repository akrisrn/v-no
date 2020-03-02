import Vue from 'vue';
import router from '@/router';

Vue.config.productionTip = false;

const Main = () => import(/* webpackChunkName: "main" */ '@/vue/Main.vue');

new Vue({
    router,
    render: (h) => h(Main),
}).$mount('#app');
