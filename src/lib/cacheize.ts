import { Redis } from 'ioredis'
import { createKeyGen, getJSON, setJSON, SetMethodOptions } from './utils'
import { ClearMethods, KeyGenerator } from './types'

/**
 * Create function with automatic caching of its result
 * @param redis
 * @param fn
 * @param key Where to store final result
 * @param options - Options for set and clear method
 */
export const cacheize = <T extends Record<string, any>, A extends any[]>(
  redis: Redis,
  fn: (...args: A) => Promise<T>,
  key: string | KeyGenerator<A>,
  options?: SetMethodOptions & { clearMethod: ClearMethods }
) => {
  const getKey = createKeyGen(key)

  const forceWrite = (...args: A) =>
    fn(...args).then(async result => {
      await setJSON(redis, getKey(...args), result, options)
      return result
    })

  const clear = (...args: A) =>
    options?.clearMethod === ClearMethods.Delete
      ? redis.del(getKey(...args))
      : redis.unlink(getKey(...args))

  return Object.assign(
    async (...args: A) => {
      const cached = await getJSON(redis, getKey(...args))
      if (cached) return cached as T
      return forceWrite(...args)
    },
    { clear, prime: forceWrite }
  )
}
