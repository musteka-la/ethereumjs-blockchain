"use strict";
var __extends = (this && this.__extends) || (function () {
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p]; };
        return extendStatics(d, b);
    };
    return function (d, b) {
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (Object.hasOwnProperty.call(mod, k)) result[k] = mod[k];
    result["default"] = mod;
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
var async_1 = __importDefault(require("async"));
var ethereumjs_common_1 = __importDefault(require("ethereumjs-common"));
var ethereumjs_util_1 = require("ethereumjs-util");
var tape_1 = __importDefault(require("tape"));
var bn_js_1 = __importDefault(require("bn.js"));
var src_1 = require("../src");
var utils_1 = require("./utils");
var level_mem_1 = __importDefault(require("level-mem"));
var ethereumjs_block_1 = __importDefault(require("ethereumjs-block"));
var testData = __importStar(require("./testdata.json"));
var blockchain = new src_1.Blockchain();
var genesisBlock;
var blocks = [];
var forkHeader;
var common = new ethereumjs_common_1.default('ropsten');
blockchain.validate = false;
tape_1.default('should not crash on getting head of a blockchain without a genesis', function (t) {
    return blockchain.getHead(t.end);
});
tape_1.default('should throw on initialization with chain and common parameter', function (t) {
    t.throws(function () {
        new src_1.Blockchain({ chain: 'ropsten', common: common });
    }, /not allowed!$/);
    t.end();
});
tape_1.default('genesis should match', function (t) {
    var bc0 = new src_1.Blockchain({ chain: 'ropsten' });
    var bc1 = new src_1.Blockchain({ common: common });
    async_1.default.parallel([function (cb) { return bc0.getHead(cb); }, function (cb) { return bc1.getHead(cb); }], function (err, heads) {
        if (err)
            return t.end(err);
        t.equals(heads[0].hash().toString('hex'), common.genesis().hash.slice(2), 'correct genesis hash');
        t.equals(heads[0].hash().toString('hex'), heads[1].hash().toString('hex'), 'genesis blocks match');
        t.end();
    });
});
tape_1.default('alternate constructors', function (t) {
    var db = level_mem_1.default();
    t.test('support constructor with db parameter', function (tt) {
        var blockchain = new src_1.Blockchain(db);
        tt.equals(db, blockchain.db);
        tt.end();
    });
    t.test('support blockDb and detailsDb params', function (tt) {
        var opts = { detailsDb: db, blockDb: db };
        var blockchain = new (/** @class */ (function (_super) {
            __extends(class_1, _super);
            function class_1() {
                return _super.call(this, opts) || this;
            }
            return class_1;
        }(src_1.Blockchain)))();
        tt.equals(db, blockchain.db);
        tt.notOk(blockchain.detailsDb);
        tt.end();
    });
});
tape_1.default('genesis block hash should be correct', function (t) {
    genesisBlock = new ethereumjs_block_1.default();
    genesisBlock.setGenesisParams();
    blockchain.putGenesis(genesisBlock, function (err) {
        if (err)
            return t.end(err);
        t.equals(genesisBlock.hash().toString('hex'), blockchain.meta.genesis.toString('hex'));
        blocks.push(genesisBlock);
        t.end();
    });
});
tape_1.default('should not validate a block incorrectly flagged as genesis', function (t) {
    var badBlock = new ethereumjs_block_1.default();
    badBlock.header.number = Buffer.from([]);
    blockchain.validate = true;
    blockchain.putBlock(badBlock, function (err) {
        t.ok(err);
        blockchain.validate = false;
        t.end();
    }, false);
});
tape_1.default('should add blocks', function (t) {
    var addNextBlock = function (blockNumber) {
        var block = new ethereumjs_block_1.default();
        block.header.number = ethereumjs_util_1.toBuffer(blockNumber);
        block.header.difficulty = '0xfffffff';
        block.header.parentHash = blocks[blockNumber - 1].hash();
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
    addNextBlock(1);
});
tape_1.default('should get block by number', function (t) {
    blockchain.getBlock(1, function (err, block) {
        if (err)
            return t.end(err);
        t.equals(block.hash().toString('hex'), blocks[1].hash().toString('hex'));
        t.end();
    });
});
tape_1.default('should get block by hash', function (t) {
    blockchain.getBlock(genesisBlock.hash(), function (err, block) {
        if (err)
            return t.end(err);
        t.equals(block.hash().toString('hex'), genesisBlock.hash().toString('hex'));
        t.end();
    });
});
tape_1.default('start: genesisHash, max: 5, skip: 0, reverse: false', function (t) {
    blockchain.getBlocks(genesisBlock.hash(), 5, 0, false, function (err, blocks) {
        if (err)
            return t.end(err);
        t.equals(blocks.length, 5, 'should get 5 blocks');
        t.ok(utils_1.isConsecutive(blocks), 'blocks should be consecutive');
        t.end();
    });
});
tape_1.default('start: genesisHash, max: 5, skip: 1, reverse: false', function (t) {
    blockchain.getBlocks(genesisBlock.hash(), 5, 1, false, function (err, blocks) {
        if (err)
            return t.end(err);
        t.equals(blocks.length, 5, 'should get 5 blocks');
        t.ok(!utils_1.isConsecutive(blocks), 'blocks should not be consecutive');
        t.end();
    });
});
tape_1.default('start: genesisHash, max: 5, skip: 2, reverse: false', function (t) {
    blockchain.getBlocks(genesisBlock.hash(), 5, 2, false, function (err, blocks) {
        if (err)
            return t.end(err);
        t.equals(blocks.length, 4, 'should get 4 blocks');
        t.ok(!utils_1.isConsecutive(blocks), 'blocks should not be consecutive');
        t.end();
    });
});
tape_1.default('start: genesisHash, max: 12, skip: 0, reverse: false', function (t) {
    blockchain.getBlocks(genesisBlock.hash(), 12, 0, false, function (err, blocks) {
        if (err)
            return t.end(err);
        t.equals(blocks.length, 10, 'should get 10 blocks');
        t.ok(utils_1.isConsecutive(blocks), 'blocks should be consecutive');
        t.end();
    });
});
tape_1.default('start: 0, max: 5, skip: 0, reverse: false', function (t) {
    blockchain.getBlocks(0, 5, 0, false, function (err, blocks) {
        if (err)
            return t.end(err);
        t.equals(blocks.length, 5, 'should get 5 blocks');
        t.ok(utils_1.isConsecutive(blocks), 'blocks should be consecutive');
        t.end();
    });
});
tape_1.default('start: 1, max: 5, skip: 1, reverse: false', function (t) {
    blockchain.getBlocks(1, 5, 1, false, function (err, blocks) {
        if (err)
            return t.end(err);
        t.equals(blocks.length, 5, 'should get 5 blocks');
        t.ok(!utils_1.isConsecutive(blocks), 'blocks should not be consecutive');
        t.end();
    });
});
tape_1.default('start: 0, max: 5, skip: 2, reverse: false', function (t) {
    blockchain.getBlocks(0, 5, 2, false, function (err, blocks) {
        if (err)
            return t.end(err);
        t.equals(blocks.length, 4, 'should get 4 blocks');
        t.ok(!utils_1.isConsecutive(blocks), 'blocks should not be consecutive');
        t.end();
    });
});
tape_1.default('start: 0, max: 12, skip: 0, reverse: false', function (t) {
    blockchain.getBlocks(0, 12, 0, false, function (err, blocks) {
        if (err)
            return t.end(err);
        t.equals(blocks.length, 10, 'should get 10 blocks');
        t.ok(utils_1.isConsecutive(blocks), 'blocks should be consecutive');
        t.end();
    });
});
tape_1.default('start: 1, max: 5, skip: 0, reverse: false', function (t) {
    blockchain.getBlocks(1, 5, 0, false, function (err, blocks) {
        if (err)
            return t.end(err);
        t.equals(blocks.length, 5, 'should get 5 blocks');
        t.ok(utils_1.isConsecutive(blocks), 'blocks should be consecutive');
        t.end();
    });
});
tape_1.default('start: 5, max: 5, skip: 0, reverse: true', function (t) {
    blockchain.getBlocks(5, 5, 0, true, function (err, blocks) {
        if (err)
            return t.end(err);
        t.equals(blocks.length, 5, 'should get 5 blocks');
        t.ok(utils_1.isConsecutive(blocks.reverse()), 'blocks should be consecutive');
        t.end();
    });
});
tape_1.default('start: 5, max: 10, skip: 0, reverse: true', function (t) {
    blockchain.getBlocks(5, 10, 0, true, function (err, blocks) {
        if (err)
            return t.end(err);
        t.equals(blocks.length, 6, 'should get 6 blocks');
        t.ok(utils_1.isConsecutive(blocks.reverse()), 'blocks should be consecutive');
        t.end();
    });
});
tape_1.default('start: 5, max: 10, skip: 0, reverse: true', function (t) {
    blockchain.getBlocks(5, 10, 1, true, function (err, blocks) {
        if (err)
            return t.end(err);
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
tape_1.default('should iterate through 9 blocks', function (t) {
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
    forkHeader = new ethereumjs_block_1.default.Header();
    forkHeader.number = ethereumjs_util_1.toBuffer(9);
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
            tt.equals(blockchain._headHeader.toString('hex'), blocks[8].hash().toString('hex'));
            tt.end();
        });
        t.test('should not change headBlock', function (tt) {
            tt.equals(blockchain._headBlock.toString('hex'), blocks[8].hash().toString('hex'));
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
        t.equals(blockchain._headHeader.toString('hex'), genesisBlock.hash().toString('hex'), 'should have genesis as head');
        t.end();
    });
});
tape_1.default('should put multiple blocks at once', function (t) {
    blockchain.putBlocks(blocks.slice(1), t.end);
});
tape_1.default('should get heads', function (t) {
    utils_1.createTestDB(function (err, db, genesis) {
        if (err)
            return t.end(err);
        var blockchain = new src_1.Blockchain({ db: db });
        blockchain.getHead(function (err, head) {
            if (err)
                return t.end(err);
            t.equals(head.hash().toString('hex'), genesis.hash().toString('hex'), 'should get head');
            t.equals(blockchain._heads['head0'].toString('hex'), 'abcd', 'should get state root heads');
            t.end();
        });
    });
});
tape_1.default('should validate', function (t) {
    var blockchain = new src_1.Blockchain({ validate: true });
    var genesisBlock = new ethereumjs_block_1.default();
    genesisBlock.setGenesisParams();
    blockchain.putGenesis(genesisBlock, function (err) {
        t.error(err, 'should validate genesisBlock');
        var invalidBlock = new ethereumjs_block_1.default();
        blockchain.putBlock(invalidBlock, function (err) {
            t.ok(err, 'should not validate an invalid block');
            t.end();
        });
    });
});
tape_1.default('add block with body', function (t) {
    var blockchain = new src_1.Blockchain({ validate: false });
    var genesisBlock = new ethereumjs_block_1.default(Buffer.from(testData.genesisRLP.slice(2), 'hex'));
    blockchain.putGenesis(genesisBlock, function (err) {
        if (err)
            return t.end(err);
        var block = new ethereumjs_block_1.default(Buffer.from(testData.blocks[0].rlp.slice(2), 'hex'));
        blockchain.putBlock(block, function (err) {
            t.error(err, 'should add block with a body');
            t.end();
        });
    });
});
tape_1.default('uncache db ops', function (t) {
    utils_1.createTestDB(function (err, db, genesis) {
        if (err)
            return t.end(err);
        var blockchain = new src_1.Blockchain({ db: db });
        t.test('should perform _hashToNumber correctly', function (tt) {
            blockchain._hashToNumber(genesisBlock.hash(), function (err, number) {
                if (err)
                    tt.end(err);
                tt.equals(number.toString(10), '0');
                tt.end();
            });
        });
        t.test('should perform _numberToHash correctly', function (tt) {
            blockchain._numberToHash(new bn_js_1.default(0), function (err, hash) {
                if (err)
                    return t.end(err);
                t.equals(genesisBlock.hash().toString('hex'), hash.toString('hex'));
                tt.end();
            });
        });
        t.test('should perform _getTd correctly', function (tt) {
            blockchain.getTd(genesisBlock.hash(), new bn_js_1.default(0), function (err, td) {
                if (err)
                    return t.end(err);
                t.equals(td.toBuffer().toString('hex'), genesis.header.difficulty.toString('hex'));
            });
            t.end();
        });
    });
});
tape_1.default('save heads', function (t) {
    var db = level_mem_1.default();
    var blockchain = new src_1.Blockchain({ db: db, validate: false });
    var header = new ethereumjs_block_1.default.Header();
    header.number = ethereumjs_util_1.toBuffer(1);
    header.difficulty = '0xfffffff';
    header.parentHash = blocks[0].hash();
    blockchain.putHeader(header, function (err) {
        if (err)
            return t.end(err);
        blockchain = new src_1.Blockchain({ db: db, validate: false });
        t.test('should save headHeader', function (tt) {
            blockchain.getLatestHeader(function (err, latest) {
                if (err)
                    tt.end(err);
                tt.equals(latest.hash().toString('hex'), header.hash().toString('hex'));
                tt.end();
            });
        });
        t.test('should save headBlock', function (tt) {
            blockchain.getLatestBlock(function (err, latest) {
                if (err)
                    tt.end(err);
                tt.equals(latest.hash().toString('hex'), blocks[0].hash().toString('hex'));
                tt.end();
            });
        });
    });
});
tape_1.default('should not modify cached objects', function (t) {
    var blockchain = new src_1.Blockchain({ validate: false });
    // clone blocks[1]
    var testBlock = new ethereumjs_block_1.default(ethereumjs_util_1.rlp.decode(ethereumjs_util_1.rlp.encode(blocks[1].raw)));
    var cachedHash;
    blockchain.putBlock(testBlock, function (err) {
        if (err)
            return t.end(err);
        cachedHash = testBlock.hash();
        // change testBlock's extraData in order to modify its hash
        testBlock.header.extraData = Buffer.from([1]);
        blockchain.getBlock(1, function (err, block) {
            if (err)
                return t.end(err);
            t.equals(cachedHash.toString('hex'), block.hash().toString('hex'));
            t.end();
        });
    });
});
tape_1.default('get latest', function (t) {
    var blockchain = new src_1.Blockchain({
        validate: false,
    });
    var headers = [new ethereumjs_block_1.default.Header(), new ethereumjs_block_1.default.Header()];
    headers[0].number = ethereumjs_util_1.toBuffer(1);
    headers[0].difficulty = '0xfffffff';
    headers[0].parentHash = blocks[0].hash();
    headers[1].number = ethereumjs_util_1.toBuffer(2);
    headers[1].difficulty = '0xfffffff';
    headers[1].parentHash = headers[0].hash();
    t.test('add some headers and make sure the latest block remains the same', function (tt) {
        blockchain.putHeaders(headers, function (err) {
            if (err)
                tt.end(err);
            // first, add some headers and make sure the latest block remains the same
            tt.test('should update latest header', function (ttt) {
                blockchain.getLatestHeader(function (err, header) {
                    if (err)
                        ttt.end(err);
                    ttt.equals(header.hash().toString('hex'), headers[1].hash().toString('hex'));
                    ttt.end();
                });
            });
            tt.test('should not change latest block', function (ttt) {
                blockchain.getLatestBlock(function (err, block) {
                    if (err)
                        ttt.end(err);
                    ttt.equals(block.hash().toString('hex'), blocks[0].hash().toString('hex'));
                    ttt.end();
                });
            });
        });
    });
    t.test('add a full block and make sure the latest header remains the same', function (tt) {
        blockchain.putBlock(blocks[1], function (err) {
            if (err)
                tt.end(err);
            tt.test('should not change latest header', function (ttt) {
                blockchain.getLatestHeader(function (err, header) {
                    if (err)
                        ttt.end(err);
                    t.equals(header.hash().toString('hex'), headers[1].hash().toString('hex'));
                    ttt.end();
                });
            });
            tt.test('should update latest block', function (ttt) {
                blockchain.getLatestBlock(function (err, block) {
                    if (err)
                        ttt.end(err);
                    ttt.equals(block.hash().toString('hex'), blocks[1].hash().toString('hex'));
                    ttt.end();
                });
            });
            t.end();
        });
    });
});
tape_1.default('mismatched chains', function (t) {
    var common = new ethereumjs_common_1.default('rinkeby');
    var blockchain = new src_1.Blockchain({ common: common, validate: false });
    var blocks = [
        new ethereumjs_block_1.default(null, { common: common }),
        new ethereumjs_block_1.default(null, { chain: 'rinkeby' }),
        new ethereumjs_block_1.default(null, { chain: 'ropsten' }),
    ];
    blocks[0].setGenesisParams();
    blocks[1].header.number = 1;
    blocks[1].header.parentHash = blocks[0].hash();
    blocks[2].header.number = 2;
    blocks[2].header.parentHash = blocks[1].hash();
    async_1.default.eachOfSeries(blocks, function (block, i, cb) {
        if (i === 0) {
            blockchain.putGenesis(block, cb);
        }
        else {
            blockchain.putBlock(block, function (err) {
                if (i === 2) {
                    t.ok(err.message.match('Chain mismatch'), 'should return chain mismatch error');
                }
                else {
                    t.error(err, 'should not return mismatch error');
                }
                t.end();
            });
        }
    });
});
//# sourceMappingURL=genesis-chain.js.map