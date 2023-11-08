const { equal } = require('node:assert');
const { describe, it } = require('node:test');
const { join } = require('node:path');

const { initWorkflow, executeTask, registerTask, Task, TaskState } = require('../dist/task');

describe('task', () => {

    it('初始化', () => {
        initWorkflow({
            entry: '.test.config.js',
            params: {
                test: true,
            },
            cacheFile: join(__dirname, './task/workspace/.dist.cache.json'),
            cacheDir: join(__dirname, './task/workspace/.dist-files'),
            workspaces: [
                join(__dirname, './task/workspace'),
            ],
        });
    });

    it('自定义任务', () => {
        class TestTask extends Task {
            getName() {
                return 'test';
            }
            getTitle() {
                return '测试任务';
            }
            execute(config) {
                console.log(11);
                return TaskState.success;
            }
        }
        registerTask(TestTask);
    });

    it('执行任务', async () => {
        const results = await executeTask([
            'test',
        ]);
        console.log(results);
    });
});
