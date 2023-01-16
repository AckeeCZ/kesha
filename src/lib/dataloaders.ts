import { Redis } from 'ioredis'
import * as redisDataLoaderFactory from 'redis-dataloader'
import * as DataLoader from 'dataloader'

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
 * Creates factory for Redis Dataloaders with simplified interface
 * @param redis
 */
export const createDataLoaderFactory = (redis: Redis) => {
  const RedisDataLoader = redisDataLoaderFactory({ redis })

  return <T, K extends string & keyof T>(
    fetch: (keys: Readonly<Array<T[K]>>) => Promise<T[]>,
    options: RedisDataLoaderOptions<K>
  ): RedisDataLoader<T[K], T> => {
    const loader = new RedisDataLoader(
      options.keyPrefix,
      new DataLoader(
        async (ids: Readonly<Array<T[K]>>) => {
          const items = await fetch(ids)
          return ids.map(
            (id: T[K]) => items.find(a => a[options.idAttribute] === id) ?? null
          )
        },
        {
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
