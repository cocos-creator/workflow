import {
    join,
    isAbsolute,
    basename,
    extname,
} from 'path';
import {
    existsSync,
    outputFile,
    copySync,
    remove,
    removeSync,
} from 'fs-extra';
import download from 'download';
import { unzip } from 'v-unzip';

import { italic, red, gray } from 'chalk';

import { registerTask, Task, TaskState } from '../task';
import { makeDir } from '../utils';

export type DownloadConfig = {
    // url 地址
    url: string;
    // 下载的位置
    dist: string;
    // 下载结束后的回调函数
    callback?: () => void,
}[];

export class DownloadTask extends Task {
    static getMaxConcurrent() {
        return 1;
    }

    getTitle() {
        return 'Remove files';
    }

    async execute(workspace: string, configArray: DownloadConfig): Promise<TaskState> {
        let hasError = false;

        const tempDir = this.getCacheDir();
        if (!tempDir) {
            this.print(red('The cache directory is not set up correctly'));
            return TaskState.error;
        }

        if (!existsSync(tempDir)) {
            await makeDir(tempDir);
        }

        for (const config of configArray) {
            // 将相对路径转成绝对路径
            const name = basename(config.url);
            const tempFile = join(tempDir, name);
            const dist = isAbsolute(config.dist)
                ? config.dist
                : join(workspace, config.dist);

            this.print(italic(`${config.url}`));

            try {
                if (!existsSync(tempFile)) {
                    const data = await download(config.url);
                    await outputFile(tempFile, data);

                    if (existsSync(dist)) {
                        await remove(dist);
                    }
                    this.print(italic(`  => download: ${tempFile}`));
                } else {
                    // this.print(gray(`  => cache: ${tempFile}`));
                }

                if (!existsSync(dist)) {
                    this.print(gray(`  => unzip: ${dist}`));
                    if (extname(tempFile) === '.zip') {
                        await unzip(tempFile, dist, {
                            /**
                             * 递归删除 __MACOSX 文件夹
                             * 这个文件夹是 mac 文件系统自动创建的，并且可能会自动更改
                             * 文件变化有可能会引起签名失效
                             * @param file
                             */
                            recursive(file: string) {
                                if (basename(file) !== '__MACOSX') {
                                    return;
                                }
                                removeSync(file);
                            },
                        });
                    } else {
                        this.print(gray(`  => copy: ${dist}`));
                        copySync(tempFile, dist);
                    }
                    if (config.callback) {
                        config.callback();
                    }
                }
            } catch (error) {
                hasError = true;
                const err = error as Error;
                this.print(red(err.message));
            }
        }

        return hasError ? TaskState.error : TaskState.success;
    }
}
registerTask('download', DownloadTask);
