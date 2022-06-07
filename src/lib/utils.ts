import { Redis } from 'ioredis'
import { ExpiryMode, KeyGenerator, SetOption } from './types'

export interface SetMethodOptions {
  ttl?: number
  expiryMode?: ExpiryMode
  set?: SetOption
  custom?: string[]
  get?: boolean
}

export const set = (
  redis: Redis,
  key: string,
  data: string | Buffer,
  options: SetMethodOptions = {}
) => {
  const { ttl, expiryMode, set, custom, get } = options

  let args: any = options.custom ?? []
  if (!custom && ttl) args = [expiryMode ?? 'EX', ttl]
  if (!custom && set) args = [...args, set]
  if (get) args = [...args, 'GET']

  return redis.set(key, data, ...args)
}

export const setJSON = <M, K extends string = string>(
  redis: Redis,
  key: K,
  data: K extends keyof M ? M[K] : any,
  options?: SetMethodOptions
) => set(redis, key, JSON.stringify(data), options)

export const getJSON = async <
  M extends Record<string, any> = any,
  K extends string = string
>(
  redis: Redis,
  key: K
): Promise<(K extends keyof M ? M[K] : any) | null> => {
  const data = await redis.get(key)
  return data ? JSON.parse(data) : null
}

export const createKeyGen = <A extends any[], Key extends KeyGenerator<A, any>>(
  key: Key | string
) => (typeof key === 'string' ? (..._: A) => key : key)
