import Vue, { VNode } from 'vue';

declare global {
  namespace JSX {
    // noinspection JSUnusedGlobalSymbols
    interface Element extends VNode {
    }

    // noinspection JSUnusedGlobalSymbols
    interface ElementClass extends Vue {
    }

    // noinspection JSUnusedGlobalSymbols
    interface IntrinsicElements {
      [elem: string]: any;
    }
  }
}
