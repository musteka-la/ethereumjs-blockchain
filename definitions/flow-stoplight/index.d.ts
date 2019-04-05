/// <reference types="node" />

declare module 'flow-stoplight' {
  import { EventEmitter } from 'events'

  class Stoplight extends EventEmitter {
    go(): void
    stop(): void
    await(fb: Function): void
  }

  export = Stoplight
}
