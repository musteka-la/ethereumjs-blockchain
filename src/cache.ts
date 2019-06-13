'use strict'

import LRU from 'lru-cache'

/**
 * Simple LRU Cache that allows for keys of type Buffer
 */
export default class Cache<V> {
  _cache: LRU<string, V>

  constructor(opts: LRU.Options<string, V>) {
    this._cache = new LRU(opts)
  }

  set(key: string | Buffer, value: V): void {
    if (Buffer.isBuffer(key)) {
      key = key.toString('hex')
    }
    this._cache.set(key, value)
  }

  get(key: string | Buffer): V | undefined {
    if (Buffer.isBuffer(key)) {
      key = key.toString('hex')
    }
    return this._cache.get(key)
  }

  del(key: string | Buffer): void {
    if (Buffer.isBuffer(key)) {
      key = key.toString('hex')
    }
    this._cache.del(key)
  }
}
