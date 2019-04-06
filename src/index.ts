import * as async from 'async'
import { BN, rlp } from 'ethereumjs-util'
import Common from 'ethereumjs-common'
import * as util from 'util'
import DBManager from './dbManager'
import { LevelUp } from 'levelup'
import semaphore = require('semaphore')
import Stoplight = require('flow-stoplight')

import {
  bodyKey,
  bufBE8,
  hashToNumberKey,
  headBlockKey,
  headHeaderKey,
  headerKey,
  numberToHashKey,
  tdKey,
} from './util'

const Block = require('ethereumjs-block')
const Ethash = require('ethashjs')
const level = require('level-mem')

export interface Options {
  db?: LevelUp
  blockDb?: LevelUp
  common?: Common
  chain?: string
  hardfork?: string
  validate?: boolean
}

export type Opts = Options | LevelUp
function isDb(opts: Opts): opts is LevelUp {
  return opts.constructor.name === 'LevelUP'
}

export default class Blockchain {
  _common: Common
  _genesis: any
  _headBlock: any
  _headHeader: any
  _heads: { [key: string]: any }
  _initDone: boolean
  _initLock: any
  _putSemaphore: semaphore.Semaphore
  _staleHeadBlock: any
  _staleHeads: any
  _checkpoint: any

  db: LevelUp
  dbManager: DBManager
  ethash: any
  validate: boolean

  constructor(opts: Opts = {}) {
    // backwards compatibility with older constructor interfaces
    if (isDb(opts)) {
      opts = { db: opts }
    }

    if (opts.common) {
      if (opts.chain) {
        throw new Error('Instantiation with both opts.common and opts.chain parameter not allowed!')
      }
      this._common = opts.common
    } else {
      const chain = opts.chain ? opts.chain : 'mainnet'
      const hardfork = opts.hardfork ? opts.hardfork : null
      this._common = new Common(chain, hardfork)
    }

    // defaults
    this.db = opts.db ? opts.db : opts.blockDb || level()
    this.dbManager = new DBManager(this.db, this._common)
    this.validate = opts.validate === undefined ? true : opts.validate
    this.ethash = this.validate ? new Ethash(this.db) : null
    this._heads = {}
    this._genesis = null
    this._headHeader = null
    this._headBlock = null
    this._initDone = false
    this._putSemaphore = semaphore(1)
    this._initLock = new Stoplight()
    this._init((err?: Error) => {
      if (err) {
        throw err
      }
      this._initLock.go()
    })
  }

  /**
   * Define meta getter for backwards compatibility
   */
  get meta() {
    return {
      rawHead: this._headHeader,
      heads: this._heads,
      genesis: this._genesis,
      checkpoint: this._checkpoint,
    }
  }

  /**
   * Fetches the meta info about the blockchain from the db. Meta info contains
   * hashes of the headerchain head, blockchain head, genesis block and iterator
   * heads.
   */
  _init(cb: any): void {
    const self = this

    async.waterfall(
      [(cb: any) => self._numberToHash(new BN(0), cb), util.callbackify(getHeads.bind(this))],
      err => {
        if (err) {
          // if genesis block doesn't exist, create one
          return self._setCanonicalGenesisBlock((err?: any) => {
            if (err) {
              return cb(err)
            }
            self._heads = {}
            self._headHeader = self._genesis
            self._headBlock = self._genesis
            cb()
          })
        }
        cb()
      },
    )

    async function getHeads(genesisHash: any) {
      self._genesis = genesisHash
      // load verified iterator heads
      try {
        const heads = await self.dbManager.getHeads()
        Object.keys(heads).forEach(key => {
          heads[key] = Buffer.from(heads[key])
        })
        self._heads = heads
      } catch (e) {
        self._heads = {}
      }

      // load headerchain head
      let hash
      try {
        hash = await self.dbManager.getHeadHeader()
        self._headHeader = hash
      } catch (e) {
        self._headHeader = genesisHash
      }

      // load blockchain head
      try {
        hash = await self.dbManager.getHeadBlock()
        self._headBlock = hash
      } catch (e) {
        self._headBlock = genesisHash
      }
    }
  }

  /**
   * Sets the default genesis block
   */
  _setCanonicalGenesisBlock(cb: any): void {
    const genesisBlock = new Block(null, { common: this._common })
    genesisBlock.setGenesisParams()
    this._putBlockOrHeader(genesisBlock, cb, true)
  }

  /**
   * Puts the genesis block in the database
   */
  putGenesis(genesis: any, cb: any): void {
    this.putBlock(genesis, cb, true)
  }

  /**
   * Put an arbitrary block to be used as checkpoint
   */
  putCheckpoint(checkpoint: any, cb: Function): void {
    this._putBlockOrHeader(
      checkpoint,
      (err: Function) => {
        if (err) {
          return cb(err)
        }
        this._checkpoint = checkpoint.header.hash()
        cb()
      },
      false,
      true,
    )
  }

  /**
   * Returns the specified iterator head.
   */
  getHead(name: any, cb?: any): void {
    // handle optional args
    if (typeof name === 'function') {
      cb = name
      name = 'vm'
    }

    // ensure init completed
    this._initLock.await(() => {
      // if the head is not found return the headHeader
      const hash = this._heads[name] || this._headBlock
      if (!hash) {
        return cb(new Error('No head found.'))
      }
      this.getBlock(hash, cb)
    })
  }

  /**
   * Returns the latest header in the canonical chain.
   */
  getLatestHeader(cb: any): void {
    // ensure init completed
    this._initLock.await(() => {
      this.getBlock(this._headHeader, (err?: any, block?: any) => {
        if (err) {
          return cb(err)
        }
        cb(null, block.header)
      })
    })
  }

  /**
   * Returns the latest full block in the canonical chain.
   */
  getLatestBlock(cb: any) {
    // ensure init completed
    this._initLock.await(() => {
      this.getBlock(this._headBlock, cb)
    })
  }

  /**
   * Adds many blocks to the blockchain
   */
  putBlocks(blocks: Array<any>, cb: any) {
    async.eachSeries(
      blocks,
      (block, done) => {
        this.putBlock(block, done)
      },
      cb,
    )
  }

  /**
   * Adds a block to the blockchain
   */
  putBlock(block: object, cb: any, isGenesis?: boolean) {
    // make sure init has completed
    this._initLock.await(() => {
      // perform put with mutex dance
      this._lockUnlock((done: any) => {
        this._putBlockOrHeader(block, done, isGenesis)
      }, cb)
    })
  }

  /**
   * Adds many headers to the blockchain
   */
  putHeaders(headers: Array<any>, cb: any) {
    async.eachSeries(
      headers,
      (header, done) => {
        this.putHeader(header, done)
      },
      cb,
    )
  }

  /**
   * Adds a header to the blockchain
   */
  putHeader(header: object, cb: any) {
    // make sure init has completed
    this._initLock.await(() => {
      // perform put with mutex dance
      this._lockUnlock((done: any) => {
        this._putBlockOrHeader(header, done)
      }, cb)
    })
  }

  _putBlockOrHeader(item: any, cb: any, isGenesis: boolean = false, isCheckpoint: boolean = false) {
    const self = this
    const isHeader = item instanceof Block.Header
    let block = isHeader ? new Block([item.raw, [], []], { common: item._common }) : item
    const header = block.header
    const hash = block.hash()
    const number = new BN(header.number)
    const td = new BN(header.difficulty)
    const currentTd: any = { header: null, block: null }
    const dbOps: any[] = []

    if (block.constructor !== Block) {
      block = new Block(block, { common: self._common })
    }

    if (block._common.chainId() !== self._common.chainId()) {
      return cb(new Error('Chain mismatch while trying to put block or header'))
    }

    async.series(
      [
        verify,
        verifyPOW,
        getCurrentTd,
        getBlockTd,
        rebuildInfo,
        cb => self._batchDbOps(dbOps.concat(self._saveHeadOps()), cb),
      ],
      cb,
    )

    function verify(next: any) {
      if (!self.validate) {
        return next()
      }

      if (!isGenesis && block.isGenesis()) {
        return next(new Error('already have genesis set'))
      }

      block.validate(self, next)
    }

    function verifyPOW(next: any) {
      if (!self.validate) {
        return next()
      }

      self.ethash.verifyPOW(block, (valid: boolean) => {
        next(valid ? null : new Error('invalid POW'))
      })
    }

    function getCurrentTd(next: any) {
      if (isGenesis) {
        currentTd.header = new BN(0)
        currentTd.block = new BN(0)
        return next()
      }

      if (isCheckpoint) {
        currentTd.header = new BN(block.header.difficulty)
        currentTd.block = new BN(block.header.difficulty)
        return next()
      }

      async.parallel(
        [
          cb =>
            self._getTd(self._headHeader, (err?: any, td?: any) => {
              currentTd.header = td
              cb(err)
            }),
          cb =>
            self._getTd(self._headBlock, (err?: any, td?: any) => {
              currentTd.block = td
              cb(err)
            }),
        ],
        next,
      )
    }

    function getBlockTd(next: any) {
      // calculate the total difficulty of the new block
      if (isGenesis || isCheckpoint) {
        return next()
      }

      self._getTd(header.parentHash, number.subn(1), (err?: any, parentTd?: any) => {
        if (err) {
          return next(err)
        }
        td.iadd(parentTd)
        next()
      })
    }

    function rebuildInfo(next: any) {
      // save block and total difficulty to the database
      let key = tdKey(number, hash)
      let value = rlp.encode(td)
      dbOps.push({
        type: 'put',
        key: key,
        keyEncoding: 'binary',
        valueEncoding: 'binary',
        value: value,
      })
      self.dbManager._cache.td.set(key, value)

      // save header
      key = headerKey(number, hash)
      value = rlp.encode(header.raw)
      dbOps.push({
        type: 'put',
        key: key,
        keyEncoding: 'binary',
        valueEncoding: 'binary',
        value: value,
      })
      self.dbManager._cache.header.set(key, value)

      // store body if it exists
      if (isGenesis || block.transactions.length || block.uncleHeaders.length) {
        const body = block.serialize(false).slice(1)
        key = bodyKey(number, hash)
        value = rlp.encode(body)
        dbOps.push({
          type: 'put',
          key: key,
          keyEncoding: 'binary',
          valueEncoding: 'binary',
          value: value,
        })
        self.dbManager._cache.body.set(key, value)
      }

      // if total difficulty is higher than current, add it to canonical chain
      if (block.isGenesis() || td.gt(currentTd.header) || isCheckpoint) {
        self._headHeader = hash
        if (!isHeader) {
          self._headBlock = hash
        }
        if (block.isGenesis()) {
          self._genesis = hash
        }

        // delete higher number assignments and overwrite stale canonical chain
        async.parallel(
          [
            cb => self._deleteStaleAssignments(number.addn(1), hash, dbOps, cb),
            cb => self._rebuildCanonical(header, dbOps, isCheckpoint, cb),
          ],
          next,
        )
      } else {
        if (td.gt(currentTd.block) && !isHeader) {
          self._headBlock = hash
        }
        // save hash to number lookup info even if rebuild not needed
        key = hashToNumberKey(hash)
        value = bufBE8(number)
        dbOps.push({
          type: 'put',
          key: key,
          keyEncoding: 'binary',
          valueEncoding: 'binary',
          value: value,
        })
        self.dbManager._cache.hashToNumber.set(key, value)
        next()
      }
    }
  }

  /**
   *Gets a block by its hash
   */
  getBlock(blockTag: Buffer | number | BN, cb: any) {
    // ensure init completed
    this._initLock.await(() => {
      this._getBlock(blockTag, cb)
    })
  }

  _getBlock(blockTag: Buffer | number | BN, cb: any) {
    util.callbackify(this.dbManager.getBlock.bind(this.dbManager))(blockTag, cb)
  }

  /**
   * Looks up many blocks relative to blockId
   */
  getBlocks(blockId: Buffer | number, maxBlocks: number, skip: number, reverse: boolean, cb: any) {
    const self = this
    const blocks: any[] = []
    let i = -1

    function nextBlock(blockId: any) {
      self.getBlock(blockId, function(err?: any, block?: any) {
        i++

        if (err) {
          if (err.notFound) {
            return cb(null, blocks)
          } else {
            return cb(err)
          }
        }

        const nextBlockNumber = new BN(block.header.number).addn(reverse ? -1 : 1)

        if (i !== 0 && skip && i % (skip + 1) !== 0) {
          return nextBlock(nextBlockNumber)
        }

        blocks.push(block)

        if (blocks.length === maxBlocks) {
          return cb(null, blocks)
        }

        nextBlock(nextBlockNumber)
      })
    }

    nextBlock(blockId)
  }

  /**
   * Gets block details by its hash
   * @deprecated
   */
  getDetails(_: string, cb: any) {
    cb(null, {})
  }

  /**
   * Given an ordered array, returns to the callback an array of hashes that are
   * not in the blockchain yet
   */
  selectNeededHashes(hashes: Array<any>, cb: any) {
    const self = this
    let max: number, mid: number, min: number

    max = hashes.length - 1
    mid = min = 0

    async.whilst(
      function test() {
        return max >= min
      },
      function iterate(cb2) {
        self._hashToNumber(hashes[mid], (err?: any, number?: any) => {
          if (!err && number) {
            min = mid + 1
          } else {
            max = mid - 1
          }

          mid = Math.floor((min + max) / 2)
          cb2()
        })
      },
      function onDone(err) {
        if (err) return cb(err)
        cb(null, hashes.slice(min))
      },
    )
  }

  _saveHeadOps() {
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
        key: headHeaderKey,
        keyEncoding: 'binary',
        valueEncoding: 'binary',
        value: this._headHeader,
      },
      {
        type: 'put',
        key: headBlockKey,
        keyEncoding: 'binary',
        valueEncoding: 'binary',
        value: this._headBlock,
      },
    ]
  }

  _saveHeads(cb: any) {
    this._batchDbOps(this._saveHeadOps(), cb)
  }

  /**
   * Delete canonical number assignments for specified number and above
   */
  _deleteStaleAssignments(number: BN, headHash: Buffer, ops: any, cb: any) {
    const key = numberToHashKey(number)

    this._numberToHash(number, (err?: any, hash?: Buffer) => {
      if (err) {
        return cb()
      }
      ops.push({
        type: 'del',
        key: key,
        keyEncoding: 'binary',
      })
      this.dbManager._cache.numberToHash.del(key)

      // reset stale iterator heads to current canonical head
      Object.keys(this._heads).forEach(name => {
        if (this._heads[name].equals(hash)) {
          this._heads[name] = headHash
        }
      })
      // reset stale headBlock to current canonical
      if (this._headBlock.equals(hash)) {
        this._headBlock = headHash
      }

      this._deleteStaleAssignments(number.addn(1), headHash, ops, cb)
    })
  }

  // overwrite stale canonical number assignments
  _rebuildCanonical(header: any, ops: any, isCheckpoint: boolean = false, cb: any) {
    const self = this
    const hash = header.hash()
    const number = new BN(header.number)

    function saveLookups(hash: Buffer, number: BN) {
      let key = numberToHashKey(number)
      let value
      ops.push({
        type: 'put',
        key: key,
        keyEncoding: 'binary',
        valueEncoding: 'binary',
        value: hash,
      })
      self.dbManager._cache.numberToHash.set(key, hash)

      key = hashToNumberKey(hash)
      value = bufBE8(number)
      ops.push({
        type: 'put',
        key: key,
        keyEncoding: 'binary',
        valueEncoding: 'binary',
        value: value,
      })
      self.dbManager._cache.hashToNumber.set(key, value)
    }

    // handle genesis block
    if (number.cmpn(0) === 0) {
      saveLookups(hash, number)
      return cb()
    }

    function resetStaleHeads() {
      // set stale heads to last previously valid canonical block
      ;(self._staleHeads || []).forEach((name: string) => {
        self._heads[name] = hash
      })
      delete self._staleHeads
      // set stale headBlock to last previously valid canonical block
      if (self._staleHeadBlock) {
        self._headBlock = hash
        delete self._staleHeadBlock
      }
    }

    self._numberToHash(number, (err?: any, staleHash?: Buffer | null) => {
      if (err) {
        staleHash = null
      }
      if (!staleHash || !hash.equals(staleHash)) {
        saveLookups(hash, number)

        // flag stale head for reset
        Object.keys(self._heads).forEach(function(name) {
          if (staleHash && self._heads[name].equals(staleHash)) {
            self._staleHeads = self._staleHeads || []
            self._staleHeads.push(name)
          }
        })
        // flag stale headBlock for reset
        if (staleHash && self._headBlock.equals(staleHash)) {
          self._staleHeadBlock = true
        }

        self._getHeader(header.parentHash, number.subn(1), (err?: any, header?: any) => {
          if (err) {
            // if this is a checkpoint, only walk back as far as possible
            if (isCheckpoint) {
              resetStaleHeads()
              return cb()
            }
            delete self._staleHeads
            return cb(err)
          }
          self._rebuildCanonical(header, ops, isCheckpoint, cb)
        })
      } else {
        resetStaleHeads()
        cb()
      }
    })
  }

  /**
   * Deletes a block from the blockchain. All child blocks in the chain are deleted
   * and any encountered heads are set to the parent block
   */
  delBlock(blockHash: Buffer, cb: any) {
    // make sure init has completed
    this._initLock.await(() => {
      // perform put with mutex dance
      this._lockUnlock((done: boolean) => {
        this._delBlock(blockHash, done)
      }, cb)
    })
  }

  _delBlock(blockHash: Buffer | typeof Block, cb: any) {
    const self = this
    const dbOps: any[] = []
    let blockHeader = null
    let blockNumber: any = null
    let parentHash: any = null
    let inCanonical: any = null

    if (!Buffer.isBuffer(blockHash)) {
      blockHash = blockHash.hash()
    }

    async.series(
      [
        getHeader,
        checkCanonical,
        buildDBops,
        deleteStaleAssignments,
        cb => self._batchDbOps(dbOps, cb),
      ],
      cb,
    )

    function getHeader(cb2: any) {
      self._getHeader(blockHash, (err?: any, header?: any) => {
        if (err) return cb2(err)
        blockHeader = header
        blockNumber = new BN(blockHeader.number)
        parentHash = blockHeader.parentHash
        cb2()
      })
    }

    // check if block is in the canonical chain
    function checkCanonical(cb2: any) {
      self._numberToHash(blockNumber, (err?: any, hash?: any) => {
        inCanonical = !err && hash.equals(blockHash)
        cb2()
      })
    }

    // delete the block, and if block is in the canonical chain, delete all
    // children as well
    function buildDBops(cb2: any) {
      self._delChild(blockHash, blockNumber, inCanonical ? parentHash : null, dbOps, cb2)
    }

    // delete all number to hash mappings for deleted block number and above
    function deleteStaleAssignments(cb2: any) {
      if (inCanonical) {
        self._deleteStaleAssignments(blockNumber, parentHash, dbOps, cb2)
      } else {
        cb2()
      }
    }
  }

  _delChild(hash: Buffer, number: BN, headHash: Buffer, ops: any, cb: any) {
    const self = this

    // delete header, body, hash to number mapping and td
    ops.push({
      type: 'del',
      key: headerKey(number, hash),
      keyEncoding: 'binary',
    })
    self.dbManager._cache.header.del(headerKey(number, hash))

    ops.push({
      type: 'del',
      key: bodyKey(number, hash),
      keyEncoding: 'binary',
    })
    self.dbManager._cache.body.del(bodyKey(number, hash))

    ops.push({
      type: 'del',
      key: hashToNumberKey(hash),
      keyEncoding: 'binary',
    })
    self.dbManager._cache.hashToNumber.del(hashToNumberKey(hash))

    ops.push({
      type: 'del',
      key: tdKey(number, hash),
      keyEncoding: 'binary',
    })
    self.dbManager._cache.td.del(tdKey(number, hash))

    if (!headHash) {
      return cb()
    }

    if (hash.equals(self._headHeader)) {
      self._headHeader = headHash
    }

    if (hash.equals(self._headBlock)) {
      self._headBlock = headHash
    }

    self._getCanonicalHeader(number.addn(1), (err?: any, childHeader?: any) => {
      if (err) {
        return cb()
      }
      self._delChild(childHeader.hash(), new BN(childHeader.number), headHash, ops, cb)
    })
  }

  /**
   * Iterates through blocks starting at the specified iterator head and calls
   * the onBlock function on each block. The current location of an iterator head
   * can be retrieved using the `getHead()`` method
   */
  iterator(name: string, onBlock: any, cb: any): void {
    // ensure init completed
    this._initLock.await(() => {
      this._iterator(name, onBlock, cb)
    })
  }

  _iterator(name: string, func: any, cb: any) {
    const self = this
    const blockHash = self._heads[name] || (this._checkpoint ? this._checkpoint : self._genesis)
    let blockNumber: any
    let lastBlock: any

    if (!blockHash) {
      return cb()
    }

    self._hashToNumber(blockHash, (err?: any, number?: any) => {
      if (err) return cb(err)
      blockNumber = number.addn(1)
      async.whilst(() => blockNumber, run, err => (err ? cb(err) : self._saveHeads(cb)))
    })

    function run(cb2: any) {
      let block: any

      async.series([getBlock, runFunc], function(err?: any) {
        if (!err) {
          blockNumber.iaddn(1)
        } else {
          blockNumber = false
          // No more blocks, return
          if (err.type === 'NotFoundError') {
            return cb2()
          }
        }
        cb2(err)
      })

      function getBlock(cb3: any) {
        self.getBlock(blockNumber, function(err?: any, b?: any) {
          block = b
          if (block) {
            self._heads[name] = block.hash()
          }
          cb3(err)
        })
      }

      function runFunc(cb3: any) {
        const reorg = lastBlock ? lastBlock.hash().equals(block.header.parentHash) : false
        lastBlock = block
        func(block, reorg, cb3)
      }
    }
  }

  /**
   * Executes multiple db operations in a single batch call
   */
  _batchDbOps(dbOps: any, cb: any): void {
    util.callbackify(this.dbManager.batch.bind(this.dbManager))(dbOps, cb)
  }

  /**
   * Performs a block hash to block number lookup
   */
  _hashToNumber(hash: Buffer, cb: any): void {
    util.callbackify(this.dbManager.hashToNumber.bind(this.dbManager))(hash, cb)
  }

  /**
   * Performs a block number to block hash lookup
   */
  _numberToHash(number: BN, cb: any): void {
    util.callbackify(this.dbManager.numberToHash.bind(this.dbManager))(number, cb)
  }

  /**
   * Helper function to lookup a block by either hash only or a hash and number pair
   */
  _lookupByHashNumber(hash: Buffer, number: BN, cb: any, next: any): void {
    if (typeof number === 'function') {
      cb = number
      return this._hashToNumber(hash, (err?: any, number?: BN) => {
        if (err) {
          return next(err, hash, null, cb)
        }
        next(null, hash, number, cb)
      })
    }
    next(null, hash, number, cb)
  }

  /**
   * Gets a header by hash and number. Header can exist outside the canonical chain
   */
  _getHeader(hash: Buffer, number: any, cb?: any): void {
    this._lookupByHashNumber(
      hash,
      number,
      cb,
      (err: Error | undefined, hash: Buffer, number: BN, cb: any) => {
        if (err) {
          return cb(err)
        }
        util.callbackify(this.dbManager.getHeader.bind(this.dbManager))(hash, number, cb)
      },
    )
  }

  /**
   * Gets a header by number. Header must be in the canonical chain
   */
  _getCanonicalHeader(number: BN, cb: any): void {
    this._numberToHash(number, (err: Error | undefined, hash: Buffer) => {
      if (err) {
        return cb(err)
      }
      this._getHeader(hash, number, cb)
    })
  }

  /**
   * Gets total difficulty for a block specified by hash and number
   */
  _getTd(hash: any, number: any, cb?: any): void {
    this._lookupByHashNumber(
      hash,
      number,
      cb,
      (err: Error | undefined, hash: Buffer, number: BN, cb: any) => {
        if (err) {
          return cb(err)
        }
        util.callbackify(this.dbManager.getTd.bind(this.dbManager))(hash, number, cb)
      },
    )
  }

  _lockUnlock(fn: any, cb: any): void {
    const self = this
    this._putSemaphore.take(() => {
      fn(after)

      function after() {
        self._putSemaphore.leave()
        cb.apply(null, arguments)
      }
    })
  }
}
