<template>
  <div>
    <span id="toggle-dark" @click="toggleDark">{{ darkMarks[isDark ? 1 : 0] }}</span>
    <span id="toggle-zen" ref="toggleZen" :class="isZen ? 'spin' : null" @click="toggleZen">{{ zenMark }}</span>
    <span id="to-top" ref="toTop" :class="isToTop ? 'spin' : null" @click="toTop">{{ toTopMark }}</span>
  </div>
</template>

<script lang="ts">
  import { dispatchEvent, removeClass, scroll } from '@/ts/element';
  import { EEvent } from '@/ts/enums';
  import { addInputBinds } from '@/ts/utils';
  import { exposeToWindow } from '@/ts/window';
  import { Component, Prop, Vue, Watch } from 'vue-property-decorator';

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
    isToTop = false;

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
      });
      this.metaTheme = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]')!;
      this.isDark = !!localStorage.getItem('dark');
      this.isZen = !!localStorage.getItem('zen');
      addInputBinds({
        dark: this.toggleDark,
        zen: this.toggleZen,
        G: this.toTop,
        gg: () => {
          this.scroll(true);
          this.addToKeyInput('_');
        },
      });
    }

    toggleDark() {
      this.isDark = !this.isDark;
    }

    @Watch('isDark')
    onIsDarkChanged() {
      this.metaTheme.setAttribute('content', this.metaThemeColor);
      if (this.isDark) {
        document.body.classList.add('dark');
        localStorage.setItem('dark', String(true));
      } else {
        removeClass(document.body, 'dark');
        localStorage.removeItem('dark');
      }
      this.$nextTick(() => dispatchEvent(EEvent.toggleDark, this.isDark));
    }

    toggleZen() {
      this.isZen = !this.isZen;
    }

    @Watch('isZen')
    onIsZenChanged() {
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
    }

    toTop() {
      if (this.isToTop) {
        return;
      }
      this.scroll();
    }

    scroll(toBottom = false) {
      this.isToTop = true;
      scroll(toBottom ? document.body.offsetHeight : 0);
      setTimeout(() => {
        this.isToTop = false;
        this.$nextTick(() => removeClass(this.$refs.toTop));
      }, 500);
      this.$nextTick(() => dispatchEvent(EEvent.toTop, !toBottom));
    }
  }
</script>
