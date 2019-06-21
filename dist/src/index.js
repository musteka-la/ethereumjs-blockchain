'use strict';
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (_) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (Object.hasOwnProperty.call(mod, k)) result[k] = mod[k];
    result["default"] = mod;
    return result;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
var async = __importStar(require("async"));
var util = __importStar(require("util"));
var ethereumjs_common_1 = __importDefault(require("ethereumjs-common"));
var dbManager_1 = __importDefault(require("./dbManager"));
var semaphore_1 = __importDefault(require("semaphore"));
var flow_stoplight_1 = __importDefault(require("flow-stoplight"));
var ethereumjs_util_1 = require("ethereumjs-util");
var util_1 = require("./util");
var ethashjs_1 = __importDefault(require("ethashjs"));
var level_mem_1 = __importDefault(require("level-mem"));
var ethereumjs_block_1 = __importDefault(require("ethereumjs-block"));
exports.Block = ethereumjs_block_1.default;
function isDb(opts) {
    return opts.constructor.name === 'LevelUP';
}
var Blockchain = /** @class */ (function () {
    function Blockchain(opts) {
        var _this = this;
        if (opts === void 0) { opts = {}; }
        // backwards compatibility with older constructor interfaces
        if (isDb(opts)) {
            opts = { db: opts };
        }
        if (opts.common) {
            if (opts.chain) {
                throw new Error('Instantiation with both opts.common and opts.chain parameter not allowed!');
            }
            this._common = opts.common;
        }
        else {
            var chain = opts.chain ? opts.chain : 'mainnet';
            var hardfork = opts.hardfork ? opts.hardfork : null;
            this._common = new ethereumjs_common_1.default(chain, hardfork);
        }
        // defaults
        this.db = opts.db ? opts.db : opts.blockDb || level_mem_1.default();
        this.dbManager = new dbManager_1.default(this.db, this._common);
        this.validate = opts.validate === undefined ? true : opts.validate;
        this.ethash = this.validate ? new ethashjs_1.default(this.db) : null;
        this._heads = {};
        this._genesis = null;
        this._headHeader = null;
        this._headBlock = null;
        this._initDone = false;
        this._putSemaphore = semaphore_1.default(1);
        this._initLock = new flow_stoplight_1.default();
        this._init(function (err) {
            if (err) {
                throw err;
            }
            _this._initLock.go();
        });
    }
    Object.defineProperty(Blockchain.prototype, "meta", {
        /**
         * Define meta getter for backwards compatibility
         */
        get: function () {
            return {
                rawHead: this._headHeader,
                heads: this._heads,
                genesis: this._genesis,
                checkpoint: this._checkpoint,
            };
        },
        enumerable: true,
        configurable: true
    });
    /**
     * Fetches the meta info about the blockchain from the db. Meta info contains
     * hashes of the headerchain head, blockchain head, genesis block and iterator
     * heads.
     */
    Blockchain.prototype._init = function (cb) {
        var self = this;
        async.waterfall([function (cb) { return self._numberToHash(new ethereumjs_util_1.BN(0), cb); }, util.callbackify(getHeads.bind(this))], function (err) {
            if (err) {
                // if genesis block doesn't exist, create one
                return self._setCanonicalGenesisBlock(function (err) {
                    if (err) {
                        return cb(err);
                    }
                    self._heads = {};
                    self._headHeader = self._genesis;
                    self._headBlock = self._genesis;
                    cb();
                });
            }
            cb();
        });
        function getHeads(genesisHash) {
            return __awaiter(this, void 0, void 0, function () {
                var heads_1, e_1, hash, e_2, e_3;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            self._genesis = genesisHash;
                            _a.label = 1;
                        case 1:
                            _a.trys.push([1, 3, , 4]);
                            return [4 /*yield*/, self.dbManager.getHeads()];
                        case 2:
                            heads_1 = _a.sent();
                            Object.keys(heads_1).forEach(function (key) {
                                heads_1[key] = Buffer.from(heads_1[key]);
                            });
                            self._heads = heads_1;
                            return [3 /*break*/, 4];
                        case 3:
                            e_1 = _a.sent();
                            self._heads = {};
                            return [3 /*break*/, 4];
                        case 4:
                            _a.trys.push([4, 6, , 7]);
                            return [4 /*yield*/, self.dbManager.getHeadHeader()];
                        case 5:
                            hash = _a.sent();
                            self._headHeader = hash;
                            return [3 /*break*/, 7];
                        case 6:
                            e_2 = _a.sent();
                            self._headHeader = genesisHash;
                            return [3 /*break*/, 7];
                        case 7:
                            _a.trys.push([7, 9, , 10]);
                            return [4 /*yield*/, self.dbManager.getHeadBlock()];
                        case 8:
                            hash = _a.sent();
                            self._headBlock = hash;
                            return [3 /*break*/, 10];
                        case 9:
                            e_3 = _a.sent();
                            self._headBlock = genesisHash;
                            return [3 /*break*/, 10];
                        case 10: return [2 /*return*/];
                    }
                });
            });
        }
    };
    /**
     * Sets the default genesis block
     */
    Blockchain.prototype._setCanonicalGenesisBlock = function (cb) {
        var genesisBlock = new ethereumjs_block_1.default(null, { common: this._common });
        genesisBlock.setGenesisParams();
        this._putBlockOrHeader(genesisBlock, cb, true);
    };
    /**
     * Puts the genesis block in the database
     */
    Blockchain.prototype.putGenesis = function (genesis, cb) {
        this.putBlock(genesis, cb, true);
    };
    /**
     * Put an arbitrary block to be used as checkpoint
     */
    Blockchain.prototype.putCheckpoint = function (checkpoint, cb) {
        var _this = this;
        this._putBlockOrHeader(checkpoint, function (err) {
            if (err) {
                return cb(err);
            }
            _this._checkpoint = checkpoint.header.hash();
            cb();
        }, false, true);
    };
    /**
     * Returns the specified iterator head.
     */
    Blockchain.prototype.getHead = function (name, cb) {
        var _this = this;
        // handle optional args
        if (typeof name === 'function') {
            cb = name;
            name = 'vm';
        }
        // ensure init completed
        this._initLock.await(function () {
            // if the head is not found return the headHeader
            var hash = _this._heads[name] || _this._headBlock;
            if (!hash) {
                return cb(new Error('No head found.'));
            }
            _this.getBlock(hash, cb);
        });
    };
    /**
     * Returns the latest header in the canonical chain.
     */
    Blockchain.prototype.getLatestHeader = function (cb) {
        var _this = this;
        // ensure init completed
        this._initLock.await(function () {
            _this.getBlock(_this._headHeader, function (err, block) {
                if (err) {
                    return cb(err);
                }
                cb(null, block.header);
            });
        });
    };
    /**
     * Returns the latest full block in the canonical chain.
     */
    Blockchain.prototype.getLatestBlock = function (cb) {
        var _this = this;
        // ensure init completed
        this._initLock.await(function () {
            _this.getBlock(_this._headBlock, cb);
        });
    };
    /**
     * Adds many blocks to the blockchain
     */
    Blockchain.prototype.putBlocks = function (blocks, cb) {
        var _this = this;
        async.eachSeries(blocks, function (block, done) {
            _this.putBlock(block, done);
        }, cb);
    };
    /**
     * Adds a block to the blockchain
     */
    Blockchain.prototype.putBlock = function (block, cb, isGenesis) {
        var _this = this;
        // make sure init has completed
        this._initLock.await(function () {
            // perform put with mutex dance
            _this._lockUnlock(function (done) {
                _this._putBlockOrHeader(block, done, isGenesis);
            }, cb);
        });
    };
    /**
     * Adds many headers to the blockchain
     */
    Blockchain.prototype.putHeaders = function (headers, cb) {
        var _this = this;
        async.eachSeries(headers, function (header, done) {
            _this.putHeader(header, done);
        }, cb);
    };
    /**
     * Adds a header to the blockchain
     */
    Blockchain.prototype.putHeader = function (header, cb) {
        var _this = this;
        // make sure init has completed
        this._initLock.await(function () {
            // perform put with mutex dance
            _this._lockUnlock(function (done) {
                _this._putBlockOrHeader(header, done);
            }, cb);
        });
    };
    Blockchain.prototype._putBlockOrHeader = function (item, cb, isGenesis, isCheckpoint) {
        if (isGenesis === void 0) { isGenesis = false; }
        if (isCheckpoint === void 0) { isCheckpoint = false; }
        var self = this;
        var isHeader = item instanceof ethereumjs_block_1.default.Header;
        var block = isHeader
            ? new ethereumjs_block_1.default([item.raw, [], []], { common: item._common })
            : item;
        var header = block.header;
        var hash = block.hash();
        var number = new ethereumjs_util_1.BN(header.number);
        var td = new ethereumjs_util_1.BN(header.difficulty);
        var currentTd = { header: null, block: null };
        var dbOps = [];
        if (block.constructor !== ethereumjs_block_1.default) {
            block = new ethereumjs_block_1.default(block, { common: self._common });
        }
        if (block._common.chainId() !== self._common.chainId()) {
            return cb(new Error('Chain mismatch while trying to put block or header'));
        }
        async.series([
            verify,
            verifyPOW,
            getCurrentTd,
            getBlockTd,
            rebuildInfo,
            function (cb) { return self._batchDbOps(dbOps.concat(self._saveHeadOps()), cb); },
        ], function (err) {
            return cb(err);
        });
        function verify(next) {
            if (!self.validate) {
                return next();
            }
            if (!isGenesis && block.isGenesis()) {
                return next(new Error('already have genesis set'));
            }
            block.validate(self, next);
        }
        function verifyPOW(next) {
            if (!self.validate) {
                return next();
            }
            self.ethash.verifyPOW(block, function (valid) {
                next(valid ? null : new Error('invalid POW'));
            });
        }
        function getCurrentTd(next) {
            if (isGenesis) {
                currentTd.header = new ethereumjs_util_1.BN(0);
                currentTd.block = new ethereumjs_util_1.BN(0);
                return next();
            }
            if (isCheckpoint) {
                currentTd.header = new ethereumjs_util_1.BN(block.header.difficulty);
                currentTd.block = new ethereumjs_util_1.BN(block.header.difficulty);
                return next();
            }
            async.parallel([
                function (cb) {
                    return self.getTd(self._headHeader, function (err, td) {
                        currentTd.header = td;
                        cb(err);
                    });
                },
                function (cb) {
                    return self.getTd(self._headBlock, function (err, td) {
                        currentTd.block = td;
                        cb(err);
                    });
                },
            ], next);
        }
        function getBlockTd(next) {
            // calculate the total difficulty of the new block
            if (isGenesis || isCheckpoint) {
                return next();
            }
            self.getTd(header.parentHash, number.subn(1), function (err, parentTd) {
                if (err) {
                    return next(err);
                }
                td.iadd(parentTd);
                next();
            });
        }
        function rebuildInfo(next) {
            // save block and total difficulty to the database
            var key = util_1.tdKey(number, hash);
            var value = ethereumjs_util_1.rlp.encode(td);
            dbOps.push({
                type: 'put',
                key: key,
                keyEncoding: 'binary',
                valueEncoding: 'binary',
                value: value,
            });
            self.dbManager._cache.td.set(key, value);
            // save header
            key = util_1.headerKey(number, hash);
            value = ethereumjs_util_1.rlp.encode(header.raw);
            dbOps.push({
                type: 'put',
                key: key,
                keyEncoding: 'binary',
                valueEncoding: 'binary',
                value: value,
            });
            self.dbManager._cache.header.set(key, value);
            // store body if it exists
            if (isGenesis || block.transactions.length || block.uncleHeaders.length) {
                var body = block.serialize(false).slice(1);
                key = util_1.bodyKey(number, hash);
                value = ethereumjs_util_1.rlp.encode(body);
                dbOps.push({
                    type: 'put',
                    key: key,
                    keyEncoding: 'binary',
                    valueEncoding: 'binary',
                    value: value,
                });
                self.dbManager._cache.body.set(key, value);
            }
            // if total difficulty is higher than current, add it to canonical chain
            if (block.isGenesis() || td.gt(currentTd.header) || isCheckpoint) {
                self._headHeader = hash;
                if (!isHeader) {
                    self._headBlock = hash;
                }
                if (block.isGenesis()) {
                    self._genesis = hash;
                }
                // delete higher number assignments and overwrite stale canonical chain
                async.parallel([
                    function (cb) { return self._deleteStaleAssignments(number.addn(1), hash, dbOps, cb); },
                    function (cb) { return self._rebuildCanonical(header, dbOps, isCheckpoint, cb); },
                ], next);
            }
            else {
                if (td.gt(currentTd.block) && !isHeader) {
                    self._headBlock = hash;
                }
                // save hash to number lookup info even if rebuild not needed
                key = util_1.hashToNumberKey(hash);
                value = util_1.bufBE8(number);
                dbOps.push({
                    type: 'put',
                    key: key,
                    keyEncoding: 'binary',
                    valueEncoding: 'binary',
                    value: value,
                });
                self.dbManager._cache.hashToNumber.set(key, value);
                next();
            }
        }
    };
    /**
     *Gets a block by its hash
     */
    Blockchain.prototype.getBlock = function (blockTag, cb) {
        var _this = this;
        // ensure init completed
        this._initLock.await(function () {
            _this._getBlock(blockTag, cb);
        });
    };
    Blockchain.prototype._getBlock = function (blockTag, cb) {
        util.callbackify(this.dbManager.getBlock.bind(this.dbManager))(blockTag, cb);
    };
    /**
     * Looks up many blocks relative to blockId
     */
    Blockchain.prototype.getBlocks = function (blockId, maxBlocks, skip, reverse, cb) {
        var self = this;
        var blocks = [];
        var i = -1;
        function nextBlock(blockId) {
            self.getBlock(blockId, function (err, block) {
                i++;
                if (err) {
                    if (err.notFound) {
                        return cb(null, blocks);
                    }
                    else {
                        return cb(err);
                    }
                }
                var nextBlockNumber = new ethereumjs_util_1.BN(block.header.number).addn(reverse ? -1 : 1);
                if (i !== 0 && skip && i % (skip + 1) !== 0) {
                    return nextBlock(nextBlockNumber);
                }
                blocks.push(block);
                if (blocks.length === maxBlocks) {
                    return cb(null, blocks);
                }
                nextBlock(nextBlockNumber);
            });
        }
        nextBlock(blockId);
    };
    /**
     * Gets block details by its hash
     * @deprecated
     */
    Blockchain.prototype.getDetails = function (_, cb) {
        cb(null, {});
    };
    /**
     * Given an ordered array, returns to the callback an array of hashes that are
     * not in the blockchain yet
     */
    Blockchain.prototype.selectNeededHashes = function (hashes, cb) {
        var self = this;
        var max, mid, min;
        max = hashes.length - 1;
        mid = min = 0;
        async.whilst(function test() {
            return max >= min;
        }, function iterate(cb2) {
            self._hashToNumber(hashes[mid], function (err, number) {
                if (!err && number) {
                    min = mid + 1;
                }
                else {
                    max = mid - 1;
                }
                mid = Math.floor((min + max) / 2);
                cb2();
            });
        }, function onDone(err) {
            if (err)
                return cb(err);
            cb(null, hashes.slice(min));
        });
    };
    Blockchain.prototype._saveHeadOps = function () {
        return [
            {
                type: 'put',
                key: 'heads',
                keyEncoding: 'binary',
                valueEncoding: 'json',
                value: this._heads,
            },
            {
                type: 'put',
                key: util_1.headHeaderKey,
                keyEncoding: 'binary',
                valueEncoding: 'binary',
                value: this._headHeader,
            },
            {
                type: 'put',
                key: util_1.headBlockKey,
                keyEncoding: 'binary',
                valueEncoding: 'binary',
                value: this._headBlock,
            },
        ];
    };
    Blockchain.prototype._saveHeads = function (cb) {
        this._batchDbOps(this._saveHeadOps(), cb);
    };
    /**
     * Delete canonical number assignments for specified number and above
     */
    Blockchain.prototype._deleteStaleAssignments = function (number, headHash, ops, cb) {
        var _this = this;
        var key = util_1.numberToHashKey(number);
        this._numberToHash(number, function (err, hash) {
            if (err) {
                return cb();
            }
            ops.push({
                type: 'del',
                key: key,
                keyEncoding: 'binary',
            });
            _this.dbManager._cache.numberToHash.del(key);
            // reset stale iterator heads to current canonical head
            Object.keys(_this._heads).forEach(function (name) {
                if (_this._heads[name].equals(hash)) {
                    _this._heads[name] = headHash;
                }
            });
            // reset stale headBlock to current canonical
            if (_this._headBlock.equals(hash)) {
                _this._headBlock = headHash;
            }
            _this._deleteStaleAssignments(number.addn(1), headHash, ops, cb);
        });
    };
    // overwrite stale canonical number assignments
    Blockchain.prototype._rebuildCanonical = function (header, ops, isCheckpoint, cb) {
        if (isCheckpoint === void 0) { isCheckpoint = false; }
        var self = this;
        var hash = header.hash();
        var number = new ethereumjs_util_1.BN(header.number);
        function saveLookups(hash, number) {
            var key = util_1.numberToHashKey(number);
            var value;
            ops.push({
                type: 'put',
                key: key,
                keyEncoding: 'binary',
                valueEncoding: 'binary',
                value: hash,
            });
            self.dbManager._cache.numberToHash.set(key, hash);
            key = util_1.hashToNumberKey(hash);
            value = util_1.bufBE8(number);
            ops.push({
                type: 'put',
                key: key,
                keyEncoding: 'binary',
                valueEncoding: 'binary',
                value: value,
            });
            self.dbManager._cache.hashToNumber.set(key, value);
        }
        // handle genesis block
        if (number.cmpn(0) === 0) {
            saveLookups(hash, number);
            return cb();
        }
        function resetStaleHeads() {
            // set stale heads to last previously valid canonical block
            ;
            (self._staleHeads || []).forEach(function (name) {
                self._heads[name] = hash;
            });
            delete self._staleHeads;
            // set stale headBlock to last previously valid canonical block
            if (self._staleHeadBlock) {
                self._headBlock = hash;
                delete self._staleHeadBlock;
            }
        }
        self._numberToHash(number, function (err, staleHash) {
            if (err) {
                staleHash = null;
            }
            if (!staleHash || !hash.equals(staleHash)) {
                saveLookups(hash, number);
                // flag stale head for reset
                Object.keys(self._heads).forEach(function (name) {
                    if (staleHash && self._heads[name].equals(staleHash)) {
                        self._staleHeads = self._staleHeads || [];
                        self._staleHeads.push(name);
                    }
                });
                // flag stale headBlock for reset
                if (staleHash && self._headBlock.equals(staleHash)) {
                    self._staleHeadBlock = true;
                }
                self._getHeader(header.parentHash, number.subn(1), function (err, header) {
                    if (err) {
                        // if this is a checkpoint, only walk back as far as possible
                        if (isCheckpoint) {
                            resetStaleHeads();
                            return cb();
                        }
                        delete self._staleHeads;
                        return cb(err);
                    }
                    self._rebuildCanonical(header, ops, isCheckpoint, cb);
                });
            }
            else {
                resetStaleHeads();
                cb();
            }
        });
    };
    /**
     * Deletes a block from the blockchain. All child blocks in the chain are deleted
     * and any encountered heads are set to the parent block
     */
    Blockchain.prototype.delBlock = function (blockHash, cb) {
        var _this = this;
        // make sure init has completed
        this._initLock.await(function () {
            // perform put with mutex dance
            _this._lockUnlock(function (done) {
                _this._delBlock(blockHash, done);
            }, cb);
        });
    };
    Blockchain.prototype._delBlock = function (blockHash, cb) {
        var self = this;
        var dbOps = [];
        var blockHeader = null;
        var blockNumber = null;
        var parentHash = null;
        var inCanonical = null;
        if (!Buffer.isBuffer(blockHash)) {
            blockHash = blockHash.hash();
        }
        async.series([
            getHeader,
            checkCanonical,
            buildDBops,
            deleteStaleAssignments,
            function (cb) { return self._batchDbOps(dbOps, cb); },
        ], cb);
        function getHeader(cb2) {
            self._getHeader(blockHash, function (err, header) {
                if (err)
                    return cb2(err);
                blockHeader = header;
                blockNumber = new ethereumjs_util_1.BN(blockHeader.number);
                parentHash = blockHeader.parentHash;
                cb2();
            });
        }
        // check if block is in the canonical chain
        function checkCanonical(cb2) {
            self._numberToHash(blockNumber, function (err, hash) {
                inCanonical = !err && hash.equals(blockHash);
                cb2();
            });
        }
        // delete the block, and if block is in the canonical chain, delete all
        // children as well
        function buildDBops(cb2) {
            self._delChild(blockHash, blockNumber, inCanonical ? parentHash : null, dbOps, cb2);
        }
        // delete all number to hash mappings for deleted block number and above
        function deleteStaleAssignments(cb2) {
            if (inCanonical) {
                self._deleteStaleAssignments(blockNumber, parentHash, dbOps, cb2);
            }
            else {
                cb2();
            }
        }
    };
    Blockchain.prototype._delChild = function (hash, number, headHash, ops, cb) {
        var self = this;
        // delete header, body, hash to number mapping and td
        ops.push({
            type: 'del',
            key: util_1.headerKey(number, hash),
            keyEncoding: 'binary',
        });
        self.dbManager._cache.header.del(util_1.headerKey(number, hash));
        ops.push({
            type: 'del',
            key: util_1.bodyKey(number, hash),
            keyEncoding: 'binary',
        });
        self.dbManager._cache.body.del(util_1.bodyKey(number, hash));
        ops.push({
            type: 'del',
            key: util_1.hashToNumberKey(hash),
            keyEncoding: 'binary',
        });
        self.dbManager._cache.hashToNumber.del(util_1.hashToNumberKey(hash));
        ops.push({
            type: 'del',
            key: util_1.tdKey(number, hash),
            keyEncoding: 'binary',
        });
        self.dbManager._cache.td.del(util_1.tdKey(number, hash));
        if (!headHash) {
            return cb();
        }
        if (hash.equals(self._headHeader)) {
            self._headHeader = headHash;
        }
        if (hash.equals(self._headBlock)) {
            self._headBlock = headHash;
        }
        self._getCanonicalHeader(number.addn(1), function (err, childHeader) {
            if (err) {
                return cb();
            }
            self._delChild(childHeader.hash(), new ethereumjs_util_1.BN(childHeader.number), headHash, ops, cb);
        });
    };
    /**
     * Iterates through blocks starting at the specified iterator head and calls
     * the onBlock function on each block. The current location of an iterator head
     * can be retrieved using the `getHead()`` method
     */
    Blockchain.prototype.iterator = function (name, onBlock, cb) {
        var _this = this;
        // ensure init completed
        this._initLock.await(function () {
            _this._iterator(name, onBlock, cb);
        });
    };
    Blockchain.prototype._iterator = function (name, func, cb) {
        var self = this;
        var blockHash = self._heads[name] || (this._checkpoint ? this._checkpoint : self._genesis);
        var blockNumber;
        var lastBlock;
        if (!blockHash) {
            return cb();
        }
        self._hashToNumber(blockHash, function (err, number) {
            if (err)
                return cb(err);
            blockNumber = number.addn(1);
            async.whilst(function () { return blockNumber; }, run, function (err) { return (err ? cb(err) : self._saveHeads(cb)); });
        });
        function run(cb2) {
            var block;
            async.series([getBlock, runFunc], function (err) {
                if (!err) {
                    blockNumber.iaddn(1);
                }
                else {
                    blockNumber = false;
                    // No more blocks, return
                    if (err.type === 'NotFoundError') {
                        return cb2();
                    }
                }
                cb2(err);
            });
            function getBlock(cb3) {
                self.getBlock(blockNumber, function (err, b) {
                    block = b;
                    if (block) {
                        self._heads[name] = block.hash();
                    }
                    cb3(err);
                });
            }
            function runFunc(cb3) {
                var reorg = lastBlock ? lastBlock.hash().equals(block.header.parentHash) : false;
                lastBlock = block;
                func(block, reorg, cb3);
            }
        }
    };
    /**
     * Executes multiple db operations in a single batch call
     */
    Blockchain.prototype._batchDbOps = function (dbOps, cb) {
        util.callbackify(this.dbManager.batch.bind(this.dbManager))(dbOps, cb);
    };
    /**
     * Performs a block hash to block number lookup
     */
    Blockchain.prototype._hashToNumber = function (hash, cb) {
        util.callbackify(this.dbManager.hashToNumber.bind(this.dbManager))(hash, cb);
    };
    /**
     * Performs a block number to block hash lookup
     */
    Blockchain.prototype._numberToHash = function (number, cb) {
        util.callbackify(this.dbManager.numberToHash.bind(this.dbManager))(number, cb);
    };
    /**
     * Helper function to lookup a block by either hash only or a hash and number pair
     */
    Blockchain.prototype._lookupByHashNumber = function (hash, number, cb, next) {
        if (typeof number === 'function') {
            cb = number;
            return this._hashToNumber(hash, function (err, number) {
                if (err) {
                    return next(err, hash, null, cb);
                }
                next(null, hash, number, cb);
            });
        }
        next(null, hash, number, cb);
    };
    /**
     * Gets a header by hash and number. Header can exist outside the canonical chain
     */
    Blockchain.prototype._getHeader = function (hash, number, cb) {
        var _this = this;
        this._lookupByHashNumber(hash, number, cb, function (err, hash, number, cb) {
            if (err) {
                return cb(err);
            }
            util.callbackify(_this.dbManager.getHeader.bind(_this.dbManager))(hash, number, cb);
        });
    };
    /**
     * Gets a header by number. Header must be in the canonical chain
     */
    Blockchain.prototype._getCanonicalHeader = function (number, cb) {
        var _this = this;
        this._numberToHash(number, function (err, hash) {
            if (err) {
                return cb(err);
            }
            _this._getHeader(hash, number, cb);
        });
    };
    /**
     * Gets total difficulty for a block specified by hash and number
     */
    Blockchain.prototype.getTd = function (hash, number, cb) {
        var _this = this;
        this._lookupByHashNumber(hash, number, cb, function (err, hash, number, cb) {
            if (err) {
                return cb(err);
            }
            util.callbackify(_this.dbManager.getTd.bind(_this.dbManager))(hash, number, cb);
        });
    };
    Blockchain.prototype._lockUnlock = function (fn, cb) {
        var self = this;
        this._putSemaphore.take(function () {
            fn(after);
            function after() {
                self._putSemaphore.leave();
                cb.apply(null, arguments);
            }
        });
    };
    return Blockchain;
}());
exports.Blockchain = Blockchain;
//# sourceMappingURL=index.js.map