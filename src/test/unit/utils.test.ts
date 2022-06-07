import { getJSON, set, setJSON, SetOptions } from '../../index'
import { getClient } from '../client'

describe('Utils unit tests', () => {
  const client = getClient()
  const TEST_KEY = 'test-key'
  const TEST_VALUE = 'test'
  const TEST_OBJECT = { test: TEST_VALUE, nested: { key: TEST_VALUE } }

  beforeAll(() => client.del(TEST_KEY))

  describe('Set', () => {
    afterEach(() => client.del(TEST_KEY))

    it('Basic usage', async () => {
      await set(client, TEST_KEY, TEST_VALUE)

      const value = await client.get(TEST_KEY)
      expect(value).toEqual(TEST_VALUE)
    })
    it('TTL seconds', async () => {
      await set(client, TEST_KEY, TEST_VALUE, {
        ttl: 1,
        expiryMode: 'EX',
      })
      const value = await client.get(TEST_KEY)
      expect(value).toEqual(TEST_VALUE)

      await new Promise(resolve => setTimeout(resolve, 1000))
      const none = await client.get(TEST_KEY)
      expect(none).toEqual(null)
    })
    it('TTL unix time', async () => {
      const nowMs = Date.now()
      await set(client, TEST_KEY, TEST_VALUE, {
        ttl: nowMs + 1000,
        expiryMode: 'PXAT',
      })
      const value = await client.get(TEST_KEY)
      expect(value).toEqual(TEST_VALUE)

      await new Promise(resolve => setTimeout(resolve, 1000))
      const none = await client.get(TEST_KEY)
      expect(none).toEqual(null)
    })
    it('GET and set options', async () => {
      const ok = await set(client, TEST_KEY, TEST_VALUE, {
        set: 'NX',
        ttl: 10,
      })
      const oldValue = await set(client, TEST_KEY, 'new value', {
        set: SetOptions.IfExists,
        get: true,
      })
      const nothingChanged = await set(client, TEST_KEY, TEST_VALUE, {
        ttl: 10,
        set: 'NX',
      })
      expect(ok).toEqual('OK')
      expect(oldValue).toEqual(TEST_VALUE)
      expect(nothingChanged).toBeNull()
    })
  })

  describe('JSON helpers', () => {
    afterEach(() => client.del(TEST_KEY))

    it('setJSON', async () => {
      await setJSON(client, TEST_KEY, TEST_OBJECT)
      const value = (await client.get(TEST_KEY)) as string
      expect(value).toBeDefined()
      expect(JSON.parse(value)).toEqual(TEST_OBJECT)
    })
    it('getJSON', async () => {
      await client.set(TEST_KEY, JSON.stringify(TEST_OBJECT))
      const value = await getJSON(client, TEST_KEY)
      expect(value).toBeDefined()
      expect(value).toEqual(TEST_OBJECT)
    })
  })
})
