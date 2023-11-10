'use strict';

import { Stats, stat, readdir, existsSync, mkdirSync } from 'fs';
import { join } from 'path';
import { spawn, SpawnOptionsWithoutStdio } from 'child_process';

/**
 * 循环传入的文件/文件夹里所有的文件/文件夹
 * @param path 
 * @param handle 
 * @returns 
 */
export async function forEachFiles(path: string, handle: (file: string, stat: Stats) => void) {
    return new Promise((resolve, reject) => {
        stat(path, (error, fileStat) => {
            if (error) {
                return reject();
            }
            handle(path, fileStat);
            if (fileStat.isDirectory()) {
                readdir(path, async (error, names) => {
                    for (let name of names) {
                        await forEachFiles(join(path, name), handle);
                    }
                    resolve(undefined);
                });
            } else {
                resolve(undefined);
            }
        });
    });
}

/**
 * 执行一个 bash 命令
 * @param cmd 
 * @param args 
 * @param options 
 * @returns 
 */
export async function bash(cmd: string, args: string[], options: SpawnOptionsWithoutStdio = {}, handle?: (data: Buffer) => void) {
    return new Promise((resolve, reject) => {
        if (options.cwd && !existsSync(options.cwd)) {
            mkdirSync(options.cwd);
        }
        const child = spawn(cmd, args, options);
        child.stdout && child.stdout.on('data', (data) => {
            handle ? handle(data) : console.log(data + '');
        });
        child.stderr && child.stderr.on('data', (data) => {
            handle ? handle(data) : console.log(data + '');
        });
        child.on('close', (code) => {
            if (code === 0) {
                resolve(code);
            } else {
                reject();
            }
        });
        child.on('error', (error) => {
            reject(error);
        });
    });
};

/**
 * Formats the given time value.
 *
 * @param {number} time - The time value to be formatted.
 * @return {void} This function does not return any value.
 */
export function formatTime(time: number) {
    if (time < 10000) {
        return `${(time + 'ms').padStart(6, ' ')}`;
    } else if (time < 100000000) {
        return `${(time / 1000 + 's ').padStart(6, ' ')}`;
    }
    return `${(time + 'ms').padStart(6, ' ')}`;
}
