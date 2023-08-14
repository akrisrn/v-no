<template>
  <div>
    <span id="toggle-dark" @click="toggleDark">{{ darkMarks[isDark ? 1 : 0] }}</span>
    <span id="toggle-zen" ref="toggleZen" :class="isZen ? 'spin' : null" @click="toggleZen">{{ zenMark }}</span>
    <span id="to-top" ref="toTop" :class="isScrolling ? 'spin' : null" @click="toTop">{{ toTopMark }}</span>
  </div>
</template>

<script lang="ts">
  import { dispatchEvent, removeClass, scroll } from '@/ts/element';
  import { EEvent } from '@/ts/enums';
  import * as localStorage from '@/ts/storage';
  import { addInputBinds } from '@/ts/utils';
  import { exposeToWindow } from '@/ts/window';
  import { Component, Prop, Vue } from 'vue-property-decorator';

  @Component
  export default class Gadget extends Vue {
    @Prop() addToKeyInput!: (key: string) => void;

    $refs!: {
      toggleZen: HTMLSpanElement;
      toTop: HTMLSpanElement;
    };
    metaTheme!: HTMLMetaElement;

    isDark = false;
    isZen = false;
    isScrolling = false;

    darkMarks = ['★', '☆'];
    zenMark = '▣';
    toTopMark = 'と';

    get metaThemeColor() {
      return this.isDark ? (this.isZen ? '#2b2b2b' : '#3b3b3b') : (this.isZen ? '#efefef' : '#ffffff');
    }

    created() {
      exposeToWindow({
        gadgetSelf: this,
        toggleDark: this.toggleDark,
        toggleZen: this.toggleZen,
        toTop: this.toTop,
        toBottom: this.toBottom,
      });
      this.metaTheme = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]')!;
      this.isDark = !!localStorage.getItem('dark');
      this.isZen = !!localStorage.getItem('zen');
      addInputBinds({
        dark: this.toggleDark,
        zen: this.toggleZen,
        gg: () => {
          this.toTop();
          this.addToKeyInput('_');
        },
        G: this.toBottom,
      });
      this.$watch('isDark', () => {
        this.metaTheme.setAttribute('content', this.metaThemeColor);
        if (this.isDark) {
          document.body.classList.add('dark');
          localStorage.setItem('dark', String(true));
        } else {
          removeClass(document.body, 'dark');
          localStorage.removeItem('dark');
        }
        this.$nextTick(() => dispatchEvent(EEvent.toggleDark, this.isDark));
      });
      this.$watch('isZen', () => {
        this.metaTheme.setAttribute('content', this.metaThemeColor);
        if (this.isZen) {
          document.body.classList.add('zen');
          localStorage.setItem('zen', String(true));
        } else {
          this.$nextTick(() => removeClass(this.$refs.toggleZen));
          removeClass(document.body, 'zen');
          localStorage.removeItem('zen');
        }
        this.$nextTick(() => dispatchEvent(EEvent.toggleZen, this.isZen));
      });
    }

    toggleDark() {
      this.isDark = !this.isDark;
    }

    toggleZen() {
      this.isZen = !this.isZen;
    }

    toTop() {
      if (this.isScrolling) {
        return;
      }
      this.scroll();
    }

    toBottom() {
      if (this.isScrolling) {
        return;
      }
      this.scroll(true);
    }

    scroll(toBottom = false) {
      this.isScrolling = true;
      scroll(toBottom ? document.body.offsetHeight : 0);
      setTimeout(() => {
        this.isScrolling = false;
        this.$nextTick(() => removeClass(this.$refs.toTop));
      }, 500);
      this.$nextTick(() => dispatchEvent(EEvent.toTop, !toBottom));
    }
  }
</script>

<style lang="scss">@import "../scss/gadget";</style>
