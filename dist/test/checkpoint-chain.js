"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
var async_1 = __importDefault(require("async"));
var ethereumjs_util_1 = require("ethereumjs-util");
var tape_1 = __importDefault(require("tape"));
var src_1 = require("../src");
var utils_1 = require("./utils");
var Block = require('ethereumjs-block');
var blockchain = new src_1.Blockchain();
var checkpointBlock;
var genesisBlock;
var blocks = [];
var forkHeader;
blockchain.validate = false;
tape_1.default('genesis block hash should be correct', function (t) {
    genesisBlock = new Block();
    genesisBlock.setGenesisParams();
    blockchain.putGenesis(genesisBlock, function (err) {
        if (err)
            return t.end(err);
        t.equals(genesisBlock.hash().toString('hex'), blockchain.meta.genesis.toString('hex'));
        t.end();
    });
});
tape_1.default('should add checkpoint block', function (t) {
    var block = new Block();
    block.header.number = ethereumjs_util_1.toBuffer(99);
    block.header.difficulty = '0xfffffff';
    async_1.default.series([
        function (cb) { return blockchain.putCheckpoint(block, cb); },
        function (cb) { return blockchain.getLatestBlock(cb); },
    ], function (err, res) {
        if (err)
            return t.end(err);
        checkpointBlock = res[1];
        blocks.push(res[1]);
        t.end();
    });
});
tape_1.default('should add blocks', function (t) {
    var addNextBlock = function (blockNumber) {
        var block = new Block();
        block.header.number = ethereumjs_util_1.toBuffer(blockNumber);
        block.header.difficulty = '0xfffffff';
        block.header.parentHash = blocks[blockNumber - 100].hash();
        blockchain.putBlock(block, function (err) {
            if (err)
                return t.end(err);
            blocks.push(block);
            if (blocks.length === 10) {
                t.ok(true, 'added 10 blocks');
                t.end();
            }
            else {
                addNextBlock(blockNumber + 1);
            }
        });
    };
    addNextBlock(100);
});
tape_1.default('should get block by number', function (t) {
    blockchain.getBlock(100, function (err, block) {
        if (err)
            return t.end(err);
        t.equals(block.hash().toString('hex'), blocks[1].hash().toString('hex'));
        t.end();
    });
});
tape_1.default('should get block by hash', function (t) {
    blockchain.getBlock(checkpointBlock.hash(), function (err, block) {
        if (err)
            return t.end(err);
        t.equals(block.hash().toString('hex'), checkpointBlock.hash().toString('hex'));
        t.end();
    });
});
tape_1.default('start: checkpointBlock, max: 5, skip: 0, reverse: false', function (t) {
    blockchain.getBlocks(checkpointBlock.hash(), 5, 0, false, function (err, blocks) {
        if (err)
            return t.end(err);
        t.equals(blocks.length, 5, 'should get 5 blocks');
        t.ok(utils_1.isConsecutive(blocks), 'blocks should be consecutive');
        t.end();
    });
});
tape_1.default('start: genesisHash, max: 5, skip: 1, reverse: false', function (t) {
    blockchain.getBlocks(checkpointBlock.hash(), 5, 1, false, function (err, blocks) {
        if (err)
            return t.end(err);
        t.equals(blocks.length, 5, 'should get 5 blocks');
        t.ok(!utils_1.isConsecutive(blocks), 'blocks should not be consecutive');
        t.end();
    });
});
tape_1.default('start: genesisHash, max: 5, skip: 2, reverse: false', function (t) {
    blockchain.getBlocks(checkpointBlock.hash(), 5, 2, false, function (err, blocks) {
        if (err)
            return t.end(err);
        t.equals(blocks.length, 4, 'should get 4 blocks');
        t.ok(!utils_1.isConsecutive(blocks), 'blocks should not be consecutive');
        t.end();
    });
});
tape_1.default('start: genesisHash, max: 12, skip: 0, reverse: false', function (t) {
    blockchain.getBlocks(checkpointBlock.hash(), 12, 0, false, function (err, blocks) {
        if (err)
            return t.end(err);
        t.equals(blocks.length, 10, 'should get 10 blocks');
        t.ok(utils_1.isConsecutive(blocks), 'blocks should be consecutive');
        t.end();
    });
});
tape_1.default('start: 0, max: 5, skip: 0, reverse: false', function (t) {
    blockchain.getBlocks(100, 5, 0, false, function (err, blocks) {
        if (err)
            return t.end(err);
        t.equals(blocks.length, 5, 'should get 5 blocks');
        t.ok(utils_1.isConsecutive(blocks), 'blocks should be consecutive');
        t.end();
    });
});
tape_1.default('start: 1, max: 5, skip: 1, reverse: false', function (t) {
    blockchain.getBlocks(100, 5, 1, false, function (err, blocks) {
        if (err)
            return t.end(err);
        t.equals(blocks.length, 5, 'should get 5 blocks');
        t.ok(!utils_1.isConsecutive(blocks), 'blocks should not be consecutive');
        t.end();
    });
});
tape_1.default('start: 0, max: 5, skip: 2, reverse: false', function (t) {
    blockchain.getBlocks(99, 5, 2, false, function (err, blocks) {
        if (err)
            return t.end(err);
        t.equals(blocks.length, 4, 'should get 4 blocks');
        t.ok(!utils_1.isConsecutive(blocks), 'blocks should not be consecutive');
        t.end();
    });
});
tape_1.default('start: 0, max: 12, skip: 0, reverse: false', function (t) {
    blockchain.getBlocks(99, 12, 0, false, function (err, blocks) {
        if (err)
            return t.end(err);
        t.equals(blocks.length, 10, 'should get 10 blocks');
        t.ok(utils_1.isConsecutive(blocks), 'blocks should be consecutive');
        t.end();
    });
});
tape_1.default('start: 1, max: 5, skip: 0, reverse: false', function (t) {
    blockchain.getBlocks(100, 5, 0, false, function (err, blocks) {
        if (err)
            return t.end(err);
        t.equals(blocks.length, 5, 'should get 5 blocks');
        t.ok(utils_1.isConsecutive(blocks), 'blocks should be consecutive');
        t.end();
    });
});
tape_1.default('start: 5, max: 5, skip: 0, reverse: true', function (t) {
    blockchain.getBlocks(105, 5, 0, true, function (err, blocks) {
        if (err)
            return t.end(err);
        t.equals(blocks.length, 5, 'should get 5 blocks');
        t.ok(utils_1.isConsecutive(blocks.reverse()), 'blocks should be consecutive');
        t.end();
    });
});
tape_1.default('start: 5, max: 10, skip: 0, reverse: true', function (t) {
    blockchain.getBlocks(105, 10, 0, true, function (err, blocks) {
        if (err)
            return t.end(err);
        blocks.shift(); // get rid of checkpoint
        t.equals(blocks.length, 6, 'should get 6 blocks');
        t.ok(utils_1.isConsecutive(blocks.reverse()), 'blocks should be consecutive');
        t.end();
    });
});
tape_1.default('start: 5, max: 10, skip: 0, reverse: true', function (t) {
    blockchain.getBlocks(105, 10, 1, true, function (err, blocks) {
        if (err)
            return t.end(err);
        blocks.shift(); // get rid of checkpoint
        t.equals(blocks.length, 3, 'should get 3 blocks');
        t.ok(!utils_1.isConsecutive(blocks.reverse()), 'blocks should not be consecutive');
        t.end();
    });
});
tape_1.default('should find needed hash', function (t) {
    var neededHash = Buffer.from('abcdef', 'hex');
    blockchain.selectNeededHashes([blocks[0].hash(), blocks[9].hash(), neededHash], function (err, hashes) {
        if (err)
            return t.end(err);
        t.equals(hashes[0].toString('hex'), neededHash.toString('hex'));
        t.end();
    });
});
tape_1.default('should iterate through 9 blocks', function (t) {
    var i = 0;
    blockchain.iterator('test', function (block, _, cb) {
        if (block.hash().equals(blocks[i + 1].hash()))
            i++;
        cb();
    }, function () {
        t.equals(i, 9);
        t.end();
    });
});
tape_1.default('should handle iterator errors', function (t) {
    blockchain.iterator('error', function (_, __, cb) {
        cb(new Error('iterator func error'));
    }, function (err) {
        t.ok(err, 'should catch iterator func error');
        t.equal(err.message, 'iterator func error', 'should return correct error');
        t.end();
    });
});
tape_1.default("iterator shouldn't error on empty", function (t) {
    var blockchain = new src_1.Blockchain();
    blockchain.validate = false;
    blockchain.iterator('test', function () {
        t.fail('should not call iterator function');
    }, function (err) {
        t.error(err, 'should not return error');
        t.ok(true, 'should finish iterating');
        t.end();
    });
});
tape_1.default('should get meta', function (t) {
    t.test('should get meta.rawHead', function (tt) {
        tt.equals(blockchain.meta.rawHead.toString('hex'), blocks[9].hash().toString('hex'));
        tt.end();
    });
    t.test('should get meta.checkpoint', function (tt) {
        tt.equals(blockchain.meta.checkpoint.toString('hex'), checkpointBlock.hash().toString('hex'));
        tt.end();
    });
    t.test('should get meta.genesis', function (tt) {
        tt.equals(blockchain.meta.genesis.toString('hex'), genesisBlock.hash().toString('hex'));
        tt.end();
    });
    t.test('should get meta.heads', function (tt) {
        tt.ok(blockchain.meta.heads['test']);
        tt.end();
    });
    t.end();
});
tape_1.default("should add fork header and reset stale heads", function (t) {
    forkHeader = new Block.Header();
    forkHeader.number = ethereumjs_util_1.toBuffer(108);
    forkHeader.difficulty = '0xffffffff';
    forkHeader.parentHash = blocks[8].hash();
    blockchain._heads['staletest'] = blockchain._headHeader;
    blockchain.putHeader(forkHeader, function (err) {
        if (err)
            return t.end(err);
        t.test('should update stale head', function (tt) {
            tt.equals(blockchain._heads['staletest'].toString('hex'), blocks[8].hash().toString('hex'));
            tt.end();
        });
        t.test('should update stale headBlock', function (tt) {
            tt.equals(blockchain._headBlock.toString('hex'), blocks[8].hash().toString('hex'));
            tt.end();
        });
        t.end();
    });
});
tape_1.default("delete fork header", function (t) {
    blockchain.delBlock(forkHeader.hash(), function (err) {
        if (err)
            return t.end(err);
        t.test('should reset headHeader', function (tt) {
            t.equals(blockchain._headHeader.toString('hex'), blocks[8].hash().toString('hex'));
            tt.end();
        });
        t.test('should not change headBlock', function (tt) {
            t.equals(blockchain._headBlock.toString('hex'), blocks[8].hash().toString('hex'));
            tt.end();
        });
        t.end();
    });
});
tape_1.default('should delete blocks in canonical chain', function (t) {
    var delNextBlock = function (number, cb) {
        var block = blocks[number];
        blockchain.delBlock(block.hash(), function (err) {
            if (err)
                return cb(err);
            if (number > 6) {
                return delNextBlock(--number, cb);
            }
            cb();
        });
    };
    delNextBlock(9, function (err) {
        if (err)
            return t.end(err);
        t.equals(blockchain._headHeader.toString('hex'), blocks[5].hash().toString('hex'), 'should have block 5 as head');
        t.end();
    });
});
tape_1.default('should delete block and children', function (t) {
    blockchain.delBlock(blocks[1].hash(), function (err) {
        if (err)
            return t.end(err);
        t.equals(blockchain._headHeader.toString('hex'), checkpointBlock.hash().toString('hex'), 'should have genesis as head');
        t.end();
    });
});
tape_1.default('should put multiple blocks at once', function (t) {
    blockchain.putBlocks(blocks.slice(1), t.end);
});
//# sourceMappingURL=checkpoint-chain.js.map