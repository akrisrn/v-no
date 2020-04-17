module.exports = {
  presets: [
    '@vue/cli-plugin-babel/preset',
  ],
  plugins: [
    [
      'prismjs',
      {
        languages: process.env.PRISM_LANGUAGES.split(','),
        plugins: process.env.PRISM_PLUGINS.split(','),
        theme: process.env.PRISM_THEME,
        css: true,
      },
    ],
  ],
};
