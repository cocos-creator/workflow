import {
    join, isAbsolute,
} from 'path';

import {
    existsSync,
    statSync,
} from 'fs';
import { cpus } from 'os';

import { green, italic } from 'chalk';

import { registerTask, Task, TaskState } from '../task';
import { bash } from '../utils';

export type TscConfig = string[];

export class TscTask extends Task {
    static getMaxConcurrent() {
        return cpus().length;
    }

    getTitle() {
        return 'Compile with tsc';
    }

    async execute(workspace: string, config: TscConfig): Promise<TaskState> {
        let hasError = false;

        for (const relativePath of config) {
            // 将相对路径转成绝对路径
            const path = isAbsolute(relativePath) ? relativePath : join(workspace, relativePath);

            const dataItem = this.getCache(path);

            // 新的缓存数据
            const newDataItem: {
                [key: string]: number;
            } = {};

            // 编译的文件是否有变化
            let changed = false;

            // 获取编译的文件列表
            try {
                const fileArray: string[] = [];
                await bash('npx', ['tsc', '--listFiles'], {
                    cwd: path,
                }, (data) => {
                    data.toString().split(/\r|\n/).forEach((file) => {
                        if (existsSync(file)) {
                            fileArray.push(file);
                        }
                    });
                });
                this.print(`${italic(relativePath)} Compile files: ${green(fileArray.length)}`);

                fileArray.forEach((file) => {
                    const stat = statSync(file);
                    const mtime = stat.mtime.getTime();
                    if (!dataItem[file] || mtime !== dataItem[file]) {
                        changed = true;
                    }
                    newDataItem[file] = mtime;
                });
            } catch (error) {
                const err = error as Error;
                this.print(err.message);
                hasError = true;
            }

            // 没有变化
            if (changed === false) {
                continue;
            }

            // 实际编译
            try {
                await bash('npx', ['tsc'], {
                    cwd: path,
                });

                // 有变化的时候，更新缓存
                this.setCache(path, newDataItem);
            } catch (error) {
                const err = error as Error;
                this.print(err.message);
                hasError = true;
            }
        }

        return hasError ? TaskState.error : TaskState.success;
    }
}
registerTask('tsc', TscTask);
