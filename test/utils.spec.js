const { equal } = require('node:assert');
const { describe, it } = require('node:test');
const { join } = require('node:path');
const { mkdirSync } = require('node:fs');

const { forEachFiles } = require('../dist/utils');

describe('utils', () => {

    describe('forEachFiles', () => {

        const files = [
            join(__dirname, './utils/forEachFiles'),
            join(__dirname, './utils/forEachFiles/file'),
            join(__dirname, './utils/forEachFiles/empty'),
            join(__dirname, './utils/forEachFiles/dir'),
            join(__dirname, './utils/forEachFiles/dir/sub-file'),
        ];

        // 空文件夹不能上传
        try {
            mkdirSync(files[2]);
        } catch(error) {}

        it('文件', async () => {
            const list = [];
            await forEachFiles(files[1], (file, stat) => {
                list.push(file);
            });
            equal(1, list.length);
            equal(files[1], list[0]);
        });

        it('空的文件夹', async () => {
            const list = [];
            await forEachFiles(files[2], (file, stat) => {
                list.push(file);
            });
            equal(1, list.length);
            equal(files[2], list[0]);
        });

        it('有文件的文件夹', async () => {
            const list = [];
            await forEachFiles(files[3], (file, stat) => {
                list.push(file);
            });
            equal(2, list.length);
            equal(files[3], list[0]);
            equal(files[4], list[1]);
        });


        it('带有文件夹、文件的文件夹', async () => {
            const list = [];
            await forEachFiles(files[0], (file, stat) => {
                list.push(file);
            });
            equal(files.length, list.length);
            equal(files[0], list[0]);
        });

    });

});
