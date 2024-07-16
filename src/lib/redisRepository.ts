import { Redis } from 'ioredis'
import { setJSON, getJSON, set, SetMethodOptions } from './utils'
import { processStream } from './processStream'
import {
  unlinkPattern,
  deletePattern,
  zSetUnlinkPattern,
} from './deletePattern'
import { cacheize } from './cacheize'
import { createDataLoaderFactory } from './dataloaders'
import { rateLimiter } from './rateLimiter'

const curryFirst =
  <Args extends any[], Result>(fn: (client: Redis, ...args: Args) => Result) =>
  (client: Redis) =>
  (...args: Args) =>
    fn(client, ...args)

export const createRedisRepository = <M extends Record<string, any>>(
  redis: Redis
) => ({
  client: redis,
  cacheize: curryFirst(cacheize)(redis),
  set: curryFirst(set)(redis),
  setJSON: <K extends string>(
    key: K,
    data: K extends keyof M ? M[K] : any,
    options?: SetMethodOptions
  ) => setJSON<M, K>(redis, key, data, options),
  getJSON: <K extends string>(key: K) => getJSON<M, K>(redis, key),
  processStream: curryFirst(processStream)(redis),
  unlinkPattern: curryFirst(unlinkPattern)(redis),
  deletePattern: curryFirst(deletePattern)(redis),
  zSetUnlinkPattern: curryFirst(zSetUnlinkPattern)(redis),
  rateLimiter: curryFirst(rateLimiter)(redis),
  createDataloader: curryFirst(createDataLoaderFactory)(redis),
})
