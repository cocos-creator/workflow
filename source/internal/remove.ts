import {
    join,
    isAbsolute,
} from 'path';
import {
    remove,
} from 'fs-extra';

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
                await remove(source);
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
