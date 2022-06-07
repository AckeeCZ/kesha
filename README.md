<div align="center">

# Kesha

Caching utils based on [ioredis](https://www.npmjs.com/package/ioredis)
and [dataloaders](https://github.com/graphql/dataloader)
</div>

## Quick start 🚀

- Initialize [ioredis](https://www.npmjs.com/package/ioredis) client

```typescript
import Redis from 'ioredis';

const redisClient = new Redis({
  // Host, DB,...
})
```

- Use exported utils directly

```typescript
import {rateLimiter} from 'kesha';

const rateLimitedFn = rateLimiter(redisClient, (number: number) => {
  console.log('Called')
}, '', 1000)
```

- Use one client

```typescript
import {createRedisRepository} from 'kesha';

const repo = createRedisRepository(client)

const rateLimitedFn = rrepo.rateLimiter((number: number) => {
  console.log('Called')
}, '', 1000)
```

- Provide typehints for `setJSON` and `getJSON` methods

```typescript
// Per key
const repoPerKey = createRedisRepository<{ 'test:key': string }>(client)

repoPerKey.setJSON('test:key', {}) // TS Error: {} is not assignable to string

// Using template litarals to define key prefixes (From TS 4.4+)
const repo = createRedisRepository<{ [K: `test:key:${number}`]: string }>(client)

repo.setJSON('test:key:1', {}) // TS Error: {} is not assignable to string
repo.getJSON('test:key:1') // TS: Returns string
repo.getJSON('test:key:a') // TS: Returns any

```

## Tests 🧪

- Prepare docker container with Redis 🐳

```bash
sudo docker-compose -f docker-compose/docker-compose.yml up
```

- Run the tests

```bash
npm run test
```

