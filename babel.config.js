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
        plugins: ['line-numbers', 'show-language', 'copy-to-clipboard'],
        theme: 'tomorrow',
        css: true,
      },
    ],
  ],
};
