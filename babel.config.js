// noinspection JSUnusedGlobalSymbols
module.exports = {
  presets: [
    '@vue/cli-plugin-babel/preset',
  ],
  plugins: [
    [
      'prismjs',
      {
        languages: process.env.PRISM_LANGUAGES.split(',').map(language => language.trim()),
        plugins: process.env.PRISM_PLUGINS.split(',').map(plugin => plugin.trim()),
        theme: process.env.PRISM_THEME,
        css: true,
      },
    ],
  ],
};
