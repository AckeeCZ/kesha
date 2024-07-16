import { Redis } from 'ioredis'

/**
 * Limits a rate of calls for given function in the given time interval
 * see https://redis.io/commands/incr#pattern-rate-limiter-2
 * @param redis
 * @param fn - Rate limited function
 * @param key - Redis key for rate limiter
 * @param intervalMs in milliseconds - Interval
 * @param limit - How many calls per interval are allowed
 */
export const rateLimiter = <Fn extends (...args: any[]) => any>(
  redis: Redis,
  fn: Fn,
  key: string,
  intervalMs: number,
  limit = 1
): ((
  ...args: Parameters<Fn>
) => Promise<{ called: boolean; returnValue?: ReturnType<Fn> }>) => {
  return async (...args: Parameters<Fn>) => {
    const calls = (await redis.eval(
      `
        local current
        current = redis.call("incr",KEYS[1])
        if tonumber(current) == 1 then
            redis.call("pexpire",KEYS[1],KEYS[2])
        end
        return current
    `,
      2,
      key,
      intervalMs
    )) as number
    if (calls <= limit) {
      return { called: true, returnValue: await fn(...args) }
    }
    return { called: false }
  }
}
