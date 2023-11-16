/* eslint-disable max-classes-per-file */
import { join, dirname } from 'node:path';
import { writeFileSync, readFileSync } from 'node:fs';

import { magenta, cyan, dim } from 'chalk';
import {
    TaskManager,
    Task as StructuresTask,
} from '@itharbors/structures';

import { formatTime, makeDir } from './utils';

interface workflowConfig {
    // 配置文件入口，需要时一个 js 文件，绝对地址
    entry: string;
    // 任务的参数，这个对象将会传入每一个任务函数，用于做一些特殊的判断
    params: { [key: string]: any };
    // 缓存文件，用于存放任务产生的一些数据，绝对地址
    cacheFile: string;
    // 缓存文件夹，用于存放任务产生的一些临时文件，绝对地址
    cacheDir: string;
    // 工作区列表，，文件夹的绝对地址数组
    workspaces: string[];
}

export type baseType = string | number | boolean | undefined;
export type baseObject = { [key: string]: baseType | baseObject };

/**
 * 任务状态
 */
export enum TaskState {
    skip = 'skip',
    warn = 'warn',
    error = 'error',
    success = 'success',
    unknown = 'unknown',
}

let workflowOption: workflowConfig | undefined;
let workflowCacheJSON: {
    [task: string]: { [key: string]: baseObject },
} = {};

export class Task {
    // 任务名称
    protected name: string;

    public messages: string[] = [];

    constructor(name: string) {
        this.name = name;
    }

    /**
     * 获取最大并发数
     * @returns {number}
     */
    static getMaxConcurrent() {
        return 1;
    }

    /**
     * 设置缓存
     * @param key 缓存的键名
     * @param value 缓存的值
     */
    setCache(key: string, value: baseObject) {
        if (!workflowCacheJSON) {
            return;
        }

        workflowCacheJSON[this.name] = workflowCacheJSON[this.name] || {};
        const data = workflowCacheJSON[this.name];
        data[key] = value;
    }

    /**
     * 获取缓存
     * @param key 缓存的键名
     * @returns 缓存的值，可能为空
     */
    getCache(key: string): baseObject {
        if (!workflowCacheJSON) {
            return {};
        }

        workflowCacheJSON[this.name] = workflowCacheJSON[this.name] || {};
        const data = workflowCacheJSON[this.name];
        data[key] = data[key] || {};
        const result = data[key];
        return result;
    }

    /**
     * 获取缓存文件夹
     * @returns 缓存文件夹的绝对地址
     */
    getCacheDir() {
        return workflowCacheJSON.cacheDir;
    }

    /**
     * 获取任务标题
     */
    getTitle(): string {
        return '';
    }

    /**
     * 打印日志
     * @param str
     */
    print(str: string) {
        this.messages.push(str);
    }

    /**
     * 执行任务
     * @param workspace
     * @param config
     */
    execute(workspace: string, config: any): Promise<TaskState> | TaskState {
        return TaskState.unknown;
    }
}

const TaskMap = new Map<string, typeof Task>();

/**
 * 初始化工作流
 * @param config
 */
export function initWorkflow(config: workflowConfig) {
    workflowOption = config;
    try {
        const str = readFileSync(config.cacheFile);
        workflowCacheJSON = JSON.parse(str.toString());
    } catch (error) {
        workflowCacheJSON = {};
    }
}

/**
 * 执行工作流任务
 * @param taskNameList
 */
export async function executeTask(taskNameList: string[]) {
    if (!workflowOption) {
        throw new Error('Please initialize the workflow first');
    }

    const results: {
        [taskName: string]: TaskState[],
    } = {};

    const split = ''.padEnd(20, '=');

    // 循环任务列表
    for (const taskName of taskNameList) {
        const taskStartTime = Date.now();
        // 开始任务的分割线
        console.log(magenta(`${split} ${taskName} ${split}`));

        const CacheTask = TaskMap.get(taskName);
        if (!CacheTask) {
            continue;
        }
        const manager = new TaskManager({
            name: `${taskName}`,
            maxConcurrent: Task.getMaxConcurrent(),
        });

        results[taskName] = results[taskName] || [];
        const result = results[taskName];
        class ExecTask extends StructuresTask {
            private workspace: string;

            private entry: string;

            private params: any;

            private cacheFile: string;

            private workflowCacheJSON: { [key: string]: any };

            constructor(
                workspace: string,
                entry: string,
                params: any,
                cacheFile: string,
                workflowCacheJSON: { [key: string]: any },
            ) {
                super();
                this.workspace = workspace;
                this.entry = entry;
                this.params = params;
                this.cacheFile = cacheFile;
                this.workflowCacheJSON = workflowCacheJSON;
            }

            async handle() {
                // 读取任务配置
                let configMap;
                try {
                    const configFile = join(this.workspace, this.entry);
                    configMap = await import(configFile);
                } catch (error) {
                    console.error(error);
                }
                const config = await configMap[taskName](this.params);

                // 执行任务
                const startTime = Date.now();
                const task = new CacheTask!(taskName);
                task.print(cyan(this.workspace));
                try {
                    const state = await task.execute(this.workspace, config);
                    result.push(state);
                } catch (error) {
                    const err = error as Error;
                    task.print(err.message);
                    result.push(TaskState.error);
                }
                const endTime = Date.now();
                task.print(dim(`Workspace task execution completed. ${formatTime(endTime - startTime)}`));

                // 输出缓存的日志
                task.messages.forEach((message) => {
                    console.log(`  ${message}`);
                });

                // 每个小任务结束的时候，将配置重新写回文件
                const dir = dirname(this.cacheFile);
                await makeDir(dir);
                writeFileSync(this.cacheFile, JSON.stringify(this.workflowCacheJSON, null, 2));
            }
        }

        // 循环执行每一个工作区
        for (const workspace of workflowOption.workspaces) {
            const execTask = new ExecTask(
                workspace,
                workflowOption.entry,
                workflowOption.params,
                workflowOption.cacheFile,
                workflowCacheJSON,
            );
            manager.push(execTask);
        }

        await new Promise((resolve) => {
            manager.start();
            manager.addListener('finish', () => {
                const taskEndTime = Date.now();
                console.log(magenta(`${split} ${taskName}(${formatTime(taskEndTime - taskStartTime)}) ${split}`));
                resolve(undefined);
            });
        });
    }

    return results;
}

/**
 * 注册工作流任务
 * @param taskName
 * @param handle
 */
export function registerTask(name: string, TaskClass: typeof Task) {
    TaskMap.set(name, TaskClass);
}
