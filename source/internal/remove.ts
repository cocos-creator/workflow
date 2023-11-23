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
import { rmSync } from 'graceful-fs';

import { italic } from 'chalk';

import { registerTask, Task, TaskState } from '../task';

export type RemoveConfig = string[];

export class RemoveTask extends Task {
    static getMaxConcurrent() {
        return 1;
    }

    getTitle() {
        return 'Remove files';
    }

    async execute(workspace: string, configArray: RemoveConfig): Promise<TaskState> {
        let hasError = false;

        for (const config of configArray) {
            // 将相对路径转成绝对路径
            const source = isAbsolute(config)
                ? config
                : join(workspace, config);

            this.print(italic(`Remove files in ${source}`));

            try {
                rmSync(source, { recursive: true, force: true });
            } catch (error) {
                const err = error as Error;
                this.print(err.message);
                hasError = true;
            }
        }

        return hasError ? TaskState.error : TaskState.success;
    }
}
registerTask('remove', RemoveTask);
