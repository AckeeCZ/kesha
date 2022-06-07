import {createRedisRepository} from '../../index'
import {getClient} from '../client'

describe('Redis repository', () => {
  const client = getClient()
  const TEST_KEY = 'test-key'
  const TEST_OBJECT = {test: 'test'}

  it('Create redis repository', async () => {
    const repository = createRedisRepository(client)
    await repository.setJSON(TEST_KEY, TEST_OBJECT)
    const result = await repository.getJSON(TEST_KEY)
    expect(result).toEqual(TEST_OBJECT)
  })
})
