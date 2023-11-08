'use strict';

import { join, isAbsolute } from 'path';

import { registerTask, Task, TaskState } from './task';
import { bash } from './utils';

export type TscConfig = string[];
// export type RepoConfig = {
//     // 远端地址
//     origin: string;
//     // 工作目录
//     target: string;
//     // 目标分支
//     branch?: string;
//     // 目标 tag
//     tag?: string;
//     // 是否强制切换
//     hard?: boolean;
//     // 是否跳过
//     skip?: boolean;
// };

class TscTask extends Task {
    getName() {
        return 'internal:tsc';
    }
    getTitle() {
        return 'Compile with tsc';
    }

    async execute(workspace: string, config: TscConfig): Promise<TaskState> {
        let err = false;

        for (let relativePath of config) {
            // 将相对路径转成绝对路径
            const path = isAbsolute(relativePath) ? relativePath : join(workspace, relativePath);

            try {
                // 实际编译
                await bash('tsc', [], {
                    cwd: path,
                });
            } catch(error) {
                console.error(error);
                err = true;
            }
        }

        return err ? TaskState.error : TaskState.success;
    }
}
registerTask(TscTask);
