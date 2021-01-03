import { homePath } from '@/ts/path';
import Vue from 'vue';

export const state = Vue.observable({
  initing: true,
  filePath: '',
  anchor: '',
  queryStr: '',
  homePath,
});
