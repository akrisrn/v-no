import { buildHash, shortenPath } from '@/ts/path';

function merge(target: IConfig, source: IConfig) {
  for (const key of Object.keys(source)) {
    if (source[key] instanceof Object) {
      Object.assign(source[key], merge(target[key] || {}, source[key]));
    }
  }
  Object.assign(target || {}, source);
  return target;
}

let selectConf = '';

export function getSelectConf() {
  return selectConf;
}

export const config = (() => {
  const config: IConfig = JSON.parse(JSON.stringify(vnoConfig));
  if (!config.defaultConf || !config.multiConf) {
    return config;
  }
  const storeConf = localStorage.getItem('conf');
  if (storeConf) {
    const storeConfig = config.multiConf[storeConf];
    if (storeConfig) {
      selectConf = storeConf;
      merge(config, JSON.parse(JSON.stringify(storeConfig)));
      return config;
    }
    localStorage.removeItem('conf');
  }
  const defaultConfig = config.multiConf[config.defaultConf];
  if (!defaultConfig) {
    return config;
  }
  selectConf = config.defaultConf;
  merge(config, JSON.parse(JSON.stringify(defaultConfig)));
  return config;
})();

export const confList = (() => {
  const multiConf = config.multiConf;
  if (!multiConf) {
    return null;
  }
  const keys = Object.keys(multiConf).sort();
  const alias = keys.map(key => multiConf[key].alias || key);
  return [keys, alias] as TConfList;
})();

export const enableMultiConf = !!(selectConf && confList && confList[0].length > 1);

export const baseFiles = [
  config.paths.index,
  config.paths.readme,
  config.paths.archive,
  config.paths.category,
  config.paths.search,
];

if (config.paths.common) {
  baseFiles.push(config.paths.common);
}

export const shortBaseFiles = {
  index: shortenPath(config.paths.index),
  readme: shortenPath(config.paths.readme),
  archive: shortenPath(config.paths.archive),
  category: shortenPath(config.paths.category),
  search: shortenPath(config.paths.search),
};

export const homeHash = buildHash({
  path: shortBaseFiles.index,
  anchor: '',
  query: '',
});
