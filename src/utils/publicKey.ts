import type { Hex } from '../types.js'
import {
  base64UrlToBytes,
  bytesToBase64Url,
  bytesToCryptoKey,
  bytesToHex,
  cryptoKeyToBytes,
} from './conversion.js'

export type ParseCredentialPublicKeyOptions = {
  compressed?: boolean | undefined
}

export async function parseCredentialPublicKey(
  cPublicKey: ArrayBuffer,
  options: ParseCredentialPublicKeyOptions = {},
): Promise<Hex> {
  const { compressed } = options
  const base64Url = bytesToBase64Url(new Uint8Array(cPublicKey))
  const bytes = base64UrlToBytes(base64Url)
  const cryptoKey = await bytesToCryptoKey(bytes)
  const publicKey = await cryptoKeyToBytes(cryptoKey)
  const result = (() => {
    if (compressed) return publicKey.slice(1)
    return publicKey
  })()
  return bytesToHex(result)
}

type PublicKey = {
  x: bigint
  y: bigint
}

export function parsePublicKey(publicKey: Uint8Array): PublicKey {
  const offset = publicKey[0] === 4 ? 1 : 0
  const x = publicKey.slice(offset, 32 + offset)
  const y = publicKey.slice(32 + offset, 64 + offset)
  return { x: BigInt(bytesToHex(x)), y: BigInt(bytesToHex(y)) }
}
