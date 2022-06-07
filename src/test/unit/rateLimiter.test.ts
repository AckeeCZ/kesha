import { rateLimiter } from '../../index'
import { getClient } from '../client'

describe('Rate limiter unit tests', () => {
  const client = getClient()
  let callCounter = 0
  const testFn = () => {
    callCounter += 1
    return true
  }

  afterEach(() => {
    callCounter = 0
  })

  it('Limit immediate call', async () => {
    const rateLimitedFn = rateLimiter(client, testFn, 'test-1', 1000)
    const resA = await rateLimitedFn()
    const resB = await rateLimitedFn()
    expect(callCounter).toEqual(1)
    expect(resA.returnValue).toBeTruthy()
    expect(resB.returnValue).toBeUndefined()
  })

  it('Limit later call', async () => {
    const rateLimitedFn = rateLimiter(client, testFn, 'test-2', 1000)
    const resA = await rateLimitedFn()
    await new Promise(resolve => setTimeout(resolve, 500))
    const resB = await rateLimitedFn()
    expect(callCounter).toEqual(1)
    expect(resA.returnValue).toBeTruthy()
    expect(resB.returnValue).toBeUndefined()
  })

  it('Dont limit calls outside interval', async () => {
    const rateLimitedFn = rateLimiter(client, testFn, 'test-3', 1000)
    const resA = await rateLimitedFn()
    await new Promise(resolve => setTimeout(resolve, 1100))
    const resB = await rateLimitedFn()
    expect(callCounter).toEqual(2)
    expect(resA.returnValue).toBeTruthy()
    expect(resB.returnValue).toBeTruthy()
  })
})
