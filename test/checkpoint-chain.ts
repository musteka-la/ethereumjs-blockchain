import async from 'async'
import { toBuffer } from 'ethereumjs-util'
import test from 'tape'
import { Blockchain } from '../src'
import { isConsecutive } from './utils'

const Block = require('ethereumjs-block')

const blockchain = new Blockchain()
let checkpointBlock: any
let genesisBlock: any
const blocks: any[] = []
let forkHeader: any
blockchain.validate = false

test('genesis block hash should be correct', (t: test.Test) => {
  genesisBlock = new Block()
  genesisBlock.setGenesisParams()
  blockchain.putGenesis(genesisBlock, (err?: any) => {
    if (err) return t.end(err)
    t.equals(genesisBlock.hash().toString('hex'), blockchain.meta.genesis.toString('hex'))
    t.end()
  })
})

test('should add checkpoint block', (t: test.Test) => {
  const block = new Block()
  block.header.number = toBuffer(99)
  block.header.difficulty = '0xfffffff'
  async.series(
    [
      (cb: Function) => blockchain.putCheckpoint(block, cb),
      (cb: Function) => blockchain.getLatestBlock(cb),
    ],
    (err, res: any) => {
      if (err) return t.end(err)
      checkpointBlock = res[1]
      blocks.push(res[1])
      t.end()
    },
  )
})

test('should add blocks', (t: test.Test) => {
  const addNextBlock = (blockNumber: number) => {
    const block = new Block()
    block.header.number = toBuffer(blockNumber)
    block.header.difficulty = '0xfffffff'
    block.header.parentHash = blocks[blockNumber - 100].hash()
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
  addNextBlock(100)
})

test('should get block by number', (t: test.Test) => {
  blockchain.getBlock(100, (err?: any, block?: any) => {
    if (err) return t.end(err)
    t.equals(block.hash().toString('hex'), blocks[1].hash().toString('hex'))
    t.end()
  })
})

test('should get block by hash', (t: test.Test) => {
  blockchain.getBlock(checkpointBlock.hash(), (err?: any, block?: any) => {
    if (err) return t.end(err)
    t.equals(block.hash().toString('hex'), checkpointBlock.hash().toString('hex'))
    t.end()
  })
})

test('start: checkpointBlock, max: 5, skip: 0, reverse: false', (t: test.Test) => {
  blockchain.getBlocks(checkpointBlock.hash(), 5, 0, false, (err?: any, blocks?: any) => {
    if (err) return t.end(err)
    t.equals(blocks.length, 5, 'should get 5 blocks')
    t.ok(isConsecutive(blocks), 'blocks should be consecutive')
    t.end()
  })
})

test('start: genesisHash, max: 5, skip: 1, reverse: false', (t: test.Test) => {
  blockchain.getBlocks(checkpointBlock.hash(), 5, 1, false, (err?: any, blocks?: any) => {
    if (err) return t.end(err)
    t.equals(blocks.length, 5, 'should get 5 blocks')
    t.ok(!isConsecutive(blocks), 'blocks should not be consecutive')
    t.end()
  })
})

test('start: genesisHash, max: 5, skip: 2, reverse: false', (t: test.Test) => {
  blockchain.getBlocks(checkpointBlock.hash(), 5, 2, false, (err?: any, blocks?: any) => {
    if (err) return t.end(err)
    t.equals(blocks.length, 4, 'should get 4 blocks')
    t.ok(!isConsecutive(blocks), 'blocks should not be consecutive')
    t.end()
  })
})

test('start: genesisHash, max: 12, skip: 0, reverse: false', (t: test.Test) => {
  blockchain.getBlocks(checkpointBlock.hash(), 12, 0, false, (err?: any, blocks?: any) => {
    if (err) return t.end(err)
    t.equals(blocks.length, 10, 'should get 10 blocks')
    t.ok(isConsecutive(blocks), 'blocks should be consecutive')
    t.end()
  })
})

test('start: 0, max: 5, skip: 0, reverse: false', (t: test.Test) => {
  blockchain.getBlocks(100, 5, 0, false, (err?: any, blocks?: any) => {
    if (err) return t.end(err)
    t.equals(blocks.length, 5, 'should get 5 blocks')
    t.ok(isConsecutive(blocks), 'blocks should be consecutive')
    t.end()
  })
})

test('start: 1, max: 5, skip: 1, reverse: false', (t: test.Test) => {
  blockchain.getBlocks(100, 5, 1, false, (err?: any, blocks?: any) => {
    if (err) return t.end(err)
    t.equals(blocks.length, 5, 'should get 5 blocks')
    t.ok(!isConsecutive(blocks), 'blocks should not be consecutive')
    t.end()
  })
})

test('start: 0, max: 5, skip: 2, reverse: false', (t: test.Test) => {
  blockchain.getBlocks(99, 5, 2, false, (err?: any, blocks?: any) => {
    if (err) return t.end(err)
    t.equals(blocks.length, 4, 'should get 4 blocks')
    t.ok(!isConsecutive(blocks), 'blocks should not be consecutive')
    t.end()
  })
})

test('start: 0, max: 12, skip: 0, reverse: false', (t: test.Test) => {
  blockchain.getBlocks(99, 12, 0, false, (err?: any, blocks?: any) => {
    if (err) return t.end(err)
    t.equals(blocks.length, 10, 'should get 10 blocks')
    t.ok(isConsecutive(blocks), 'blocks should be consecutive')
    t.end()
  })
})

test('start: 1, max: 5, skip: 0, reverse: false', (t: test.Test) => {
  blockchain.getBlocks(100, 5, 0, false, (err?: any, blocks?: any) => {
    if (err) return t.end(err)
    t.equals(blocks.length, 5, 'should get 5 blocks')
    t.ok(isConsecutive(blocks), 'blocks should be consecutive')
    t.end()
  })
})

test('start: 5, max: 5, skip: 0, reverse: true', (t: test.Test) => {
  blockchain.getBlocks(105, 5, 0, true, (err?: any, blocks?: any) => {
    if (err) return t.end(err)
    t.equals(blocks.length, 5, 'should get 5 blocks')
    t.ok(isConsecutive(blocks.reverse()), 'blocks should be consecutive')
    t.end()
  })
})

test('start: 5, max: 10, skip: 0, reverse: true', (t: test.Test) => {
  blockchain.getBlocks(105, 10, 0, true, (err?: any, blocks?: any) => {
    if (err) return t.end(err)
    blocks.shift() // get rid of checkpoint
    t.equals(blocks.length, 6, 'should get 6 blocks')
    t.ok(isConsecutive(blocks.reverse()), 'blocks should be consecutive')
    t.end()
  })
})

test('start: 5, max: 10, skip: 0, reverse: true', (t: test.Test) => {
  blockchain.getBlocks(105, 10, 1, true, (err?: any, blocks?: any) => {
    if (err) return t.end(err)
    blocks.shift() // get rid of checkpoint
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

test('should handle iterator errors', (t: test.Test) => {
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

  t.test('should get meta.checkpoint', (tt: test.Test) => {
    tt.equals(blockchain.meta.checkpoint.toString('hex'), checkpointBlock.hash().toString('hex'))
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
  forkHeader.number = toBuffer(108)
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
      t.equals(blockchain._headHeader.toString('hex'), blocks[8].hash().toString('hex'))
      tt.end()
    })

    t.test('should not change headBlock', (tt: test.Test) => {
      t.equals(blockchain._headBlock.toString('hex'), blocks[8].hash().toString('hex'))
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
      checkpointBlock.hash().toString('hex'),
      'should have genesis as head',
    )
    t.end()
  })
})

test('should put multiple blocks at once', (t: test.Test) => {
  blockchain.putBlocks(blocks.slice(1), t.end)
})
