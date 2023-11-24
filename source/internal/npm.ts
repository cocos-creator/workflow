import {
    join,
    dirname,
    isAbsolute,
} from 'path';
import {
    createWriteStream,
    WriteStream,
    ensureDir,
} from 'fs-extra';

import { gray } from 'chalk';

import { registerTask, Task, TaskState } from '../task';
import { bash } from '../utils';

export type NPMConfig = {
    // 安装的时候输出的信息
    message: string;
    // 执行 NPM 命令的路径
    path: string;
    // 执行的参数
    params: string[],
    // 错误的时候输出的信息
    detail: string;
    // 存放日志的路径，当没有设置的时候，会将日志输出到控制台
    logFile?: string,
}[];

export class NPMTask extends Task {
    static getMaxConcurrent() {
        return 1;
    }

    getTitle() {
        return 'Run npm command';
    }

    async execute(workspace: string, configArray: NPMConfig): Promise<TaskState> {
        let hasError = false;

        for (const config of configArray) {
            // 将相对路径转成绝对路径
            const source = isAbsolute(config.path)
                ? config.path
                : join(workspace, config.path);

            if (config.message) {
                this.print(`npm ${config.params.join(' ')} - ${config.message}`);
            } else {
                this.print(`npm ${config.params.join(' ')}`);
            }

            this.print(gray(`Execution Path: ${config.path}`));
            if (config.logFile) {
                this.print(gray(`Log file: ${config.logFile}`));
            }

            // 执行命令
            try {
                let writeStream: WriteStream | undefined;
                if (config.logFile) {
                    await ensureDir(dirname(config.logFile));
                    writeStream = createWriteStream(config.logFile, { flags: 'a' });
                }
                await bash('npm', config.params, {
                    cwd: source,
                    // @ts-ignore
                    stdio: writeStream ? undefined : 'inherit',
                }, (data) => {
                    if (writeStream) {
                        writeStream.write(data.toString());
                    } else {
                        this.print(data.toString());
                    }
                });
                if (writeStream) {
                    writeStream.close();
                }
            } catch (error) {
                const err = error as Error;
                this.print(err.message);
                hasError = true;
            }
        }

        return hasError ? TaskState.error : TaskState.success;
    }
}
registerTask('npm', NPMTask);
