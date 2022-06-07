export enum ExpiryModes {
  Sec = 'EX',
  Ms = 'PX',
  /** @param Unix timestamp in seconds (Redis >=6.2) */
  UnixTimeInS = 'EXAT',
  /** @param Unix timestamp in milliseconds (Redis >=6.2) */
  UnixTimeInMs = 'PXAT',
}

export enum SetOptions {
  IfExists = 'XX',
  IfNotExists = 'NX',
}

export type ExpiryMode = `${ExpiryModes}`
export type SetOption = `${SetOptions}`

export enum ClearMethods {
  Delete,
  Unlink,
}

export type KeyGenerator<T extends any[], Res = string> = ((...args: T) => Res)
