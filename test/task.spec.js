const { equal } = require('node:assert');
const { describe, it } = require('node:test');
const { join } = require('node:path');

const { initWorkflow, executeTask, registerTask, Task, TaskState } = require('../dist/task');

describe('task', () => {

    describe('基础流程', () => {

        // 初始化工作流
        initWorkflow({
            entry: '.test.config.js',
            params: {
                testA: true,
                testB: true,
            },
            cacheFile: join(__dirname, './task/workspace/.dist.cache.json'),
            cacheDir: join(__dirname, './task/workspace/.dist-files'),
            workspaces: [
                join(__dirname, './task/workspace-a'),
                join(__dirname, './task/workspace-b'),
            ],
        });
    
        // 注册测试任务
        class TestTask extends Task {
            getName() {
                return 'test';
            }
            getTitle() {
                return '测试任务';
            }
            execute(config) {
                return TaskState.success;
            }
        }
        registerTask(TestTask);
    
        it('执行任务', async () => {
            const results = await executeTask([
                'test',
            ]);
            equal(true, !!results.test);
            equal(TaskState.success, results.test[0]);
            equal(TaskState.success, results.test[1]);
        });
    });
});
