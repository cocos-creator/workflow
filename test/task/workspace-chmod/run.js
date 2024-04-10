const { writeFileSync, chmodSync, existsSync, mkdirSync, statSync } = require('node:fs');
const { join } = require('node:path');

const {
    initWorkflow,
    executeTask,
} = require('../../../dist/task');
require('../../../dist/internal');

const root = join(__dirname, './.dist');
const txt = join(root, './test.txt');

if (!existsSync(root)) {
    mkdirSync(root);
}

if (!existsSync(txt)) {
    writeFileSync(txt, '');
}

// 给一个默认文件权限
chmodSync(txt, 0o111);

initWorkflow({
    entry: '.test.config.js',
    params: {
        chmod: [
            {
                source: txt,
                mode: 511,
            },
        ],
    },
    cacheFile: join(__dirname, './.dist/cache.json'),
    cacheDir: join(__dirname, './.dist/files'),
    workspaces: [
        __dirname,
    ],
});

executeTask(['chmod']).then((results) => {
    writeFileSync(join(__dirname, '.dist/result.json'), JSON.stringify(results, null, 2));
});
