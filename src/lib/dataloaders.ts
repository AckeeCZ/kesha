import { Redis } from 'ioredis'
import * as redisDataLoaderFactory from 'redis-dataloader'
import * as DataLoader from 'dataloader'

export interface RedisDataLoaderOptions<Key extends string = string> {
  idAttribute: Key
  /** Final key is `<keyPrefix>:<entityId>` */
  keyPrefix: string
  ttlSeconds: null | number
}

export interface RedisDataLoader<Key, Value> {
  load: (key: Key) => Promise<Value | null>
  loadMany: (keys: ArrayLike<Key>) => Promise<Array<Value | Error | null>>
  prime: (key: Key, value: Value | Error) => Promise<void>
  clearMany: (keys: Key[]) => Promise<void>
}

/**
 * Creates factory for Redis Dataloaders with simplified interface
 * @param redis
 */
export const createDataLoaderFactory = (redis: Redis) => {
  const RedisDataLoader = redisDataLoaderFactory({ redis })

  return <T, Key extends string & keyof T>(
    fetch: (keys: Readonly<Array<T[Key]>>) => Promise<T[]>,
    options: RedisDataLoaderOptions<Key>
  ): RedisDataLoader<T[Key], T> => {
    const loader = new RedisDataLoader(
      options.keyPrefix,
      new DataLoader(
        async (ids: Readonly<Array<T[Key]>>) => {
          const items = await fetch(ids)
          return ids.map(
            (id: T[Key]) => items.find(a => a[options.idAttribute] === id) ?? null
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
      clearMany: async (keys: Array<T[Key]>) => {
        void Promise.all(keys.map(k => loader.clear(k)))
        await new Promise(setImmediate)
      },
    }) as RedisDataLoader<T[Key], T>
  }
}
