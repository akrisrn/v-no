module.exports = {
    presets: [
        '@vue/app'
    ],
    plugins: [
        [
            'prismjs',
            {
                languages: ['javascript', 'css', 'markup'],
                plugins: ['line-numbers'],
                theme: 'default',
                css: true
            }
        ]
    ]
};
