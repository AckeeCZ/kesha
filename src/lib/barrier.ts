import { KeyGenerator } from './types'
import { createKeyGen } from './utils'

/**
 * Registers function call under some key. All future function calls with the same key
 * will be resolved with Promise from the first one if it did not finish yet
 * @param fn Function call
 * @param key Unique key for fn or key generator from function argument
 */
export const barrier = <Result, Args extends any[]>(
  fn: (...args: Args) => Promise<Result>,
  key: KeyGenerator<Args, string | undefined> | string
) => {
  const getKey = createKeyGen(key)

  const memory = new Map<string, Promise<Result>>()

  return (...args: Args) => {
    const key = getKey(...args)

    if (key === undefined) {
      return fn(...args)
    }

    if (!memory.has(key)) {
      memory.set(
        key,
        fn(...args).finally(() => {
          memory.delete(key)
        })
      )
    }
    return memory.get(key)
  }
}
