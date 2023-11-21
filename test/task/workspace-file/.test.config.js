exports.file = function(params) {
    return [
        {
            source: './test',
            dist: './.dist/test-1',
        },
        {
            source: './test',
            dist: './.dist/test-2',
            filter(file) {
                return file.endsWith('b');
            },
        },
    ];
}
