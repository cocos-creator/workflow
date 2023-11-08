# Workflow

工作流调度小工具。通过项目配置，触发指定的任务，用于简化较为复杂初始化或者编译等流程。

[![NPM](https://img.shields.io/npm/v/@itharbors/workflow)](https://www.npmjs.com/package/@itharbors/workflow)
[![CI Status](https://github.com/itharbors/workflow/actions/workflows/ci.yaml/badge.svg)](https://github.com/itharbors/workflow/actions/workflows/ci.yaml)

Workflow 将项目任务分成了 workspace（工作区）和 task（任务）两个概念。

每个工作区相当于一个需要处理的工程目录。而任务则是实际执行的动作。Workflow 会在执行每个任务的时候，循环所有工作区，在所有工作区内拿到对应的配置信息，根据这些配置信息去执行对应的任务。

## Install

工具发布到了 NPM 上，可以通过 NPM 安装到本地

```bash
npm install @itharbors/workflow
```

## Usage

### 基础用法

先初始化工作流的一些基本配置，然后开始执行

```ts
import { join } from 'path';
import { initWorkflow, executeTask } from '@itharbors/workflow';

// 初始化工作流
initWorkflow({
    entry: '.build.config.js',
    params: argv,
    cache: join(__dirname, '../../.temp/.cache-build.json'),
    cacheDir: join(__dirname, '../../.temp'),
    workspaces: [
        join(__dirname, '..'),
    ],
});

// 执行工作流任务，internal 开头的为内置的一些任务
const results = executeTask([
    'internal:clear',
    'internal:npm',
    'internal:tsc',
]);

// 错误处理，发现任务失败，则异常退出进程
for (const taskName in results) {
    const taskResultList = results[taskName];
    for (const taskResult of taskResultList) {
        if (taskResult.state === 'error') {
            process.exit(-1);
        }
    }
}
```

### 注册自定义任务

```ts
import { registerTask, Task, TaskState } from '@itharbors/workflow';

class TestTask extends Task {
    getName() {
        return 'test';
    }
    getTitle() {
        return '测试任务';
    }
    execute(config) {
        // 这个 config 是 workspace 文件夹里，对应配置文件里，exports.test = function() {} return 出来的数据
        // 任务里约定好后，配置文件里负责组织数据
        return TaskState.success;
    }
}
registerTask(TestTask);
```
