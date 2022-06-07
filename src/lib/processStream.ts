import {Redis} from 'ioredis'

/**
 * Process readable Redis stream with a promise
 * @param redis
 * @param stream - Readable redis stream to process e.g. created with redis.scanStream
 * @param options - Options object
 *                  pipelineFn - function processing the result keys with Redis pipeline
 *                  options.filterKeys - function for filtering result from stream before using pipeline
 */
export const processStream = async (
  redis: Redis,
  stream: NodeJS.ReadableStream,
  options: {
    pipelineFn: (
      pipeline: ReturnType<Redis['pipeline']>,
      ...keys: string[]
    ) => ReturnType<Redis['pipeline']>
    filterKeys?: (...args: any) => boolean
  }
) => {
  const pipelines: Array<Promise<any>> = []
  let receivedBatches = 0
  let keysCount = 0

  await new Promise((resolve, reject) => {
    stream.on('data', (batchKeys: string[]) => {
      receivedBatches += 1

      const resultKeys = options.filterKeys
        ? batchKeys.filter(options.filterKeys)
        : batchKeys

      if (!resultKeys.length) return
      keysCount += resultKeys.length

      const pipeline = options.pipelineFn(redis.pipeline(), ...resultKeys)
      pipelines.push(pipeline.exec())
    })

    stream.on('end', () => {
      void Promise.all(pipelines).then(resolve)
    })
    stream.on('error', reject)
  })

  return {keysCount, receivedBatches, pipelinesCount: pipelines.length}
}
