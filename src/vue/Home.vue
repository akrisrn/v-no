<template>
    <div>
        <transition name="slide-fade">
            <main :class="{error: isError}" v-if="isShow">
                <div id="cover" v-if="cover">
                    <!--suppress HtmlUnknownTarget -->
                    <picture :data-src="coverResize ? cover : false">
                        <source :srcset="coverResizeWebp" type="image/webp" v-if="coverResizeWebp">
                        <!--suppress HtmlUnknownTarget -->
                        <img :src="coverResize || cover" alt="cover"/>
                    </picture>
                </div>
                <div class="markdown-body" id="bar" v-if="!isError">
                    <code class="item-home" v-if="!isHome">
                        <a @click.prevent="returnHome" href="/">«</a>
                    </code>
                    <code class="item-date" v-if="date">{{ date }}</code>
                    <code class="item-date" v-else-if="updated">{{ updated }}</code>
                    <code class="item-author" v-for="author in authors">
                        <a :href="getAuthorLink(author)">{{ author }}</a>
                    </code>
                    <code class="item-tag" v-for="tag in tags">
                        <a :href="getTagLink(tag)">{{ tag }}</a>
                    </code>
                    <code class="item-count">
                        <span id="text-count"/>
                    </code>
                    <code class="item-raw">
                        <a :href="path" target="_blank">Raw</a>
                    </code>
                </div>
                <header>{{ title }}</header>
                <!--suppress JSUnresolvedVariable -->
                <Article :data="data" :isCategory="isCategory" :isIndex="isIndex" :isSearch="isSearch" :params="params"
                         @update:data="data = $event">
                </Article>
                <footer class="markdown-body" v-if="!isHome">
                    <a @click.prevent="returnHome" class="home" href="/">Return to home</a>
                    <template v-if="!isError">
                        <span class="date" v-if="date">{{ updated ? `${updated}  (Last Updated)` : date }}</span>
                        <span class="date" v-else-if="updated">{{ updated }}</span>
                    </template>
                </footer>
            </main>
        </transition>
        <span :class="{dark: isDark}" @click="isDark = !isDark" id="toggle-dark">{{ darkChars[isDark ? 1 : 0] }}</span>
        <span :class="{dark: isDark, spin: isZen}" @click="isZen = !isZen" id="toggle-zen">{{ zenChar }}</span>
        <span :class="{dark: isDark}" @click="scrollToTop" id="to-top">{{ toTopChar }}</span>
    </div>
</template>

<script lang="ts">
  import { getFlags } from '@/ts/data';
  import { getDateString } from '@/ts/date';
  import { EFlag, IFlags } from '@/ts/enums';
  import { error2markdown } from '@/ts/markdown';
  import { getQueryLink } from '@/ts/query';
  import resource from '@/ts/resource';
  import { isHashMode, splitFlag } from '@/ts/utils';
  import { scroll } from '@/ts/scroll';
  import axios from 'axios';
  import { Component, Vue, Watch } from 'vue-property-decorator';

  Component.registerHooks([
    'beforeRouteUpdate',
  ]);

  const Article = () => import(/* webpackChunkName: "article" */ '@/vue/Article.vue');

  @Component({ components: { Article } })
  export default class Index extends Vue {
    public data = '';
    public title = '';
    public authors: string[] = [];
    public tags: string[] = [];
    public updated = '';
    public cover = '';
    public coverResize = '';
    public coverResizeWebp = '';
    public isShow = false;
    public isError = false;
    public isDark = false;
    public isZen = false;
    public darkChars = ['★', '☆'];
    public zenChar = '◈';
    public toTopChar = '〒';
    public keyInput = '';
    public inputBinds: { [index: string]: () => void } = {};
    public params: { [index: string]: string | undefined } = {};
    public isHashMode = isHashMode();

    public get path() {
      this.params = {};
      let path = this.$route.path;
      const hash = this.$route.hash;
      if (this.isIndexPath) {
        path = '/';
      }
      if (path === '/') {
        if (hash.startsWith('#/')) {
          path = hash.substr(1);
          if (path !== '/') {
            const indexOf = path.indexOf('?');
            if (indexOf >= 0) {
              path.substring(indexOf + 1).split('&').forEach((param) => {
                const indexOfEQ = param.indexOf('=');
                if (indexOfEQ >= 0) {
                  this.params[param.substring(0, indexOfEQ)] = param.substring(indexOfEQ + 1);
                }
              });
              path = path.substring(0, indexOf);
            }
            if (path.endsWith('/')) {
              path += 'index.md';
            }
            return path;
          }
        }
        return '/' + process.env.VUE_APP_INDEX_FILE;
      }
      if (path.endsWith('.html')) {
        return path.replace(/\.html$/, '.md');
      }
      return path;
    }

    public get isIndexPath() {
      let path = this.$route.path;
      if (path.endsWith('/')) {
        path += 'index.html';
      }
      return path === '/' + process.env.VUE_APP_INDEX_PATH;
    }

    public get isIndex() {
      return [process.env.VUE_APP_INDEX_FILE, process.env.VUE_APP_CATEGORY_FILE,
        process.env.VUE_APP_ARCHIVE_FILE, process.env.VUE_APP_SEARCH_FILE].includes(this.path.substr(1));
    }

    public get isHome() {
      return this.path.substr(1) === process.env.VUE_APP_INDEX_FILE;
    }

    public get isCategory() {
      return this.path.substr(1) === process.env.VUE_APP_CATEGORY_FILE;
    }

    // noinspection JSUnusedGlobalSymbols
    public get isArchive() {
      return this.path.substr(1) === process.env.VUE_APP_ARCHIVE_FILE;
    }

    public get isSearch() {
      return this.path.substr(1) === process.env.VUE_APP_SEARCH_FILE;
    }

    public get date() {
      return getDateString(this.path);
    }

    public beforeRouteUpdate(to: any, from: any, next: () => void) {
      this.isShow = false;
      next();
      this.isHashMode = isHashMode();
      this.updateData();
      setTimeout(() => {
        document.querySelectorAll('.custom').forEach((element) => {
          element.remove();
        });
      }, 100);
    }

    @Watch('isShow')
    public onIsShowChanged() {
      if (this.isShow) {
        scroll(0, false);
      }
    }

    @Watch('isDark')
    public onIsDarkChanged() {
      const metaThemeColor = document.querySelector('meta[name=theme-color]')!;
      if (this.isDark) {
        metaThemeColor.setAttribute('content', '#3B3B3B');
        document.body.classList.add('dark');
        localStorage.setItem('dark', String(true));
      } else {
        metaThemeColor.setAttribute('content', '#FFFFFF');
        document.body.classList.remove('dark');
        localStorage.removeItem('dark');
      }
    }

    @Watch('isZen')
    public onIsZenChanged() {
      if (this.isZen) {
        document.body.classList.add('zen');
        localStorage.setItem('zen', String(true));
      } else {
        document.body.classList.remove('zen');
        localStorage.removeItem('zen');
      }
    }

    // noinspection JSUnusedGlobalSymbols
    public created() {
      // @ts-ignore
      window.addInputBind = this.addInputBind;
      // @ts-ignore
      window.axios = axios;
      this.addInputBind('home', () => {
        if (document.body.classList.contains('prerender')) {
          location.href = '/';
        } else {
          this.returnHome();
        }
      });
      this.addInputBind('gg', () => {
        scroll(document.body.offsetHeight);
        this.keyInput += '_';
      });
      this.addInputBind('G', () => {
        this.scrollToTop();
      });
      this.addInputBind('dark', () => {
        this.isDark = !this.isDark;
      });
      this.addInputBind('zen', () => {
        this.isZen = !this.isZen;
      });
      this.addInputBind('Backspace', () => {
        this.keyInput = this.keyInput.replace(/.?Backspace$/, '');
      });
      this.isDark = !!localStorage.getItem('dark');
      this.isZen = !!localStorage.getItem('zen');
      this.updateData();
    }

    // noinspection JSUnusedGlobalSymbols
    public mounted() {
      addEventListener('keydown', (event) => {
        this.keyInput += event.key;
        for (const key of Object.keys(this.inputBinds)) {
          if (this.keyInput.endsWith(key)) {
            this.inputBinds[key]();
            break;
          }
        }
      });
    }

    public returnHome() {
      let home = '/';
      if (this.isIndexPath) {
        let indexPath = process.env.VUE_APP_INDEX_PATH;
        if (indexPath.endsWith('index.html')) {
          indexPath = indexPath.replace(/index\.html$/, '');
        }
        home += indexPath;
      }
      this.$router.push(home);
    }

    public setFlags(flags: IFlags) {
      this.title = flags.title ? flags.title : this.path.substr(1);
      document.title = this.title;
      this.authors = flags.author ? splitFlag(flags.author) : [process.env.VUE_APP_AUTHOR];
      this.tags = flags.tags ? splitFlag(flags.tags) : [];
      this.updated = flags.updated ? new Date(flags.updated).toDateString() : '';
      if (flags.cover) {
        let cover = flags.cover.startsWith('![](') ? flags.cover.substring(4, flags.cover.length - 1) : flags.cover;
        const match = cover.match(/#\.(.+)$/);
        if (match) {
          cover = cover.replace(/#.+$/, '');
          if (!cover.startsWith('http') && match[1].startsWith('$')) {
            const index = cover.lastIndexOf('.');
            this.coverResize = `${cover.substring(0, index)}.resize${cover.substring(index)}`;
            if (match[1] === '$$') {
              this.coverResizeWebp = `${cover.substring(0, index)}.resize.webp`;
            }
          }
        }
        this.cover = cover;
      } else {
        this.cover = '';
        this.coverResize = '';
        this.coverResizeWebp = '';
      }
    }

    public setData(data: string) {
      const { data: newData, result: flags } = getFlags(data);
      this.setFlags(flags);
      this.data = newData;
      this.updateDescription();
      setTimeout(() => {
        this.isShow = true;
      }, 100);
    }

    public updateDescription() {
      const content = [];
      if (this.authors.length > 0) {
        content.push(`Author: ${this.authors.join()}`);
      }
      if (this.tags.length > 0) {
        content.push(`Tags: ${this.tags.join()}`);
      }
      if (this.date) {
        content.push(`Published: ${this.date}`);
      }
      document.querySelector<HTMLMetaElement>('meta[name=description]')!.content = content.join(' | ');
    }

    public updateData() {
      if (this.path.endsWith('.md')) {
        axios.get(this.path).then((response) => {
          this.isError = false;
          if (process.env.VUE_APP_COMMON_FILE) {
            axios.get('/' + process.env.VUE_APP_COMMON_FILE).then((response2) => {
              this.setData(response.data + '\n\n' + response2.data);
            }).catch(() => {
              this.setData(response.data);
            });
          } else {
            this.setData(response.data);
          }
        }).catch((error) => {
          this.isError = true;
          this.cover = '';
          this.setData(error2markdown(error));
        });
      } else {
        this.isError = true;
        this.cover = '';
        this.setData(error2markdown({
          response: {
            status: 404,
            statusText: resource.notFound,
          },
        } as any));
      }
    }

    public addInputBind(input: string, bind: () => void) {
      this.inputBinds[input] = bind;
    }

    public getAuthorLink(author: string) {
      return getQueryLink(EFlag.author, author);
    }

    public getTagLink(tag: string) {
      return getQueryLink(EFlag.tags, tag);
    }

    public scrollToTop() {
      scroll(0);
    }
  }
</script>

<style lang="scss">@import "../scss/home";</style>
