import {
    join,
    isAbsolute,
} from 'path';
import {
    statSync,
    chmodSync,
} from 'fs';

import { italic } from 'chalk';

import { registerTask, Task, TaskState } from '../task';

export type ChmodConfig = {
    // 文件路径，支持相对、绝对路径
    source: string;
    // 权限 （111 111 111）
    mode: number;
}[];

export class ChmodTask extends Task {
    static getMaxConcurrent() {
        return 1;
    }

    getTitle() {
        return 'Remove files';
    }

    async execute(workspace: string, configArray: ChmodConfig): Promise<TaskState> {
        let hasError = false;

        for (const config of configArray) {
            // 将相对路径转成绝对路径
            const source = isAbsolute(config.source)
                ? config.source
                : join(workspace, config.source);

            this.print(italic(`Modify file permissions: ${source} ${config.mode}`));

            try {
                const fileStat = statSync(source);
                // eslint-disable-next-line no-bitwise
                if ((fileStat.mode & config.mode) === config.mode) {
                    continue;
                }
                chmodSync(source, config.mode);
            } catch (error) {
                const err = error as Error;
                this.print(err.message);
                hasError = true;
            }
        }

        return hasError ? TaskState.error : TaskState.success;
    }
}
registerTask('chmod', ChmodTask);
