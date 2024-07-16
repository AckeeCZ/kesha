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
export const cacheize = <Result extends Record<string, any>, Args extends any[]>(
  redis: Redis,
  fn: (...args: Args) => Promise<Result>,
  key: string | KeyGenerator<Args>,
  options?: SetMethodOptions & { clearMethod: ClearMethods }
) => {
  const getKey = createKeyGen(key)

  const forceWrite = (...args: Args) =>
    fn(...args).then(async result => {
      await setJSON(redis, getKey(...args), result, options)
      return result
    })

  const clear = (...args: Args) =>
    options?.clearMethod === ClearMethods.Delete
      ? redis.del(getKey(...args))
      : redis.unlink(getKey(...args))

  return Object.assign(
    async (...args: Args) => {
      const cached = await getJSON(redis, getKey(...args))
      if (cached) return cached as Result
      return forceWrite(...args)
    },
    { clear, prime: forceWrite }
  )
}
