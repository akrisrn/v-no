import Vue, { VNode } from 'vue';

declare global {
  namespace JSX {
    // tslint:disable no-empty-interface
    // noinspection JSUnusedGlobalSymbols
    interface Element extends VNode {
    }

    // tslint:disable no-empty-interface
    // noinspection JSUnusedGlobalSymbols
    interface ElementClass extends Vue {
    }

    // noinspection JSUnusedGlobalSymbols
    interface IntrinsicElements {
      [elem: string]: any;
    }
  }
}
