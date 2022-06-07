import Redis from 'ioredis'

const client = new Redis()

export const getClient = () => client
