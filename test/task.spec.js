const { equal } = require('node:assert');
const { describe, it, before } = require('node:test');
const { join } = require('node:path');

const {
    initWorkflow,
    executeTask,
    registerTask,
    Task,
    TaskState,
} = require('../dist/task');
require('../dist/internal');

describe('task', () => {
    describe('基础流程', () => {
        before(() => {
            // 初始化工作流
            initWorkflow({
                entry: '.test.config.js',
                params: {
                    testA: true,
                    testB: true,
                },
                cacheFile: join(__dirname, './task/.dist.cache.json'),
                cacheDir: join(__dirname, './task/.dist-files'),
                workspaces: [
                    join(__dirname, './task/workspace-a'),
                    join(__dirname, './task/workspace-b'),
                ],
            });

            // 注册测试任务
            class TestTask extends Task {
                // eslint-disable-next-line class-methods-use-this
                getName() {
                    return 'test';
                }

                // eslint-disable-next-line class-methods-use-this
                getTitle() {
                    return '测试任务';
                }

                // eslint-disable-next-line class-methods-use-this
                execute() {
                    return TaskState.success;
                }
            }
            registerTask(TestTask);
        });

        it('执行任务', async () => {
            const results = await executeTask([
                'test',
            ]);
            equal(true, !!results.test);
            equal(TaskState.success, results.test[0]);
            equal(TaskState.success, results.test[1]);
        });
    });

    describe('clone 仓库', () => {
        before(() => {
            // 初始化工作流
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
                cacheFile: join(__dirname, './task/.dist.cache.json'),
                cacheDir: join(__dirname, './task/.dist-files'),
                workspaces: [
                    join(__dirname, './task/workspace-repo'),
                ],
            });
        });

        it('执行任务', async () => {
            const results = await executeTask([
                'repo',
            ]);
            equal(true, !!results.repo);
            equal(TaskState.success, results.repo[0]);
        });
    });
});
