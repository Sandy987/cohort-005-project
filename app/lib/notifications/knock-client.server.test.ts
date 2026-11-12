import { createVerify, generateKeyPairSync } from "node:crypto";
import { describe, expect, it, vi } from "vitest";
import { knockClientConfig } from "~/lib/notifications/knock-client.server";

const { privateKey, publicKey } = generateKeyPairSync("rsa", {
  modulusLength: 2048,
  privateKeyEncoding: { type: "pkcs8", format: "pem" },
  publicKeyEncoding: { type: "spki", format: "pem" },
});

const env = {
  KNOCK_PUBLIC_API_KEY: "pk_test",
  KNOCK_FEED_CHANNEL_ID: "feed-channel",
  KNOCK_SIGNING_KEY: privateKey,
};

function decodeJwt(token: string) {
  const [header, payload, signature] = token.split(".");
  const verifier = createVerify("RSA-SHA256");
  verifier.update(`${header}.${payload}`);
  return {
    header: JSON.parse(Buffer.from(header, "base64url").toString()),
    payload: JSON.parse(Buffer.from(payload, "base64url").toString()),
    validSignature: verifier.verify(publicKey, signature, "base64url"),
  };
}

describe("knockClientConfig", () => {
  it("is null when nobody is signed in", async () => {
    expect(await knockClientConfig(null, env)).toBeNull();
  });

  it("gives a signed-in user the public key, feed channel and a 1h RS256 token", async () => {
    const config = await knockClientConfig(7, env);

    expect(config).toMatchObject({
      publicKey: "pk_test",
      feedChannelId: "feed-channel",
      userId: "7",
    });
    const jwt = decodeJwt(config!.userToken);
    expect(jwt.header.alg).toBe("RS256");
    expect(jwt.validSignature).toBe(true);
    expect(jwt.payload.sub).toBe("7");
    expect(jwt.payload.exp - jwt.payload.iat).toBe(3600);
  });

  it.each([
    "KNOCK_PUBLIC_API_KEY",
    "KNOCK_FEED_CHANNEL_ID",
    "KNOCK_SIGNING_KEY",
  ])("is null without %s, so the app runs without Knock", async (key) => {
    expect(await knockClientConfig(7, { ...env, [key]: undefined })).toBeNull();
    expect(await knockClientConfig(7, { ...env, [key]: "" })).toBeNull();
  });

  it("is null, and logs, when the signing key is unusable", async () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => {});

    const config = await knockClientConfig(7, {
      ...env,
      KNOCK_SIGNING_KEY: "not-a-key",
    });

    expect(config).toBeNull();
    expect(error).toHaveBeenCalled();
    error.mockRestore();
  });
});
