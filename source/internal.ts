/* eslint-disable max-classes-per-file */
import {
    join, isAbsolute, dirname, basename,
} from 'node:path';

import {
    existsSync,
    mkdirSync,
    renameSync,
    statSync,
} from 'node:fs';

import { yellow, green, italic } from 'chalk';

import { registerTask, Task, TaskState } from './task';
import { bash } from './utils';

const cmd = {
    git: process.platform === 'win32' ? 'git' : 'git',
    tsc: process.platform === 'win32' ? 'tsc.cmd' : 'tsc',
    lessc: process.platform === 'win32' ? 'lessc.cmd' : 'lessc',
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
                await bash('npx', [cmd.tsc, '--listFiles'], {
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

            // 有变化的时候，更新缓存
            this.setCache(path, newDataItem);

            // 实际编译
            try {
                await bash('npx', [cmd.tsc], {
                    cwd: path,
                });
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

            await bash(cmd.git, ['remote', 'set-url', name, remote], {
                cwd: path,
            }, () => {});
        } catch (error) { /** ignore */ }
    },
};
class RepoTask extends Task {
    getTitle() {
        return 'Synchronize the Git repository';
    }

    async execute(workspace: string, repoConfigArray: RepoConfig): Promise<TaskState> {
        const err = false;
        const task = this;

        async function checkoutRepo(config: repoConfigItem): Promise<TaskState> {
            // 仓库绝对地址
            const path = isAbsolute(config.path) ? config.path : join(workspace, config.path);
            const bsd = dirname(path);
            const bsn = basename(path);

            task.print(yellow(`>> ${config.repo.url}`));

            // 允许配置某些仓库跳过
            if (config.skip) {
                task.print('Skip checking the current repository due to configuration.');
                task.print('Please manually confirm if the repository is on the latest branch.');
                return TaskState.skip;
            }

            // 如果文件夹不是 git 仓库或者不存在，则重新 clone
            if (existsSync(path)) {
                if (!existsSync(join(path, '.git'))) {
                    task.print('Detecting that the folder is not a valid GIT repository. Backup the folder and attempt to re-clone.');
                    const dirBackup = join(bsd, `_${bsn}`);
                    renameSync(path, dirBackup);
                }
            }

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
            let fetchError: Error | undefined;
            try {
                const code = await bash(cmd.git, ['fetch', config.repo.name], {
                    cwd: path,
                });
                if (code !== 0) {
                    fetchError = new Error('Return value is not 0');
                }
            } catch (error) {
                fetchError = error as Error;
            }
            if (fetchError) {
                task.print(`Syncing remote failed [ git fetch ${config.repo.name} ]`);
                task.print(fetchError.message);
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
                        const log = `${chunk}`;
                        remoteID = log.replace(/\n/g, '').trim();
                    });
                } catch (error) {
                    const err = error as Error;
                    task.print(`Failed to fetch remote commit [ git rev-parse ${config.repo.name}/${config.repo.targetValue} ]`);
                    task.print(err.message);
                    return TaskState.error;
                }
            } else if (config.repo.targetType === 'tag') {
                try {
                    await bash(cmd.git, ['rev-parse', `tags/${config.repo.targetValue}`], {
                        cwd: path,
                    }, (chunk) => {
                        const log = `${chunk}`;
                        remoteID = log.replace(/\n/g, '').trim();
                    });
                } catch (error) {
                    const err = error as Error;
                    task.print(`Failed to fetch remote commit [ git rev-parse ${config.repo.name}/${config.repo.targetValue} ]`);
                    task.print(err.message);
                    return TaskState.error;
                }
            } else {
                task.print('Failed to fetch remote commit [ No branch or tag configured ]');
                return TaskState.error;
            }

            // 获取本地 commit id
            try {
                await bash(cmd.git, ['rev-parse', 'HEAD'], {
                    cwd: path,
                }, (chunk) => {
                    const log = `${chunk}`;
                    localID = log.replace(/\n/g, '').trim();
                });
            } catch (error) {
                const err = error as Error;
                task.print('Failed to retrieve local commits [ git rev-parse HEAD ]');
                task.print(err.message);
                return TaskState.error;
            }

            // 打印 commit 对比信息
            if (remoteID !== localID) {
                task.print(`${localID} (local) => ${remoteID} (remote)`);
            } else {
                // 本地远端 commit 相同
                task.print(`${remoteID} (local / remote)`);
                return TaskState.skip;
            }

            // 检查是否有修改
            let isDirty = false;
            await bash(cmd.git, ['status', '-uno'], {
                cwd: path,
            }, (chunk) => {
                const info = `${chunk}`;
                if (!/nothing to commit/.test(info)) {
                    isDirty = true;
                }
            });
            if (isDirty) {
                if (!config.hard) {
                    task.print('Repository has modifications, skip update');
                    return TaskState.skip;
                }
                task.print('Repository has modifications, stash changes');
                try {
                    await bash(cmd.git, ['stash'], {
                        cwd: path,
                    });
                } catch (error) {
                    const err = error as Error;
                    task.print('Stashing changes failed, unable to proceed with code restoration');
                    task.print(err.message);
                    return TaskState.error;
                }
            }

            // 检查当前分支
            let isEditorBranch = false;
            try {
                await bash(cmd.git, ['branch', '--show-current'], {
                    cwd: path,
                }, (chunk) => {
                    const log = `${chunk}`;
                    if (new RegExp(config.repo.local).test(log)) {
                        isEditorBranch = true;
                    }
                });
            } catch (error) {
                const err = error as Error;
                task.print('Failed to retrieve local commits [ git rev-parse HEAD ]');
                task.print(err.message);
                return TaskState.error;
            }
            if (!isEditorBranch && !config.hard) {
                task.print(`Not on the ${config.repo.local} branch, skipping update`);
                return TaskState.skip;
            }
            try {
                // 从当前位置切出分支，如果有则忽略
                await bash(cmd.git, ['checkout', '-b', config.repo.local], {
                    cwd: path,
                }, () => {});
            } catch (error) { /** ignore */ }

            try {
                // 从当前位置切出分支，如果有则忽略
                await bash(cmd.git, ['checkout', config.repo.local], {
                    cwd: path,
                }, () => {});
            } catch (error) { /** ignore */ }

            try {
                let info = '';
                await bash(cmd.git, ['reset', '--hard', remoteID], {
                    cwd: path,
                }, (chunk) => {
                    info += chunk;
                });
                task.print(`Restore code: ${info.trim()}`);
            } catch (error) {
                const err = error as Error;
                task.print('Failed to restore code');
                task.print(err.message);
                return TaskState.error;
            }

            task.print(`>> ${config.repo.url}`);
            task.print(' ');
            return TaskState.success;
        }

        for (const repoConfig of repoConfigArray) {
            await checkoutRepo(repoConfig);
        }

        return err ? TaskState.error : TaskState.success;
    }
}
registerTask('repo', RepoTask);
