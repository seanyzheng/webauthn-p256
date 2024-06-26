import { keccak_256 } from '@noble/hashes/sha3'
import { toBytes } from '@noble/hashes/utils'

import { parseCredentialPublicKey } from './publicKey.js'
import type {
  Credential,
  OneOf,
  P256Credential,
  PublicKeyCredential,
  PublicKeyCredentialCreationOptions,
} from './types.js'
import { base64UrlToBytes } from './utils.js'

// Challenge for credential creation – random 16 bytes.
export const createChallenge = Uint8Array.from([
  105, 171, 180, 181, 160, 222, 75, 198, 42, 42, 32, 31, 141, 37, 186, 233,
])

export type CreateCredentialParameters =
  GetCredentialCreationOptionsParameters & {
    createFn?: (
      options?: CredentialCreationOptions | undefined,
    ) => Promise<Credential | null>
  }

export type CreateCredentialReturnType = P256Credential

/**
 * Creates a new credential, which can be stored and later used for signing.
 *
 * @example
 * ```ts
 * const credential = await createCredential({ name: 'Example' })
 * ```
 */
export async function createCredential(
  parameters: CreateCredentialParameters,
): Promise<CreateCredentialReturnType> {
  const { createFn = window.navigator.credentials.create, ...rest } = parameters
  const options = getCredentialCreationOptions(rest)
  try {
    const credential = (await createFn(options)) as PublicKeyCredential
    if (!credential) throw new Error('credential creation failed.')
    const publicKey = await parseCredentialPublicKey(
      new Uint8Array((credential.response as any).getPublicKey()),
    )
    return {
      id: credential.id,
      publicKey,
    }
  } catch (error) {
    throw new Error('credential creation failed.', { cause: error })
  }
}

export type GetCredentialCreationOptionsParameters = {
  /**
   * An `ArrayBuffer`, `TypedArray`, or `DataView` used as a cryptographic challenge.
   */
  challenge?: PublicKeyCredentialCreationOptions['challenge'] | undefined
  /**
   * List of credential IDs to exclude from the creation. This property can be used
   * to prevent creation of a credential if it already exists.
   */
  excludeCredentialIds?: readonly string[] | undefined
  /**
   * An object describing the relying party that requested the credential creation
   */
  rp?:
    | {
        id: string
        name: string
      }
    | undefined
  /**
   * A numerical hint, in milliseconds, which indicates the time the calling web app is willing to wait for the creation operation to complete.
   */
  timeout?: PublicKeyCredentialCreationOptions['timeout'] | undefined
} & OneOf<
  | {
      /** Name for the credential (user.name). */
      name: string
    }
  | {
      /**
       * An object describing the user account for which the credential is generated.
       */
      user: {
        displayName?: string
        id?: BufferSource
        name: string
      }
    }
>

export type GetCredentialCreationOptionsReturnType = CredentialCreationOptions

export function getCredentialCreationOptions(
  parameters: GetCredentialCreationOptionsParameters,
): GetCredentialCreationOptionsReturnType {
  const {
    challenge = createChallenge,
    excludeCredentialIds,
    name: name_,
    rp = {
      id: window.location.hostname,
      name: window.document.title,
    },
    user,
  } = parameters
  const name = (user?.name ?? name_)!
  return {
    publicKey: {
      attestation: 'none',
      authenticatorSelection: {
        authenticatorAttachment: 'platform',
        residentKey: 'preferred',
        requireResidentKey: false,
        userVerification: 'required',
      },
      challenge,
      ...(excludeCredentialIds
        ? {
            excludeCredentials: excludeCredentialIds?.map((id) => ({
              id: base64UrlToBytes(id),
              type: 'public-key',
            })),
          }
        : {}),
      pubKeyCredParams: [
        {
          type: 'public-key',
          alg: -7, // p256
        },
      ],
      rp,
      user: {
        id: user?.id ?? keccak_256(toBytes(name)),
        name,
        displayName: user?.displayName ?? name,
      },
    },
  } as CredentialCreationOptions
}
