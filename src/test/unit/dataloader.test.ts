import {
  createDataLoaderFactory,
  deletePattern,
  RedisDataLoader,
} from '../../index'
import { getClient } from '../client'
import { DataLoaderType } from '../../lib/dataloaders'

describe('Dataloader factory', () => {
  const client = getClient()
  let callCounter = 0

  interface TestData {
    id: number
    name: string
  }

  const TTL_TEST = 2
  const CAP_LIMIT = 1

  const database: TestData[] = Array.from(Array(20), (_, index) => ({
    id: index + 1,
    name: `test ${index + 1}`,
  }))

  const loadOne = (id: number) =>
    new Promise<TestData | undefined>(resolve =>
      resolve(database.find(({ id: dbId }) => dbId === id))
    )
  const loadMore = (ids: readonly number[]) => {
    callCounter += 1
    return Promise.all(ids.map(loadOne).filter(a => a) as any as TestData[])
  }

  const createDataLoader = createDataLoaderFactory(client)
  const createCappedDataLoader = createDataLoaderFactory(client, {
    type: DataLoaderType.Capped,
    capLimit: CAP_LIMIT,
  })

  const dataloader = createDataLoader(loadMore, {
    keyPrefix: 'test',
    ttlSeconds: TTL_TEST,
    idAttribute: 'id',
  })

  const cappedDataloader = createCappedDataLoader(loadMore, {
    keyPrefix: 'test',
    ttlSeconds: TTL_TEST,
    idAttribute: 'id',
  })

  afterEach(async () => {
    callCounter = 0
    await deletePattern(client, '*')
  })

  test.each([
    {
      name: 'Base dataloader',
      dataloader: dataloader,
    },
    {
      name: 'Capped dataloader',
      dataloader: cappedDataloader,
    },
  ])('Data are cached: $name', async ({ dataloader }) => {
    expect(await dataloader.load(1)).toEqual(await loadOne(1)) // first call
    await dataloader.load(1) // second call
    expect(callCounter).toEqual(1) // Only first load is loading from DB

    expect(await dataloader.loadMany([10, 18])).toEqual([
      await loadOne(10),
      await loadOne(18),
    ])

    expect(await client.get('test:1')).toBe(JSON.stringify(await loadOne(1)))
    await new Promise(resolve => setTimeout(resolve, TTL_TEST * 1000))
    expect(await client.get('test:1')).toBeNull()
  })

  test('Capped dataloader is checking batch calls', async () => {
    const callLoadXTimes = (loader: RedisDataLoader<any, any>, x: number) =>
      Array.from(Array(x), (_, index) => loader.load(index + 1))

    await Promise.all(callLoadXTimes(dataloader, CAP_LIMIT * 4))
    expect(callCounter).toEqual(1)
    callCounter = 0

    await deletePattern(client, '*')

    await Promise.all(callLoadXTimes(cappedDataloader, CAP_LIMIT * 4))
    expect(callCounter).toBeGreaterThan(1)
    callCounter = 0
  })
})
