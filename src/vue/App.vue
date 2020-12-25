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
        <select v-if="enableMultiConf" v-model="selectConf" @change="confChanged">
          <option v-for="(conf, i) in confList[0]" :key="conf" :value="conf">{{ confList[1][i] }}</option>
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
  import { Component, Vue } from 'vue-property-decorator';

  @Component({ components: { Gadget } })
  export default class App extends Vue {
    favicon = this.config.paths.favicon ? addBaseUrl(this.config.paths.favicon) : '';
    enableMultiConf = enableMultiConf;
    selectConf = getSelectConf();
    keyInput = '';

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

    get shortBaseFiles() {
      return shortBaseFiles;
    }

    // noinspection JSUnusedGlobalSymbols
    created() {
      exposeToWindow({ Vue });
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

    // noinspection JSUnusedGlobalSymbols
    mounted() {
      document.addEventListener('keydown', e => {
        if (document.activeElement && ['INPUT', 'TEXTAREA'].includes(document.activeElement.tagName)) {
          return;
        }
        this.keyInput += e.key;
        if (this.keyInput.length > 20) {
          this.keyInput = this.keyInput.substr(10);
        }
        for (const key of Object.keys(inputBinds)) {
          if (this.keyInput.endsWith(key)) {
            inputBinds[key]();
            break;
          }
        }
      });
    }

    confChanged() {
      localStorage.setItem('conf', this.selectConf);
      location.href = this.homePath;
    }

    returnHome() {
      returnHome();
    }
  }
</script>

<style lang="scss">@import "../scss/app";</style>
