import async from 'async'
import Common from 'ethereumjs-common'
import { rlp, toBuffer } from 'ethereumjs-util'
import test from 'tape'
import BN from 'bn.js'
import { Blockchain, Options } from '../src'
import { isConsecutive, createTestDB } from './utils'

import level from 'level-mem'
import Block from 'ethereumjs-block'

import * as testData from './testdata.json'

const blockchain = new Blockchain()
let genesisBlock: any
const blocks: any[] = []
let forkHeader: any
const common: any = new Common('ropsten')
blockchain.validate = false

test('should not crash on getting head of a blockchain without a genesis', t =>
  blockchain.getHead(t.end))

test('should throw on initialization with chain and common parameter', t => {
  t.throws(() => {
    new Blockchain({ chain: 'ropsten', common: common })
  }, /not allowed!$/)
  t.end()
})

test('genesis should match', (t: test.Test) => {
  const bc0 = new Blockchain({ chain: 'ropsten' })
  const bc1 = new Blockchain({ common: common })
  async.parallel([cb => bc0.getHead(cb), cb => bc1.getHead(cb)], (err?: any, heads?: any) => {
    if (err) return t.end(err)
    t.equals(
      heads[0].hash().toString('hex'),
      common.genesis().hash.slice(2),
      'correct genesis hash',
    )
    t.equals(
      heads[0].hash().toString('hex'),
      heads[1].hash().toString('hex'),
      'genesis blocks match',
    )
    t.end()
  })
})

test('alternate constructors', (t: test.Test) => {
  const db = level()
  t.test('support constructor with db parameter', (tt: test.Test) => {
    const blockchain = new Blockchain(db)
    tt.equals(db, blockchain.db)
    tt.end()
  })

  t.test('support blockDb and detailsDb params', (tt: test.Test) => {
    interface Opts extends Options {
      detailsDb: any
    }

    const opts: Opts = { detailsDb: db, blockDb: db }
    const blockchain = new (class extends Blockchain {
      detailsDb: any
      blockDb: any
      constructor() {
        super(opts)
      }
    })()

    tt.equals(db, blockchain.db)
    tt.notOk(blockchain!.detailsDb)
    tt.end()
  })
})

test('genesis block hash should be correct', (t: test.Test) => {
  genesisBlock = new Block()
  genesisBlock.setGenesisParams()
  blockchain.putGenesis(genesisBlock, (err?: any) => {
    if (err) return t.end(err)
    t.equals(genesisBlock.hash().toString('hex'), blockchain.meta.genesis.toString('hex'))
    blocks.push(genesisBlock)
    t.end()
  })
})

test('should not validate a block incorrectly flagged as genesis', (t: test.Test) => {
  const badBlock = new Block()
  badBlock.header.number = Buffer.from([])
  blockchain.validate = true
  blockchain.putBlock(
    badBlock,
    (err?: any) => {
      t.ok(err)
      blockchain.validate = false
      t.end()
    },
    false,
  )
})

test('should add blocks', (t: test.Test) => {
  const addNextBlock = (blockNumber: number) => {
    const block = new Block()
    block.header.number = toBuffer(blockNumber)
    block.header.difficulty = '0xfffffff'
    block.header.parentHash = blocks[blockNumber - 1].hash()
    blockchain.putBlock(block, (err?: any) => {
      if (err) return t.end(err)
      blocks.push(block)
      if (blocks.length === 10) {
        t.ok(true, 'added 10 blocks')
        t.end()
      } else {
        addNextBlock(blockNumber + 1)
      }
    })
  }
  addNextBlock(1)
})

test('should get block by number', (t: test.Test) => {
  blockchain.getBlock(1, (err?: any, block?: any) => {
    if (err) return t.end(err)
    t.equals(block.hash().toString('hex'), blocks[1].hash().toString('hex'))
    t.end()
  })
})

test('should get block by hash', (t: test.Test) => {
  blockchain.getBlock(genesisBlock.hash(), (err?: any, block?: any) => {
    if (err) return t.end(err)
    t.equals(block.hash().toString('hex'), genesisBlock.hash().toString('hex'))
    t.end()
  })
})

test('start: genesisHash, max: 5, skip: 0, reverse: false', (t: test.Test) => {
  blockchain.getBlocks(genesisBlock.hash(), 5, 0, false, (err?: any, blocks?: any) => {
    if (err) return t.end(err)
    t.equals(blocks.length, 5, 'should get 5 blocks')
    t.ok(isConsecutive(blocks), 'blocks should be consecutive')
    t.end()
  })
})

test('start: genesisHash, max: 5, skip: 1, reverse: false', (t: test.Test) => {
  blockchain.getBlocks(genesisBlock.hash(), 5, 1, false, (err?: any, blocks?: any) => {
    if (err) return t.end(err)
    t.equals(blocks.length, 5, 'should get 5 blocks')
    t.ok(!isConsecutive(blocks), 'blocks should not be consecutive')
    t.end()
  })
})

test('start: genesisHash, max: 5, skip: 2, reverse: false', (t: test.Test) => {
  blockchain.getBlocks(genesisBlock.hash(), 5, 2, false, (err?: any, blocks?: any) => {
    if (err) return t.end(err)
    t.equals(blocks.length, 4, 'should get 4 blocks')
    t.ok(!isConsecutive(blocks), 'blocks should not be consecutive')
    t.end()
  })
})

test('start: genesisHash, max: 12, skip: 0, reverse: false', (t: test.Test) => {
  blockchain.getBlocks(genesisBlock.hash(), 12, 0, false, (err?: any, blocks?: any) => {
    if (err) return t.end(err)
    t.equals(blocks.length, 10, 'should get 10 blocks')
    t.ok(isConsecutive(blocks), 'blocks should be consecutive')
    t.end()
  })
})

test('start: 0, max: 5, skip: 0, reverse: false', (t: test.Test) => {
  blockchain.getBlocks(0, 5, 0, false, (err?: any, blocks?: any) => {
    if (err) return t.end(err)
    t.equals(blocks.length, 5, 'should get 5 blocks')
    t.ok(isConsecutive(blocks), 'blocks should be consecutive')
    t.end()
  })
})

test('start: 1, max: 5, skip: 1, reverse: false', (t: test.Test) => {
  blockchain.getBlocks(1, 5, 1, false, (err?: any, blocks?: any) => {
    if (err) return t.end(err)
    t.equals(blocks.length, 5, 'should get 5 blocks')
    t.ok(!isConsecutive(blocks), 'blocks should not be consecutive')
    t.end()
  })
})

test('start: 0, max: 5, skip: 2, reverse: false', (t: test.Test) => {
  blockchain.getBlocks(0, 5, 2, false, (err?: any, blocks?: any) => {
    if (err) return t.end(err)
    t.equals(blocks.length, 4, 'should get 4 blocks')
    t.ok(!isConsecutive(blocks), 'blocks should not be consecutive')
    t.end()
  })
})

test('start: 0, max: 12, skip: 0, reverse: false', (t: test.Test) => {
  blockchain.getBlocks(0, 12, 0, false, (err?: any, blocks?: any) => {
    if (err) return t.end(err)
    t.equals(blocks.length, 10, 'should get 10 blocks')
    t.ok(isConsecutive(blocks), 'blocks should be consecutive')
    t.end()
  })
})

test('start: 1, max: 5, skip: 0, reverse: false', (t: test.Test) => {
  blockchain.getBlocks(1, 5, 0, false, (err?: any, blocks?: any) => {
    if (err) return t.end(err)
    t.equals(blocks.length, 5, 'should get 5 blocks')
    t.ok(isConsecutive(blocks), 'blocks should be consecutive')
    t.end()
  })
})

test('start: 5, max: 5, skip: 0, reverse: true', (t: test.Test) => {
  blockchain.getBlocks(5, 5, 0, true, (err?: any, blocks?: any) => {
    if (err) return t.end(err)
    t.equals(blocks.length, 5, 'should get 5 blocks')
    t.ok(isConsecutive(blocks.reverse()), 'blocks should be consecutive')
    t.end()
  })
})

test('start: 5, max: 10, skip: 0, reverse: true', (t: test.Test) => {
  blockchain.getBlocks(5, 10, 0, true, (err?: any, blocks?: any) => {
    if (err) return t.end(err)
    t.equals(blocks.length, 6, 'should get 6 blocks')
    t.ok(isConsecutive(blocks.reverse()), 'blocks should be consecutive')
    t.end()
  })
})

test('start: 5, max: 10, skip: 0, reverse: true', (t: test.Test) => {
  blockchain.getBlocks(5, 10, 1, true, (err?: any, blocks?: any) => {
    if (err) return t.end(err)
    t.equals(blocks.length, 3, 'should get 3 blocks')
    t.ok(!isConsecutive(blocks.reverse()), 'blocks should not be consecutive')
    t.end()
  })
})

test('should find needed hash', (t: test.Test) => {
  const neededHash = Buffer.from('abcdef', 'hex')
  blockchain.selectNeededHashes(
    [blocks[0].hash(), blocks[9].hash(), neededHash],
    (err?: any, hashes?: any) => {
      if (err) return t.end(err)
      t.equals(hashes[0].toString('hex'), neededHash.toString('hex'))
      t.end()
    },
  )
})

test('should iterate through 9 blocks', (t: test.Test) => {
  let i = 0
  blockchain.iterator(
    'test',
    (block: any, _: any, cb: any) => {
      if (block.hash().equals(blocks[i + 1].hash())) i++
      cb()
    },
    () => {
      t.equals(i, 9)
      t.end()
    },
  )
})

test('should iterate through 9 blocks', (t: test.Test) => {
  blockchain.iterator(
    'error',
    (_: any, __: any, cb: any) => {
      cb(new Error('iterator func error'))
    },
    (err: Error) => {
      t.ok(err, 'should catch iterator func error')
      t.equal(err.message, 'iterator func error', 'should return correct error')
      t.end()
    },
  )
})

test(`iterator shouldn't error on empty`, (t: test.Test) => {
  const blockchain = new Blockchain()
  blockchain.validate = false
  blockchain.iterator(
    'test',
    () => {
      t.fail('should not call iterator function')
    },
    (err?: Error) => {
      t.error(err, 'should not return error')
      t.ok(true, 'should finish iterating')
      t.end()
    },
  )
})

test('should get meta', (t: test.Test) => {
  t.test('should get meta.rawHead', (tt: test.Test) => {
    tt.equals(blockchain.meta.rawHead.toString('hex'), blocks[9].hash().toString('hex'))
    tt.end()
  })

  t.test('should get meta.genesis', (tt: test.Test) => {
    tt.equals(blockchain.meta.genesis.toString('hex'), genesisBlock.hash().toString('hex'))
    tt.end()
  })

  t.test('should get meta.heads', (tt: test.Test) => {
    tt.ok(blockchain.meta.heads['test'])
    tt.end()
  })

  t.end()
})

test(`should add fork header and reset stale heads`, (t: test.Test) => {
  forkHeader = new Block.Header()
  forkHeader.number = toBuffer(9)
  forkHeader.difficulty = '0xffffffff'
  forkHeader.parentHash = blocks[8].hash()
  blockchain._heads['staletest'] = blockchain._headHeader
  blockchain.putHeader(forkHeader, (err?: Error) => {
    if (err) return t.end(err)
    t.test('should update stale head', (tt: test.Test) => {
      tt.equals(blockchain._heads['staletest'].toString('hex'), blocks[8].hash().toString('hex'))
      tt.end()
    })

    t.test('should update stale headBlock', (tt: test.Test) => {
      tt.equals(blockchain._headBlock.toString('hex'), blocks[8].hash().toString('hex'))
      tt.end()
    })
    t.end()
  })
})

test(`delete fork header`, (t: test.Test) => {
  blockchain.delBlock(forkHeader.hash(), (err?: Error) => {
    if (err) return t.end(err)
    t.test('should reset headHeader', (tt: test.Test) => {
      tt.equals(blockchain._headHeader.toString('hex'), blocks[8].hash().toString('hex'))
      tt.end()
    })

    t.test('should not change headBlock', (tt: test.Test) => {
      tt.equals(blockchain._headBlock.toString('hex'), blocks[8].hash().toString('hex'))
      tt.end()
    })
    t.end()
  })
})

test('should delete blocks in canonical chain', (t: test.Test) => {
  const delNextBlock = (number: number, cb: any) => {
    const block = blocks[number]
    blockchain.delBlock(block.hash(), (err?: Error) => {
      if (err) return cb(err)
      if (number > 6) {
        return delNextBlock(--number, cb)
      }
      cb()
    })
  }

  delNextBlock(9, (err?: Error) => {
    if (err) return t.end(err)
    t.equals(
      blockchain._headHeader.toString('hex'),
      blocks[5].hash().toString('hex'),
      'should have block 5 as head',
    )
    t.end()
  })
})

test('should delete block and children', (t: test.Test) => {
  blockchain.delBlock(blocks[1].hash(), (err?: Error) => {
    if (err) return t.end(err)
    t.equals(
      blockchain._headHeader.toString('hex'),
      genesisBlock.hash().toString('hex'),
      'should have genesis as head',
    )
    t.end()
  })
})

test('should put multiple blocks at once', (t: test.Test) => {
  blockchain.putBlocks(blocks.slice(1), t.end)
})

test('should get heads', (t: test.Test) => {
  createTestDB((err?: Error, db?: any, genesis?: any) => {
    if (err) return t.end(err)
    const blockchain = new Blockchain({ db: db })
    blockchain.getHead((err?: Error, head?: any) => {
      if (err) return t.end(err)
      t.equals(head.hash().toString('hex'), genesis.hash().toString('hex'), 'should get head')
      t.equals(blockchain._heads['head0'].toString('hex'), 'abcd', 'should get state root heads')
      t.end()
    })
  })
})

test('should validate', (t: test.Test) => {
  const blockchain = new Blockchain({ validate: true })
  const genesisBlock = new Block()
  genesisBlock.setGenesisParams()
  blockchain.putGenesis(genesisBlock, (err?: Error) => {
    t.error(err, 'should validate genesisBlock')
    const invalidBlock = new Block()
    blockchain.putBlock(invalidBlock, (err?: Error) => {
      t.ok(err, 'should not validate an invalid block')
      t.end()
    })
  })
})

test('add block with body', (t: test.Test) => {
  const blockchain = new Blockchain({ validate: false })
  const genesisBlock = new Block(Buffer.from(testData.genesisRLP.slice(2), 'hex'))
  blockchain.putGenesis(genesisBlock, (err?: Error) => {
    if (err) return t.end(err)
    const block = new Block(Buffer.from(testData.blocks[0].rlp.slice(2), 'hex'))
    blockchain.putBlock(block, (err?: Error) => {
      t.error(err, 'should add block with a body')
      t.end()
    })
  })
})

test('uncache db ops', (t: test.Test) => {
  createTestDB((err?: Error, db?: any, genesis?: any) => {
    if (err) return t.end(err)
    const blockchain = new Blockchain({ db: db })
    t.test('should perform _hashToNumber correctly', (tt: test.Test) => {
      blockchain._hashToNumber(genesisBlock.hash(), (err: Error | undefined, number: BN) => {
        if (err) tt.end(err)
        tt.equals(number.toString(10), '0')
        tt.end()
      })
    })

    t.test('should perform _numberToHash correctly', (tt: test.Test) => {
      blockchain._numberToHash(new BN(0), (err: Error | undefined, hash: Buffer) => {
        if (err) return t.end(err)
        t.equals(genesisBlock.hash().toString('hex'), hash.toString('hex'))
        tt.end()
      })
    })

    t.test('should perform _getTd correctly', (tt: test.Test) => {
      blockchain.getTd(genesisBlock.hash(), new BN(0), (err: Error | undefined, td: BN) => {
        if (err) return t.end(err)
        t.equals(td.toBuffer().toString('hex'), genesis.header.difficulty.toString('hex'))
      })
      t.end()
    })
  })
})

test('save heads', (t: test.Test) => {
  const db = level()
  let blockchain = new Blockchain({ db: db, validate: false })
  const header = new Block.Header()
  header.number = toBuffer(1)
  header.difficulty = '0xfffffff'
  header.parentHash = blocks[0].hash()
  blockchain.putHeader(header, (err?: any) => {
    if (err) return t.end(err)
    blockchain = new Blockchain({ db: db, validate: false })

    t.test('should save headHeader', (tt: test.Test) => {
      blockchain.getLatestHeader((err?: any, latest?: any) => {
        if (err) tt.end(err)
        tt.equals(latest.hash().toString('hex'), header.hash().toString('hex'))
        tt.end()
      })
    })

    t.test('should save headBlock', (tt: test.Test) => {
      blockchain.getLatestBlock((err?: any, latest?: any) => {
        if (err) tt.end(err)
        tt.equals(latest.hash().toString('hex'), blocks[0].hash().toString('hex'))
        tt.end()
      })
    })
  })
})

test('should not modify cached objects', (t: test.Test) => {
  const blockchain = new Blockchain({ validate: false })
  // clone blocks[1]
  const testBlock = new Block(rlp.decode(rlp.encode(blocks[1].raw)))
  let cachedHash: Buffer

  blockchain.putBlock(testBlock, (err?: any) => {
    if (err) return t.end(err)
    cachedHash = testBlock.hash()
    // change testBlock's extraData in order to modify its hash
    testBlock.header.extraData = Buffer.from([1])
    blockchain.getBlock(1, (err?: Error, block?: any) => {
      if (err) return t.end(err)
      t.equals(cachedHash.toString('hex'), block.hash().toString('hex'))
      t.end()
    })
  })
})

test('get latest', (t: test.Test) => {
  const blockchain = new Blockchain({
    validate: false,
  })
  const headers = [new Block.Header(), new Block.Header()]
  headers[0].number = toBuffer(1)
  headers[0].difficulty = '0xfffffff'
  headers[0].parentHash = blocks[0].hash()
  headers[1].number = toBuffer(2)
  headers[1].difficulty = '0xfffffff'
  headers[1].parentHash = headers[0].hash()

  t.test('add some headers and make sure the latest block remains the same', (tt: test.Test) => {
    blockchain.putHeaders(headers, (err?: any) => {
      if (err) tt.end(err)
      // first, add some headers and make sure the latest block remains the same
      tt.test('should update latest header', (ttt: test.Test) => {
        blockchain.getLatestHeader((err?: any, header?: any) => {
          if (err) ttt.end(err)
          ttt.equals(header.hash().toString('hex'), headers[1].hash().toString('hex'))
          ttt.end()
        })
      })

      tt.test('should not change latest block', (ttt: test.Test) => {
        blockchain.getLatestBlock((err?: any, block?: any) => {
          if (err) ttt.end(err)
          ttt.equals(block.hash().toString('hex'), blocks[0].hash().toString('hex'))
          ttt.end()
        })
      })
    })
  })

  t.test('add a full block and make sure the latest header remains the same', (tt: test.Test) => {
    blockchain.putBlock(blocks[1], (err?: Error) => {
      if (err) tt.end(err)
      tt.test('should not change latest header', (ttt: test.Test) => {
        blockchain.getLatestHeader((err?: Error, header?: any) => {
          if (err) ttt.end(err)
          t.equals(header.hash().toString('hex'), headers[1].hash().toString('hex'))
          ttt.end()
        })
      })

      tt.test('should update latest block', (ttt: test.Test) => {
        blockchain.getLatestBlock((err?: Error, block?: any) => {
          if (err) ttt.end(err)
          ttt.equals(block.hash().toString('hex'), blocks[1].hash().toString('hex'))
          ttt.end()
        })
      })

      t.end()
    })
  })
})

test('mismatched chains', (t: test.Test) => {
  const common = new Common('rinkeby')
  const blockchain = new Blockchain({ common: common, validate: false })
  const blocks = [
    new Block(null, { common: common }),
    new Block(null, { chain: 'rinkeby' }),
    new Block(null, { chain: 'ropsten' }),
  ]

  blocks[0].setGenesisParams()
  blocks[1].header.number = 1
  blocks[1].header.parentHash = blocks[0].hash()
  blocks[2].header.number = 2
  blocks[2].header.parentHash = blocks[1].hash()
  async.eachOfSeries(blocks, (block, i, cb) => {
    if (i === 0) {
      blockchain.putGenesis(block, cb)
    } else {
      blockchain.putBlock(block, (err: Error) => {
        if (i === 2) {
          t.ok(err.message.match('Chain mismatch'), 'should return chain mismatch error')
        } else {
          t.error(err, 'should not return mismatch error')
        }
        t.end()
      })
    }
  })
})
