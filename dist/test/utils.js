"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var ethereumjs_util_1 = require("ethereumjs-util");
var Block = require('ethereumjs-block');
var level = require('level-mem');
var BN = require("bn.js");
function isConsecutive(blocks) {
    return !blocks.some(function (block, index) {
        if (index === 0) {
            return false;
        }
        return Buffer.compare(block.header.parentHash, blocks[index - 1].hash()) !== 0;
    });
}
exports.isConsecutive = isConsecutive;
function createTestDB(cb) {
    var genesis = new Block();
    genesis.setGenesisParams();
    var db = level();
    db.batch([
        {
            type: 'put',
            key: Buffer.from('6800000000000000006e', 'hex'),
            keyEncoding: 'binary',
            valueEncoding: 'binary',
            value: genesis.hash(),
        },
        {
            type: 'put',
            key: Buffer.from('48d4e56740f876aef8c010b86a40d5f56745a118d0906a34e69aec8c0db1cb8fa3', 'hex'),
            keyEncoding: 'binary',
            valueEncoding: 'binary',
            value: Buffer.from('00', 'hex'),
        },
        {
            type: 'put',
            key: 'LastHeader',
            keyEncoding: 'binary',
            valueEncoding: 'binary',
            value: genesis.hash(),
        },
        {
            type: 'put',
            key: 'LastBlock',
            keyEncoding: 'binary',
            valueEncoding: 'binary',
            value: genesis.hash(),
        },
        {
            type: 'put',
            key: Buffer.from('680000000000000000d4e56740f876aef8c010b86a40d5f56745a118d0906a34e69aec8c0db1cb8fa3', 'hex'),
            keyEncoding: 'binary',
            valueEncoding: 'binary',
            value: ethereumjs_util_1.rlp.encode(genesis.header.raw),
        },
        {
            type: 'put',
            key: Buffer.from('680000000000000000d4e56740f876aef8c010b86a40d5f56745a118d0906a34e69aec8c0db1cb8fa374', 'hex'),
            keyEncoding: 'binary',
            valueEncoding: 'binary',
            value: ethereumjs_util_1.rlp.encode(new BN(17179869184).toBuffer()),
        },
        {
            type: 'put',
            key: Buffer.from('620000000000000000d4e56740f876aef8c010b86a40d5f56745a118d0906a34e69aec8c0db1cb8fa3', 'hex'),
            keyEncoding: 'binary',
            valueEncoding: 'binary',
            value: ethereumjs_util_1.rlp.encode(genesis.serialize(false).slice(1)),
        },
        {
            type: 'put',
            key: 'heads',
            valueEncoding: 'json',
            value: { head0: { type: 'Buffer', data: [171, 205] } },
        },
    ], function (err) {
        cb(err, db, genesis);
    });
}
exports.createTestDB = createTestDB;
//# sourceMappingURL=utils.js.map