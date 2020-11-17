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

let selectConf = '';

function getConfig() {
  const config: IConfig = JSON.parse(JSON.stringify(getFromWindow('vnoConfig')));
  if (config.defaultConf && config.multiConf) {
    const defaultConfig = config.multiConf[config.defaultConf];
    const storeConf = localStorage.getItem('conf');
    if (storeConf) {
      const storeConfig = config.multiConf[storeConf];
      if (storeConfig) {
        selectConf = storeConf;
        merge(config, JSON.parse(JSON.stringify(storeConfig)));
      } else {
        localStorage.removeItem('conf');
        if (defaultConfig) {
          selectConf = config.defaultConf;
          merge(config, JSON.parse(JSON.stringify(defaultConfig)));
        }
      }
    } else if (defaultConfig) {
      selectConf = config.defaultConf;
      merge(config, JSON.parse(JSON.stringify(defaultConfig)));
    }
  }
  return config;
}

export function getSelectConf() {
  return selectConf;
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
