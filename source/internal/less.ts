import {
    join, isAbsolute,
} from 'path';
import {
    existsSync,
    statSync,
} from 'fs';
import { cpus } from 'os';

import { green, italic, yellow } from 'chalk';

import { registerTask, Task, TaskState } from '../task';
import { bash } from '../utils';

export type LessConfig = {
    // less 文件，支持相对、绝对路径
    source: string;
    // 生成的 css 文件，支持相对、绝对路径
    dist: string;
    compress: boolean;
}[];

export class LessTask extends Task {
    static getMaxConcurrent() {
        return cpus().length;
    }

    getTitle() {
        return 'Compile with less';
    }

    async execute(workspace: string, configArray: LessConfig): Promise<TaskState> {
        let hasError = false;

        for (const config of configArray) {
            // 将相对路径转成绝对路径
            const path = isAbsolute(config.source) ? config.source : join(workspace, config.source);

            const dataItem = this.getCache(path);

            // 新的缓存数据
            const newDataItem: {
                [key: string]: number;
            } = {};

            // 编译的文件是否有变化
            let changed = false;

            // 获取编译的文件列表
            const fileArray: string[] = [
                path,
            ];
            try {
                const out = './.less.cache.json';
                await bash('npx', ['lessc', '--depends', config.source, out], {
                    cwd: workspace,
                }, (data) => {
                    let str = data.toString();
                    if (str.startsWith(out)) {
                        str = str.substring(out.length + 2);
                    }
                    str.split(/\.less /).forEach((fileWithoutExt) => {
                        const file = `${fileWithoutExt}.less`;
                        if (existsSync(file)) {
                            fileArray.push(file);
                        }
                    });
                });

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

            if (!existsSync(config.dist)) {
                changed = true;
            }

            // 没有变化
            if (changed === false) {
                this.print(`${italic(config.source)} Cache files: ${yellow(fileArray.length)}`);
                continue;
            }
            this.print(`${italic(config.source)} Compile files: ${green(fileArray.length)}`);

            // 实际编译
            try {
                await bash('npx', ['lessc', config.source, config.dist], {
                    cwd: workspace,
                }, (chunk) => {
                    this.print(chunk.toString());
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
registerTask('less', LessTask);
