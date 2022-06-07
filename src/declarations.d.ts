declare module 'redis-dataloader' {
  import * as DataLoader from 'dataloader'

  class RedisDataLoader<K, V> {
    constructor(keySpace: string, fbDataLoader: DataLoader<K, V>, opt: any)

    load(key: K): Promise<V | null>

    loadMany(keys: ArrayLike<K>): Promise<Array<V | null | Error>>

    prime(key: K, value: V | Error): Promise<void>

    /** @deprecated use custom clearMany */
    clear(key: K): this

    /** @deprecated use custom clearMany */
    clearAllLocal(): this

    /** @deprecated use custom clearMany */
    clearLocal(key: K): this
  }

  function factory(opt: { redis: any }): typeof RedisDataLoader

  namespace factory {
  } // callable export workaround https://stackoverflow.com/a/34733202/4425335
  export = factory
}
