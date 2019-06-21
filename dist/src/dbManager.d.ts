/// <reference types="node" />
import Cache from './cache';
import { LevelUp } from 'levelup';
import Common from 'ethereumjs-common';
import BN = require('bn.js');
declare type encoding = 'binary' | 'json';
export interface DbOpts {
    cache?: string;
    keyEncoding?: encoding;
    valueEncoding?: encoding;
}
/**
 * Abstraction over a DB to facilitate storing/fetching blockchain-related
 * data, such as blocks and headers, indices, and the head block.
 */
export default class DBManager {
    _cache: {
        [k: string]: Cache<Buffer>;
    };
    _common: Common;
    _db: LevelUp;
    constructor(db: LevelUp, common: Common);
    /**
     * Fetches iterator heads from the db.
     */
    getHeads(): Promise<any>;
    /**
     * Fetches header of the head block.
     */
    getHeadHeader(): Promise<any>;
    /**
     * Fetches head block.
     */
    getHeadBlock(): Promise<any>;
    /**
     * Fetches a block (header and body), given a block tag
     * which can be either its hash or its number.
     */
    getBlock(blockTag: Buffer | BN | number): Promise<any>;
    /**
     * Fetches body of a block given its hash and number.
     */
    getBody(hash: Buffer, number: BN): Promise<Buffer>;
    /**
     * Fetches header of a block given its hash and number.
     */
    getHeader(hash: Buffer, number: BN): Promise<any>;
    /**
     * Fetches total difficulty for a block given its hash and number.
     */
    getTd(hash: Buffer, number: BN): Promise<BN>;
    /**
     * Performs a block hash to block number lookup.
     */
    hashToNumber(hash: Buffer): Promise<BN>;
    /**
     * Performs a block number to block hash lookup.
     */
    numberToHash(number: BN): Promise<Buffer>;
    /**
     * Fetches a key from the db. If `opts.cache` is specified
     * it first tries to load from cache, and on cache miss will
     * try to put the fetched item on cache afterwards.
     */
    get(key: string | Buffer, opts?: DbOpts): Promise<any>;
    /**
     * Performs a batch operation on db.
     */
    batch(ops: Array<any>): Promise<any>;
}
export {};
//# sourceMappingURL=dbManager.d.ts.map