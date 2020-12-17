let version = require('./package.json').version;
let publicPath = process.env.VUE_APP_PUBLIC_PATH;
if (process.env.NODE_ENV !== 'production') {
  version += '-dev';
} else if (process.env.VUE_APP_CDN_URL) {
  publicPath = process.env.VUE_APP_CDN_URL;
}
process.env.VUE_APP_VERSION = version;

module.exports = {
  publicPath,
  assetsDir: 'assets',
  indexPath: process.env.VUE_APP_INDEX_PATH,
  productionSourceMap: false,
};
