let version = require('./package.json').version;
if (process.env.NODE_ENV !== 'production') {
  version += '-dev';
}
process.env.VUE_APP_VERSION = version;

module.exports = {
  publicPath: process.env.VUE_APP_PUBLIC_PATH,
  assetsDir: 'assets',
  indexPath: process.env.VUE_APP_INDEX_PATH,
  productionSourceMap: false,
};
