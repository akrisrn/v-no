const languages = process.env.PRISM_LANGUAGES?.split(',').map(lang => lang.trim()).filter(lang => lang) ?? [];

module.exports = {
  presets: [
    '@vue/cli-plugin-babel/preset',
  ],
  plugins: [
    [
      'prismjs',
      {
        languages,
        plugins: languages.length > 0 ? ['line-numbers', 'line-highlight', 'show-language', 'copy-to-clipboard'] : [],
        theme: 'tomorrow',
        css: languages.length > 0,
      },
    ],
  ],
};
