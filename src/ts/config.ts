import { getFromWindow } from '@/ts/utils';

function merge(target: IConfig, source: IConfig) {
  for (const key of Object.keys(source)) {
    if (source[key] instanceof Object) {
      Object.assign(source[key], merge(target[key], source[key]));
    }
  }
  Object.assign(target || {}, source);
  return target;
}

let conf = '';

export function getSelectConf() {
  return conf;
}

function getConfig() {
  const config: IConfig = JSON.parse(JSON.stringify(getFromWindow('vnoConfig')));
  conf = localStorage.getItem('conf') || (config.defaultConf || '');
  const selectConfig = (config.multiConf && conf) ? config.multiConf[conf] : undefined;
  if (selectConfig) {
    merge(config, JSON.parse(JSON.stringify(selectConfig)));
  }
  return config;
}

export const config = getConfig();

export const baseFiles = [
  config.paths.index,
  config.paths.readme,
  config.paths.archive,
  config.paths.category,
  config.paths.search,
  config.paths.common,
];
