export interface DeviceCredential {
  credentialId: Uint8Array<ArrayBuffer>;
  prfOutput: Uint8Array<ArrayBuffer> | null;
}

export interface DeviceAuthenticator {
  isAvailable(): Promise<boolean>;
  create(
    challenge: Uint8Array<ArrayBuffer>,
    userId: Uint8Array<ArrayBuffer>,
    prfInput: Uint8Array<ArrayBuffer>,
  ): Promise<DeviceCredential | null>;
  get(
    challenge: Uint8Array<ArrayBuffer>,
    credentialId: Uint8Array<ArrayBuffer>,
    prfInput: Uint8Array<ArrayBuffer>,
  ): Promise<DeviceCredential | null>;
}

interface PrfExtensionResult {
  enabled?: boolean;
  results?: { first?: ArrayBuffer };
}

function toCredential(credential: Credential | null): DeviceCredential | null {
  if (!(credential instanceof PublicKeyCredential)) return null;
  const extensions = credential.getClientExtensionResults() as {
    prf?: PrfExtensionResult;
  };
  const first = extensions.prf?.results?.first;
  return {
    credentialId: new Uint8Array(credential.rawId),
    prfOutput: first ? new Uint8Array(first) : null,
  };
}

export const browserDeviceAuthenticator: DeviceAuthenticator = {
  async isAvailable() {
    if (
      !globalThis.isSecureContext ||
      !globalThis.PublicKeyCredential ||
      !navigator.credentials
    )
      return false;
    try {
      return await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
    } catch {
      return false;
    }
  },
  async create(challenge, userId, prfInput) {
    const credential = await navigator.credentials.create({
      publicKey: {
        challenge,
        rp: { name: "UrbanFox ILR" },
        user: {
          id: userId,
          name: "local-urbanfox-vault",
          displayName: "UrbanFox local vault",
        },
        pubKeyCredParams: [
          { type: "public-key", alg: -7 },
          { type: "public-key", alg: -257 },
        ],
        authenticatorSelection: {
          authenticatorAttachment: "platform",
          residentKey: "required",
          userVerification: "required",
        },
        attestation: "none",
        timeout: 60_000,
        extensions: { prf: { eval: { first: prfInput } } },
      } as PublicKeyCredentialCreationOptions,
    });
    return toCredential(credential);
  },
  async get(challenge, credentialId, prfInput) {
    const credential = await navigator.credentials.get({
      publicKey: {
        challenge,
        allowCredentials: [
          { type: "public-key", id: credentialId, transports: ["internal"] },
        ],
        userVerification: "required",
        timeout: 60_000,
        extensions: { prf: { eval: { first: prfInput } } },
      } as PublicKeyCredentialRequestOptions,
    });
    return toCredential(credential);
  },
};
