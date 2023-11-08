exports.test = function(params) {
    if (params.testA !== true) {
        throw new Error('test-a: 收到参数错误');
    }
}
