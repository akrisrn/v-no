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
        <template v-for="(link, i) of otherLinks">
          <a v-if="link.isExternal" :key="i" :href="link.href" rel="noopener noreferrer" target="_blank"
             v-html="link.text + iconExternal"></a>
          <a v-else :key="i" :href="link.href" :target="!link.isMarkdown ? '_blank' : null">{{ link.text }}</a>
        </template>
        <select v-if="enableMultiConf" v-model="selectConf">
          <option v-for="(conf, i) of confList[0]" :key="i" :value="conf">{{ confList[1][i] }}</option>
        </select>
      </div>
    </div>
    <div v-if="initing" class="lds-ellipsis initing">
      <div v-for="i in 4" :key="i"></div>
    </div>
    <router-view v-else/>
    <Gadget :addToKeyInput="key => this.keyInput += key"></Gadget>
  </div>
</template>

<script lang="ts">
  import { bang } from '@/ts';
  import { config, confList, enableMultiConf, getSelectConf, shortBaseFiles } from '@/ts/config';
  import { dispatchEvent, getIcon } from '@/ts/element';
  import { EEvent, EIcon } from '@/ts/enums';
  import { addBaseUrl, buildHash, isExternalLink, parseHash, returnHome } from '@/ts/path';
  import * as localStorage from '@/ts/storage';
  import { state } from '@/ts/store';
  import { addInputBinds, inputBinds } from '@/ts/utils';
  import { exposeToWindow } from '@/ts/window';
  import { Component, Vue } from 'vue-property-decorator';

  const Gadget = () => import(/* webpackChunkName: "main" */ '@/vue/Gadget.vue');

  @Component({ components: { Gadget } })
  export default class App extends Vue {
    keyInput = '';
    selectConf = getSelectConf();
    otherLinks: TAnchor[] = [];

    get initing() {
      return state.initing;
    }

    get homePath() {
      return state.homePath;
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

    get shortBaseFiles() {
      return shortBaseFiles;
    }

    get favicon() {
      return this.config.paths.favicon ? addBaseUrl(this.config.paths.favicon) : '';
    }

    get iconExternal() {
      return getIcon(EIcon.external, 14);
    }

    created() {
      bang();
      exposeToWindow({
        appSelf: this,
        selectConf: this.selectConf,
      });
      const icon = document.querySelector<HTMLLinkElement>('link[rel="icon"]')!;
      if (this.favicon) {
        icon.href = this.favicon;
      } else if (icon) {
        icon.remove();
      }
      addInputBinds({
        home: this.returnHome,
        Backspace: () => {
          this.keyInput = this.keyInput.replace(/.?Backspace$/, '');
        },
      });
      this.$watch('keyInput', () => {
        for (const key of Object.keys(inputBinds)) {
          if (this.keyInput.endsWith(key)) {
            inputBinds[key]();
            break;
          }
        }
      });
      this.$watch('selectConf', () => {
        localStorage.setItem('conf', this.selectConf);
        location.href = this.homePath;
      });
      dispatchEvent(EEvent.appCreated, new Date().getTime());
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

    // noinspection JSUnusedGlobalSymbols
    addLink(href: string, text = '') {
      let isExternal = false;
      let isMarkdown = false;
      if (isExternalLink(href)) {
        isExternal = true;
      } else if (href.startsWith('/')) {
        const { path, anchor, query } = parseHash(`#${href}`, true);
        if (path.endsWith('.md') || path.endsWith('/')) {
          isMarkdown = true;
          href = buildHash({ path, anchor, query });
        }
      }
      const link: TAnchor = { text, href };
      if (isExternal) {
        link.isExternal = true;
      }
      if (isMarkdown) {
        link.isMarkdown = true;
      }
      this.otherLinks.push(link);
      return link;
    }

    // noinspection JSUnusedGlobalSymbols
    removeLink(href: string) {
      for (let i = 0; i < this.otherLinks.length; i++) {
        if (this.otherLinks[i].href === href) {
          this.otherLinks.splice(i, 1);
          return i;
        }
      }
      return -1;
    }

    returnHome() {
      returnHome();
    }
  }
</script>

<style lang="scss">@import "../scss/app";</style>
