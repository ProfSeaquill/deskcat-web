import "server-only";

export type BlobCredentials =
  | { token: string }
  | { oidcToken: string; storeId: string };

export function getBlobCredentials(request?: Request): BlobCredentials | null {
  const token = process.env.BLOB_READ_WRITE_TOKEN;
  if (token) return { token };

  const oidcToken =
    request?.headers.get("x-vercel-oidc-token") ??
    process.env.VERCEL_OIDC_TOKEN;
  const storeId = process.env.BLOB_STORE_ID;
  if (oidcToken && storeId) return { oidcToken, storeId };

  return null;
}
