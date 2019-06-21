/// <reference types="node" />
/// <reference types="bn.js" />
import Common from 'ethereumjs-common';
import DBManager from './dbManager';
import semaphore from 'semaphore';
import { BN } from 'ethereumjs-util';
import { LevelUp } from 'levelup';
import Block from 'ethereumjs-block';
export { Block };
export interface Options {
    db?: LevelUp;
    blockDb?: LevelUp;
    common?: Common;
    chain?: string;
    hardfork?: string;
    validate?: boolean;
    BlockCodeRef?: Block;
}
export declare type Opts = Options | LevelUp;
export declare class Blockchain {
    _common: Common;
    _genesis: any;
    _headBlock: any;
    _headHeader: any;
    _heads: {
        [key: string]: any;
    };
    _initDone: boolean;
    _initLock: any;
    _putSemaphore: semaphore.Semaphore;
    _staleHeadBlock: any;
    _staleHeads: any;
    _checkpoint: any;
    db: LevelUp;
    dbManager: DBManager;
    ethash: any;
    validate: boolean;
    BlockCodeRef?: typeof Block;
    constructor(opts?: Opts);
    /**
     * Define meta getter for backwards compatibility
     */
    readonly meta: {
        rawHead: any;
        heads: {
            [key: string]: any;
        };
        genesis: any;
        checkpoint: any;
    };
    /**
     * Fetches the meta info about the blockchain from the db. Meta info contains
     * hashes of the headerchain head, blockchain head, genesis block and iterator
     * heads.
     */
    _init(cb: any): void;
    /**
     * Sets the default genesis block
     */
    _setCanonicalGenesisBlock(cb: any): void;
    /**
     * Puts the genesis block in the database
     */
    putGenesis(genesis: any, cb: any): void;
    /**
     * Put an arbitrary block to be used as checkpoint
     */
    putCheckpoint(checkpoint: Block, cb: any): void;
    /**
     * Returns the specified iterator head.
     */
    getHead(name: any, cb?: any): void;
    /**
     * Returns the latest header in the canonical chain.
     */
    getLatestHeader(cb: any): void;
    /**
     * Returns the latest full block in the canonical chain.
     */
    getLatestBlock(cb: any): void;
    /**
     * Adds many blocks to the blockchain
     */
    putBlocks(blocks: Array<any>, cb: any): void;
    /**
     * Adds a block to the blockchain
     */
    putBlock(block: Block, cb: any, isGenesis?: boolean): void;
    /**
     * Adds many headers to the blockchain
     */
    putHeaders(headers: Array<any>, cb: any): void;
    /**
     * Adds a header to the blockchain
     */
    putHeader(header: Block.Header, cb: any): void;
    _putBlockOrHeader(item: Block | Block.Header, cb: any, isGenesis?: boolean, isCheckpoint?: boolean): any;
    /**
     *Gets a block by its hash
     */
    getBlock(blockTag: Buffer | number | BN, cb: any): void;
    _getBlock(blockTag: Buffer | number | BN, cb: any): void;
    /**
     * Looks up many blocks relative to blockId
     */
    getBlocks(blockId: Buffer | BN | number, maxBlocks: number, skip: number, reverse: boolean, cb: any): void;
    /**
     * Gets block details by its hash
     * @deprecated
     */
    getDetails(_: string, cb: any): void;
    /**
     * Given an ordered array, returns to the callback an array of hashes that are
     * not in the blockchain yet
     */
    selectNeededHashes(hashes: Array<any>, cb: any): void;
    _saveHeadOps(): {
        type: string;
        key: string;
        keyEncoding: string;
        valueEncoding: string;
        value: any;
    }[];
    _saveHeads(cb: any): void;
    /**
     * Delete canonical number assignments for specified number and above
     */
    _deleteStaleAssignments(number: BN, headHash: Buffer, ops: any, cb: any): void;
    _rebuildCanonical(header: any, ops: any, isCheckpoint: boolean | undefined, cb: any): any;
    /**
     * Deletes a block from the blockchain. All child blocks in the chain are deleted
     * and any encountered heads are set to the parent block
     */
    delBlock(blockHash: Buffer, cb: any): void;
    _delBlock(blockHash: Buffer | Block, cb: any): void;
    _delChild(hash: Buffer, number: BN, headHash: Buffer, ops: any, cb: any): any;
    /**
     * Iterates through blocks starting at the specified iterator head and calls
     * the onBlock function on each block. The current location of an iterator head
     * can be retrieved using the `getHead()`` method
     */
    iterator(name: string, onBlock: any, cb: any): void;
    _iterator(name: string, func: any, cb: any): any;
    /**
     * Executes multiple db operations in a single batch call
     */
    _batchDbOps(dbOps: any, cb: any): void;
    /**
     * Performs a block hash to block number lookup
     */
    _hashToNumber(hash: Buffer, cb: any): void;
    /**
     * Performs a block number to block hash lookup
     */
    _numberToHash(number: BN, cb: any): void;
    /**
     * Helper function to lookup a block by either hash only or a hash and number pair
     */
    _lookupByHashNumber(hash: Buffer, number: BN, cb: any, next: any): void;
    /**
     * Gets a header by hash and number. Header can exist outside the canonical chain
     */
    _getHeader(hash: Buffer, number: any, cb?: any): void;
    /**
     * Gets a header by number. Header must be in the canonical chain
     */
    _getCanonicalHeader(number: BN, cb: any): void;
    /**
     * Gets total difficulty for a block specified by hash and number
     */
    getTd(hash: any, number: any, cb?: any): void;
    _lockUnlock(fn: any, cb: any): void;
}
//# sourceMappingURL=index.d.ts.map