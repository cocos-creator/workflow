import {
    join,
    isAbsolute,
    relative,
} from 'path';
import {
    existsSync,
    statSync,
    Stats,
    copyFileSync,
} from 'fs';

import { green, italic } from 'chalk';

import { registerTask, Task, TaskState } from '../task';
import { forEachFiles, makeDir } from '../utils';

export type FileConfig = {
    source: string;
    dist: string;
    filter(file: string, stat: Stats): boolean;
}[];

export class FileTask extends Task {
    static getMaxConcurrent() {
        return 1;
    }

    getTitle() {
        return 'Copy files';
    }

    async execute(workspace: string, configArray: FileConfig): Promise<TaskState> {
        let hasError = false;

        for (const config of configArray) {
            // 将相对路径转成绝对路径
            const source = isAbsolute(config.source)
                ? config.source
                : join(workspace, config.source);
            const dist = isAbsolute(config.dist)
                ? config.dist
                : join(workspace, config.dist);

            const dataItem = this.getCache(source);

            // 新的缓存数据
            const newDataItem: {
                [key: string]: number;
            } = {};

            // 编译的文件是否有变化
            let changed = false;
            const fileArray: {
                source: string;
                dist: string;
            }[] = [];

            // 获取编译的文件列表
            try {
                await forEachFiles(source, (file, stat) => {
                    const relativePath = relative(source, file);
                    const distFile = join(dist, relativePath);
                    if (config.filter && !config.filter(file, stat)) {
                        return;
                    }
                    if (stat.isDirectory()) {
                        return;
                    }
                    fileArray.push({
                        source: file,
                        dist: distFile,
                    });
                });

                this.print(`${italic(`${config.source} => ${config.dist}`)} Copy files: ${green(fileArray.length)}`);

                fileArray.forEach((item) => {
                    const stat = statSync(item.source);
                    const mtime = stat.mtime.getTime();
                    if (
                        !dataItem[item.source]
                        || mtime !== dataItem[item.source]
                        || !existsSync(item.dist)
                    ) {
                        changed = true;
                    }
                    newDataItem[item.source] = mtime;
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

            // 实际拷贝
            try {
                for (const item of fileArray) {
                    const baseDir = join(item.dist, '..');
                    if (!existsSync(baseDir)) {
                        await makeDir(baseDir);
                    }
                    if (existsSync(item.source) && !existsSync(item.dist)) {
                        copyFileSync(item.source, item.dist);
                    }
                }

                // 有变化的时候，更新缓存
                this.setCache(source, newDataItem);
            } catch (error) {
                const err = error as Error;
                this.print(err.message);
                hasError = true;
            }
        }

        return hasError ? TaskState.error : TaskState.success;
    }
}
registerTask('file', FileTask);
