module.exports = {
  presets: [
    '@vue/cli-plugin-babel/preset',
  ],
  plugins: [
    [
      'prismjs',
      {
        languages: process.env.PRISM_LANGUAGES ? process.env.PRISM_LANGUAGES.split(',').
            map(lang => lang.trim()).
            filter(lang => lang) : [],
        plugins: ['line-numbers', 'line-highlight', 'show-language', 'copy-to-clipboard'],
        theme: 'tomorrow',
        css: true,
      },
    ],
  ],
};
