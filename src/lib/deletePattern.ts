import { Redis } from 'ioredis'
import { processStream } from './processStream'

const DEFAULT_SCAN_CHUNK_SIZE = 1000

export const unlinkPattern = (
  redis: Redis,
  pattern: string,
  filterKeys?: (key: string) => boolean,
  scanBatchSize = DEFAULT_SCAN_CHUNK_SIZE
) =>
  processStream(
    redis,
    redis.scanStream({ count: scanBatchSize, match: pattern }),
    {
      filterKeys,
      pipelineFn: (pipeline, ...keys) => pipeline.unlink(...keys),
    }
  )

export const deletePattern = (
  redis: Redis,
  pattern: string,
  filterKeys?: (key: string) => boolean,
  scanBatchSize = DEFAULT_SCAN_CHUNK_SIZE
) =>
  processStream(
    redis,
    redis.scanStream({ count: scanBatchSize, match: pattern }),
    {
      filterKeys,
      pipelineFn: (pipeline, ...keys) => pipeline.del(...keys),
    }
  )

export const zSetUnlinkPattern = (
  redis: Redis,
  pattern: string,
  zSetKey: string,
  options?: {
    scanBatchSize?: number
    filterKeys?: (key: string) => boolean
    afterDelFn?: (
      keys: string[],
      pipeline: ReturnType<Redis['pipeline']>
    ) => any
  }
) =>
  processStream(
    redis,
    redis.zscanStream(zSetKey, {
      count: options?.scanBatchSize ?? DEFAULT_SCAN_CHUNK_SIZE,
      match: pattern,
    }),
    {
      filterKeys: options?.filterKeys,
      pipelineFn: (pipeline, ...keys) => {
        const pip = pipeline.unlink(...keys).zrem(zSetKey, ...keys)
        return options?.afterDelFn ? options.afterDelFn(keys, pip) : pip
      },
    }
  )
