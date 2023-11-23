import { TscConfig, TscTask } from './tsc';
import { RepoConfig, RepoTask } from './repo';
import { LessConfig, LessTask } from './less';
import { FileConfig, FileTask } from './file';
import { RemoveConfig, RemoveTask } from './remove';
import { ChmodConfig, ChmodTask } from './chmod';
import { DownloadConfig, DownloadTask } from './download';
import { NPMConfig, NPMTask } from './npm';

/**
 * 任务配置
 */
export type ConfigType = {
    tsc: TscConfig,
    repo: RepoConfig,
    less: LessConfig,
    file: FileConfig,
    remove: RemoveConfig,
    chmod: ChmodConfig,
    download: DownloadConfig,
    npm: NPMConfig,
};

/**
 * 任务列表
 */
export const Task = {
    tsc: TscTask,
    repo: RepoTask,
    less: LessTask,
    file: FileTask,
    remove: RemoveTask,
    chmod: ChmodTask,
    download: DownloadTask,
    npm: NPMTask,
};
