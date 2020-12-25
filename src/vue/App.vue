<template>
  <div id="app">
    <div id="top">
      <div>
        <img v-if="favicon" :src="favicon" alt="favicon"/>
        <a :href="homePath" @click.prevent="returnHome">{{ config.siteName || config.messages.home }}</a>
        <span class="filler"></span>
        <a :href="`#${shortBaseFiles.readme}`"></a>
        <a :href="`#${shortBaseFiles.archive}`"></a>
        <a :href="`#${shortBaseFiles.category}`"></a>
        <a :href="`#${shortBaseFiles.search}`"></a>
        <select v-if="enableMultiConf" v-model="selectConf">
          <option v-for="(conf, i) of confList[0]" :key="conf" :value="conf">{{ confList[1][i] }}</option>
        </select>
      </div>
    </div>
    <router-view/>
    <Gadget :addToKeyInput="key => this.keyInput += key"></Gadget>
  </div>
</template>

<script lang="ts">
  import { config, confList, enableMultiConf, getSelectConf, shortBaseFiles } from '@/ts/config';
  import { addBaseUrl, returnHome } from '@/ts/path';
  import store from '@/ts/store';
  import { addInputBinds, inputBinds } from '@/ts/utils';
  import { exposeToWindow } from '@/ts/window';
  import { bang } from '@/ts/async';
  import Gadget from '@/vue/Gadget.vue';
  import { Component, Vue, Watch } from 'vue-property-decorator';

  @Component({ components: { Gadget } })
  export default class App extends Vue {
    keyInput = '';
    selectConf = getSelectConf();

    store = store;

    get homePath() {
      return this.store.state.homePath;
    }

    get config() {
      return config;
    }

    get confList() {
      return confList;
    }

    get enableMultiConf() {
      return enableMultiConf;
    }

    get favicon() {
      return this.config.paths.favicon ? addBaseUrl(this.config.paths.favicon) : '';
    }

    get shortBaseFiles() {
      return shortBaseFiles;
    }

    created() {
      exposeToWindow({
        Vue,
        appSelf: this,
      });
      bang();
      const icon = document.querySelector<HTMLLinkElement>('link[rel="icon"]')!;
      if (this.favicon) {
        icon.href = this.favicon;
      } else if (icon) {
        icon.remove();
      }
      addInputBinds({
        home: () => this.returnHome(),
        Backspace: () => {
          this.keyInput = this.keyInput.replace(/.?Backspace$/, '');
        },
      });
    }

    mounted() {
      document.addEventListener('keydown', e => {
        if (document.activeElement && ['INPUT', 'TEXTAREA'].includes(document.activeElement.tagName)) {
          return;
        }
        let value = this.keyInput + e.key;
        if (value.length > 20) {
          value = value.substr(10);
        }
        this.keyInput = value;
      });
    }

    @Watch('keyInput')
    onKeyInputChanged() {
      for (const key of Object.keys(inputBinds)) {
        if (this.keyInput.endsWith(key)) {
          inputBinds[key]();
          break;
        }
      }
    }

    @Watch('selectConf')
    onSelectConfChanged() {
      localStorage.setItem('conf', this.selectConf);
      location.href = this.homePath;
    }

    returnHome() {
      returnHome();
    }
  }
</script>

<style lang="scss">@import "../scss/app";</style>
