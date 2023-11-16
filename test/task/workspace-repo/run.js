const { writeFileSync } = require('node:fs');
const { join } = require('node:path');

const {
    initWorkflow,
    executeTask,
} = require('../../../dist/task');
require('../../../dist/internal');

initWorkflow({
    entry: '.test.config.js',
    params: {
        repo: [
            {
                repo: {
                    name: '_test_origin_',
                    url: 'git@github.com:itharbors/workflow.git',
                    local: '_test_branch_',

                    targetType: 'branch',
                    targetValue: 'main',
                },

                path: './.dist/repository',
                hard: true,
                skip: false,
            },
        ],
    },
    cacheFile: join(__dirname, './.dist/cache.json'),
    cacheDir: join(__dirname, './.dist/files'),
    workspaces: [
        __dirname,
    ],
});

executeTask(['repo']).then((results) => {
    writeFileSync(join(__dirname, '.dist/result.json'), JSON.stringify(results, null, 2));
});
