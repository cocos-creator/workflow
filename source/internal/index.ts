import { TscConfig, TscTask } from './tsc';
import { RepoConfig, RepoTask } from './repo';
import { LessConfig, LessTask } from './less';
import { FileConfig, FileTask } from './file';

/**
 * 任务配置
 */
export type ConfigType = {
    tsc: TscConfig,
    repo: RepoConfig,
    less: LessConfig,
    file: FileConfig,
};

/**
 * 任务列表
 */
export const Task = {
    tsc: TscTask,
    repo: RepoTask,
    less: LessTask,
    file: FileTask,
};
