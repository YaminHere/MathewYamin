import {
  S3Client,
  HeadBucketCommand,
  HeadObjectCommand,
  DeleteObjectCommand,
  ListObjectsV2Command,
  DeleteObjectsCommand,
} from "@aws-sdk/client-s3";

import { PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

function getConfig() {
  const accountId = process.env.R2_ACCOUNT_ID;
  const accessKeyId = process.env.R2_ACCESS_KEY_ID;
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
  const bucket = process.env.R2_BUCKET_NAME;
  const publicBaseUrl = process.env.R2_PUBLIC_BASE_URL;

  if (
    !accountId ||
    !accessKeyId ||
    !secretAccessKey ||
    !bucket ||
    !publicBaseUrl
  ) {
    throw new Error("Missing R2 environment variables");
  }

  return {
    accountId,
    accessKeyId,
    secretAccessKey,
    bucket,
    publicBaseUrl: publicBaseUrl.replace(/\/+$/, ""),
  };
}

let client: S3Client | null = null;

export function getR2Client() {
  if (!client) {
    const config = getConfig();

    client = new S3Client({
      region: "auto",
      endpoint: `https://${config.accountId}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId: config.accessKeyId,
        secretAccessKey: config.secretAccessKey,
      },
    });
  }

  return client;
}

export function getR2Bucket() {
  return getConfig().bucket;
}

export function getR2PublicUrl(key: string) {
  const { publicBaseUrl } = getConfig();

  const encodedKey = key
    .split("/")
    .map(encodeURIComponent)
    .join("/");

  return `${publicBaseUrl}/${encodedKey}`;
}

export async function testR2Connection() {
  const client = getR2Client();
  const bucket = getR2Bucket();

  await client.send(
    new HeadBucketCommand({
      Bucket: bucket,
    })
  );

  return {
    connected: true,
    bucket,
  };
}

export async function createR2UploadUrl(
  key: string,
  contentType: string
) {
  const client = getR2Client();
  const bucket = getR2Bucket();

  const command = new PutObjectCommand({
    Bucket: bucket,
    Key: key,
    ContentType: contentType,
  });

  return getSignedUrl(client, command, {
    expiresIn: 300,
  });
}

export async function deleteR2Object(key: string) {
  const client = getR2Client();

  await client.send(
    new DeleteObjectCommand({
      Bucket: getR2Bucket(),
      Key: key,
    })
  );
}

export async function getR2ObjectInfo(key: string) {
  const client = getR2Client();

  const result = await client.send(
    new HeadObjectCommand({
      Bucket: getR2Bucket(),
      Key: key,
    })
  );

  return {
    size: result.ContentLength ?? 0,
    contentType: result.ContentType ?? "",
  };
}

export async function deleteR2ProjectObjects(
  projectId: string
) {
  if (!/^[a-zA-Z0-9_-]+$/.test(projectId)) {
    throw new Error("Invalid project ID");
  }

  const client = getR2Client();
  const bucket = getR2Bucket();

  // Restrict deletion to this project's exact R2 prefix.
  const prefix = `work/${projectId}/`;

  let continuationToken: string | undefined;
  let deletedCount = 0;

  do {
    const listResult = await client.send(
      new ListObjectsV2Command({
        Bucket: bucket,
        Prefix: prefix,
        ContinuationToken: continuationToken,
        MaxKeys: 1000,
      })
    );

    const objects = (listResult.Contents ?? [])
      .filter(
        (object): object is typeof object & { Key: string } =>
          typeof object.Key === "string" &&
          object.Key.startsWith(prefix)
      );

    if (objects.length > 0) {
      const deleteResult = await client.send(
        new DeleteObjectsCommand({
          Bucket: bucket,
          Delete: {
            Objects: objects.map((object) => ({
              Key: object.Key,
            })),
            Quiet: true,
          },
        })
      );

      if (deleteResult.Errors?.length) {
        throw new Error(
          `Failed to delete ${deleteResult.Errors.length} R2 objects`
        );
      }

      deletedCount += objects.length;
    }

    continuationToken = listResult.NextContinuationToken;
  } while (continuationToken);

  return {
    deletedCount,
    prefix,
  };
}