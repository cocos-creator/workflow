'use strict';

import { join, isAbsolute, dirname, basename } from 'node:path';
import { existsSync, mkdirSync, renameSync } from 'node:fs';

import { registerTask, Task, TaskState } from './task';
import { bash } from './utils';

const prefix = '    ';
const cmd = {
    git: process.platform === 'win32' ? 'git.cmd' : 'git',
};

export type TscConfig = string[];
type repoConfigItem = {
    // 远端仓库信息
    repo: {
        // 远端仓库在本地的名字
        name: string;
        // 远端仓库的地址
        url: string;
        // 切出本地分支的名字
        local: string;

        // 目标类型，支持分支或者 tag
        targetType: 'branch' | 'tag';
        // 目标分支或者 tag 的信息
        targetValue: string;
    };
    
    // 工作目录
    path: string;

    // 是否强制切换
    hard: boolean;
    // 是否跳过这个仓库
    skip: boolean;
};
export type RepoConfig = repoConfigItem[];

class TscTask extends Task {
    getName() {
        return 'tsc';
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

export const RepoTaskMethods = {
    /**
     * Clones a remote repository to a specified path.
     *
     * @param {string} remote - The URL of the remote repository.
     * @param {string} path - The path where the repository should be cloned.
     * @return {Promise<void>} A promise that resolves when the cloning is complete.
     */
    async clone(remote: string, path: string) {
        await bash(cmd.git, ['clone', remote, basename(path)], {
            cwd: dirname(path),
        });
    },

    /**
     * Adds a remote repository to the local git repository.
     *
     * @param {string} name - The name of the remote repository.
     * @param {string} remote - The URL of the remote repository.
     * @param {string} path - The path to the local git repository.
     */
    async updateRemote(name: string, remote: string, path: string) {
        try {
            await bash(cmd.git, ['remote', 'add', name, remote], {
                cwd: path,
            }, () => {});
        } catch(error) {}

        await bash(cmd.git, ['remote', 'set-url', name, remote], {
            cwd: path,
        }, () => {});
    },
};
class RepoTask extends Task {
    getName() {
        return 'repo';
    }
    getTitle() {
        return 'Synchronize the Git repository';
    }

    async execute(workspace: string, config: RepoConfig): Promise<TaskState> {
        let err = false;

        async function checkoutRepo(config: repoConfigItem): Promise<TaskState> {
            // 仓库绝对地址
            const path = isAbsolute(config.path) ? config.path : join(workspace, config.path);
            const bsd = dirname(path);
            const bsn = basename(path);

            // 允许配置某些仓库跳过
            if (config.skip) {
                console.log(`${prefix}因配置跳过检查当前仓库，请手动确认仓库是否在最新分支`);
                return TaskState.skip;
            }

            // 如果文件夹不是 git 仓库或者不存在，则重新 clone
            if (existsSync(path)) {
                if (!existsSync(join(path, '.git'))) {
                    console.log(`${prefix}检测文件夹不是一个合法的 GIT 仓库，将备份文件夹，尝试重新 clone`);
                    const dirBackup = join(bsd, '_' + bsn);
                    renameSync(path, dirBackup);
                }
            }

            console.log(prefix + `${config.repo.url}`);

            if (!existsSync(bsd)) {
                mkdirSync(bsd);
            }

            // 如果文件夹不存在，直接 clone 远端
            if (!existsSync(path)) {
                // clone 直接输出信息，不需要其他说明信息
                await RepoTaskMethods.clone(config.repo.url, path);
            }

            // 添加/更新远端，如果有会报错，直接忽略
            await RepoTaskMethods.updateRemote(config.repo.name, config.repo.url, path);

            // 同步远端
            let fetchError;
            try {
                const code = await bash(cmd.git, ['fetch', config.repo.name], {
                    cwd: path,
                });
                if (code !== 0) {
                    fetchError = new Error('返回值不为 0');
                }
            } catch(error) {
                fetchError = error;
            }
            if (fetchError) {
                console.log(`${prefix}同步远端失败[ git fetch ${config.repo.name} ]`);
                console.log(fetchError);
                return TaskState.error;
            }

            let remoteID = '';
            let localID = '';

            // 获取远端 commit id
            if (config.repo.targetType === 'branch') {
                try {
                    await bash(cmd.git, ['rev-parse', `${config.repo.name}/${config.repo.targetValue}`], {
                        cwd: path,
                    }, (chunk) => {
                        const log = chunk + '';
                        remoteID = log.replace(/\n/g, '').trim();
                    });
                } catch(error) {
                    console.log(`${prefix}获取远端 commit 失败[ git rev-parse ${config.repo.name}/${config.repo.targetValue} ]`);
                    console.log(error);
                    return TaskState.error;
                }
            } else if (config.repo.targetType === 'tag') {
                try {
                    await bash(cmd.git, ['rev-parse', `tags/${config.repo.targetValue}`], {
                        cwd: path,
                    }, (chunk) => {
                        const log = chunk + '';
                        remoteID = log.replace(/\n/g, '').trim();
                    });
                } catch(error) {
                    console.log(`${prefix}获取远端 commit 失败[ git rev-parse ${config.repo.name}/${config.repo.targetValue} ]`);
                    console.log(error);
                    return TaskState.error;
                }
            } else {
                console.log(`${prefix}获取远端 commit 失败[ 没有配置 branch 或者 tag ]`);
                return TaskState.error;
            }

            // 获取本地 commit id
            try {
                await bash(cmd.git, ['rev-parse', 'HEAD'], {
                    cwd: path,
                }, (chunk) => {
                    const log = chunk + '';
                    localID = log.replace(/\n/g, '').trim();
                });
            } catch(error) {
                console.log(`${prefix}获取本地 commit 失败[ git rev-parse HEAD ]`);
                console.log(error);
                return TaskState.error;
            }

            // 打印 commit 对比信息
            if (remoteID !== localID) {
                console.log(`${prefix}${localID} (本地) => ${remoteID} (远端)`);
            } else {
                // 本地远端 commit 相同
                console.log(`${prefix}${remoteID} (本地 / 远端)`);
                return TaskState.skip;
            }


            // 检查是否有修改
            let isDirty = false;
            await bash(cmd.git, ['status', '-uno'], {
                cwd: path,
            }, (chunk) => {
                const info = chunk + '';
                if (!/nothing to commit/.test(info)) {
                    isDirty = true;
                }
            });
            if (isDirty) {
                if (!config.hard) {
                    console.log(`${prefix}仓库有修改，跳过更新`);
                    return TaskState.skip;
                } else {
                    console.log(`${prefix}仓库有修改，暂存代码`);
                    try {
                        await bash(cmd.git, ['stash'], {
                            cwd: path,
                        });
                    } catch(error) {
                        console.log(`${prefix}暂存代码失败，无法继续还原代码`);
                        console.log(error);
                        return TaskState.error;
                    }
                }
            }

            // 检查当前分支
            let isEditorBranch = false;
            try {
                await bash(cmd.git, ['branch', '--show-current'], {
                    cwd: path,
                }, (chunk) => {
                    const log = chunk + '';
                    if (new RegExp(config.repo.local).test(log)) {
                        isEditorBranch = true;
                    }
                });
            } catch(error) {
                console.log(`${prefix}获取本地 commit 失败[ git rev-parse HEAD ]`);
                console.log(error);
                return TaskState.error;
            }
            if (!isEditorBranch && !config.hard) {
                console.log(`${prefix}不在 ${config.repo.local} 分支上，跳过更新`);
                return TaskState.skip;
            } else {
                // 从当前位置切出分支，如果有则忽略
                await bash(cmd.git, ['checkout', '-b', config.repo.local], {
                    cwd: path,
                });
                // 从当前位置切出分支，如果有则忽略
                await bash(cmd.git, ['checkout', config.repo.local], {
                    cwd: path,
                });
            }

            try {
                let info = '';
                await bash(cmd.git, ['reset', '--hard', remoteID], {
                    cwd: path,
                }, (chunk) => {
                    info += chunk;
                });
                console.log(prefix + `还原代码: ${info.trim()}`);
            } catch(error) {
                console.log(prefix + '还原代码失败');
                console.log(error);
                return TaskState.error;
            }

            return TaskState.success;
        }

        for (let repoConfig of config) {
            await checkoutRepo(repoConfig);
        }

        return err ? TaskState.error : TaskState.success;
    }
}
registerTask(RepoTask);
