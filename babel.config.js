module.exports = {
    presets: [
        '@vue/app'
    ],
    plugins: [
        [
            'prismjs',
            {
                languages: ['bash', 'python'],
                plugins: [],
                theme: 'default',
                css: true
            }
        ]
    ]
};
