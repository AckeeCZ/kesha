import { Redis } from 'ioredis'
import * as redisDataLoaderFactory from 'redis-dataloader'
import * as DataLoader from 'dataloader'

export enum DataLoaderType {
  Capped = 'capped',
  Base = 'base',
}

export interface RedisDataLoaderOptions<K extends string = string> {
  idAttribute: K
  /** Final key is `<keyPrefix>:<entityId>` */
  keyPrefix: string
  ttlSeconds: null | number
}

export interface RedisDataLoader<K, V> {
  load: (key: K) => Promise<V | null>
  loadMany: (keys: ArrayLike<K>) => Promise<Array<V | Error | null>>
  prime: (key: K, value: V | Error) => Promise<void>
  clearMany: (keys: K[]) => Promise<void>
}

/**
 * DataLoader class with callback batch size watching. If callback limit is exceeded,
 * values are dispatched before the Node event loop finishes
 */
export class CappedDataLoader<K, V, C = K> extends DataLoader<K, V, C> {
  private readonly limit?: number
  protected batchSize = 0
  protected callbacks: Array<
    Parameters<Required<DataLoader.Options<K, V, C>>['batchScheduleFn']>[0]
  > = []

  constructor(
    batchLoadFn: DataLoader.BatchLoadFn<K, V>,
    options?: DataLoader.Options<K, V, C> & {
      capLimit?: number
      batchScheduleFn?: never
    }
  ) {
    super(batchLoadFn, {
      ...options,
      batchScheduleFn: callback => {
        this.callbacks.push(callback)
        setImmediate(() => this.dispatch())
      },
    })
    this.batchSize = 0
    this.callbacks = []
    this.limit = options?.capLimit
  }

  protected dispatch = () => {
    this.callbacks.forEach(callback => callback())
    this.callbacks = []
    this.batchSize = 0
  }

  loadMany(keys: ArrayLike<K>): Promise<Array<V | Error>> {
    if (this.limit && this.batchSize + keys.length > this.limit) {
      const remaining = this.limit - this.batchSize
      const keysFirst = Array.prototype.slice.call(keys, 0, remaining)
      const keysSecond = Array.prototype.slice.call(
        keys,
        remaining,
        keys.length
      )
      const resFirst = super.loadMany(keysFirst)
      this.dispatch()
      const resSecond = this.loadMany(keysSecond)
      return Promise.all([resFirst, resSecond]).then(([r1, r2]) => {
        return [...r1, ...r2]
      })
    }
    this.batchSize += keys.length
    return super.loadMany(keys)
  }

  load(key: K): Promise<V> {
    if (this.limit && this.batchSize + 1 > this.limit) {
      const resFirst = super.load(key)
      this.dispatch()
      return resFirst
    }
    this.batchSize += 1
    return super.load(key)
  }
}

/**
 * Creates factory for Redis Dataloaders with simplified interface
 * @param redis
 * @param options Defines type of Dataloader class which will be used
 */
export const createDataLoaderFactory = (
  redis: Redis,
  options:
    | { type: DataLoaderType.Base }
    | { type: DataLoaderType.Capped; capLimit: number } = {
    type: DataLoaderType.Base,
  }
) => {
  const { type, ...otherOptions } = options
  const RedisDataLoader = redisDataLoaderFactory({ redis })
  const DataLoaderClass =
    type === DataLoaderType.Base ? DataLoader : CappedDataLoader

  return <T, K extends string & keyof T>(
    fetch: (keys: Readonly<Array<T[K]>>) => Promise<T[]>,
    options: RedisDataLoaderOptions<K>
  ): RedisDataLoader<T[K], T> => {
    const loader = new RedisDataLoader(
      options.keyPrefix,
      new DataLoaderClass(
        async (ids: Readonly<Array<T[K]>>) => {
          const items = await fetch(ids)
          return ids.map(
            (id: T[K]) => items.find(a => a[options.idAttribute] === id) ?? null
          )
        },
        {
          ...otherOptions,
          cache: false,
        }
      ),
      {
        cache: false,
        expire: options.ttlSeconds,
      }
    )
    return Object.assign(loader, {
      clearMany: async (keys: Array<T[K]>) => {
        void Promise.all(keys.map(k => loader.clear(k)))
        await new Promise(setImmediate)
      },
    }) as RedisDataLoader<T[K], T>
  }
}
