const { writeFileSync, existsSync, mkdirSync, renameSync } = require('node:fs');
const { join } = require('node:path');

const {
    initWorkflow,
    executeTask,
} = require('../../../dist/task');
require('../../../dist/internal');

const root = join(__dirname, './.dist');
const svg = join(root, './groups.svg');

if (!existsSync(root)) {
    mkdirSync(root);
}

initWorkflow({
    entry: '.test.config.js',
    params: {
        download: [
            {
                url: 'https://www.w3.org/cms-uploads/Hero-illustrations/groups.svg',
                dist: svg,
            },
            {
                url: 'https://www.w3.org/cms-uploads/Hero-illustrations/groups.svg',
                dist: svg + '_backup',
                callback() {
                    throw new Error('123');
                },
            },
            {
                url: 'https://www.w3.org/cms-uploads/Hero-illustrations/groups.svg',
                dist: svg + '_backup2',
                callback() {
                    renameSync(svg + '_backup2', svg + '_backup3');
                },
            },
        ],
    },
    cacheFile: join(__dirname, './.dist/cache.json'),
    cacheDir: join(__dirname, './.dist/files'),
    workspaces: [
        __dirname,
    ],
});

executeTask(['download']).then((results) => {
    writeFileSync(join(__dirname, '.dist/result.json'), JSON.stringify(results, null, 2));
});
