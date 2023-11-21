const { writeFileSync } = require('node:fs');
const { join } = require('node:path');

const {
    initWorkflow,
    executeTask,
} = require('../../../dist/task');
require('../../../dist/internal');

initWorkflow({
    entry: '.test.config.js',
    params: {},
    cacheFile: join(__dirname, './.dist/cache.json'),
    cacheDir: join(__dirname, './.dist/files'),
    workspaces: [
        __dirname,
    ],
});

executeTask(['file']).then((results) => {
    writeFileSync(join(__dirname, '.dist/result.json'), JSON.stringify(results, null, 2));
});
