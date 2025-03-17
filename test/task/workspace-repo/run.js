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
            // {
            //     repo: {
            //         name: '_test_origin_',
            //         url: 'https://github.com/cocos-creator/workflow.git',
            //         local: '_test_branch_',

            //         targetType: 'branch',
            //         targetValue: 'main',
            //     },

            //     path: './.dist/repository',
            //     hard: true,
            //     skip: false,
            // },
            // {
            //     repo: {
            //         name: '_test_commit_',
            //         url: 'git@github.com:cocos-creator/workflow.git',
            //         local: '_test_commit_',

            //         targetType: 'commit',
            //         targetValue: '9ad17949a8dbf242b3754d52b6a08292b0789f93',
            //     },

            //     path: './.dist/repository-test-commit',
            //     hard: true,
            //     skip: false,
            // },
            {
                repo: {
                    name: '_test_pr_',
                    url: 'git@github.com:cocos-creator/workflow.git',
                    local: '_test_pr_',
                    targetType: 'pr',
                    targetValue: '1',
                },
                path: './.dist/repository-test-pr',
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
