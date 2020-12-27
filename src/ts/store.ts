import { homePath } from '@/ts/path';
import Vue from 'vue';

export const state = Vue.observable({
  filePath: '',
  anchor: '',
  queryStr: '',
  homePath,
});
