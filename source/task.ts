'use strict';

import { join } from 'node:path';
import { writeFileSync } from 'node:fs';

let workflowOption: workflowConfig | undefined = undefined;
let workflowCacheJSON: { [task: string]: { [key: string]: boolean | string | number | undefined } } = {};
const TaskMap = new Map<string, Task>();

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

export abstract class Task {

    setCache(key: string, value: string | number | boolean | undefined) {
        if (!workflowCacheJSON) {
            return;
        }
        const name = this.getName();
        const data = workflowCacheJSON[name] = workflowCacheJSON[name] || {};
        data[key] = value;
    }
    getCache(key: string): string | number | boolean | undefined {
        if (!workflowCacheJSON) {
            return;
        }
        const name = this.getName();
        const data = workflowCacheJSON[name] = workflowCacheJSON[name] || {};
        return data[key];
    }

    getCacheDir() {
        return workflowCacheJSON.cacheDir;
    }

    abstract getName(): string;
    abstract getTitle(): string;
    abstract execute(workspace: string, config: any): Promise<TaskState> | TaskState;
}

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

/**
 * 初始化工作流
 * @param config 
 */
export function initWorkflow(config: workflowConfig) {
    workflowOption = config;
    try {
        workflowCacheJSON = require(config.cacheFile);   
    } catch(error) {
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

    // 循环任务列表
    for (let taskName of taskNameList) {
        const task = TaskMap.get(taskName);
        if (!task) {
            continue;
        }
        const result = results[taskName] = results[taskName] || [];

        // 循环执行每一个工作区
        for (let workspace of workflowOption.workspaces) {
            // 读取任务配置
            let configMap;
            try {
                const configFile = join(workspace, workflowOption!.entry);
                configMap = require(configFile);
            } catch(error) {
                console.error(error);
            }
            const config = await configMap[taskName](workflowOption.params);

            // 执行任务
            try {
                const state = await task.execute(workspace, config);
                result.push(state);
            } catch(error) {
                console.error(error);
                result.push(TaskState.error);
            }

            // 每个小任务结束的时候，将配置重新写回文件
            writeFileSync(workflowOption.cacheFile, JSON.stringify(workflowCacheJSON, null, 2));
        }
    }

    return results;
}

/**
 * 注册工作流任务
 * @param taskName 
 * @param handle 
 */
export function registerTask(taskClass: new () => Task) {
    const task = new taskClass();
    TaskMap.set(task.getName(), task);
}