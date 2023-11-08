exports.test = function(params) {
    if (params.testB !== true) {
        throw new Error('test-b: 收到参数错误');
    }
}
