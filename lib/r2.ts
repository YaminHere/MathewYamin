import {
  S3Client,
  HeadBucketCommand,
  HeadObjectCommand,
  DeleteObjectCommand,
  ListObjectsV2Command,
  DeleteObjectsCommand,
  PutObjectCommand,
  GetObjectCommand,
} from "@aws-sdk/client-s3";

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

// -----------------------------------------------------------------------------
// Project metadata
// -----------------------------------------------------------------------------

export type R2Project = {
  id: string;
  title: string;
  [key: string]: any;
};

function getProjectMetadataKey(projectId: string) {
  if (!/^[a-zA-Z0-9_-]+$/.test(projectId)) {
    throw new Error("Invalid project ID");
  }

  return `projects/${projectId}.json`;
}

export async function getR2Project(
  projectId: string
): Promise<R2Project | null> {
  const client = getR2Client();
  const key = getProjectMetadataKey(projectId);

  try {
    const result = await client.send(
      new GetObjectCommand({
        Bucket: getR2Bucket(),
        Key: key,
      })
    );

    if (!result.Body) {
      return null;
    }

    const contents = await result.Body.transformToString();
    const project = JSON.parse(contents);

    if (
      !project ||
      typeof project !== "object" ||
      project.id !== projectId
    ) {
      throw new Error("Invalid project metadata");
    }

    return project as R2Project;
  } catch (error: any) {
    if (
      error?.name === "NoSuchKey" ||
      error?.$metadata?.httpStatusCode === 404
    ) {
      return null;
    }

    throw error;
  }
}

export async function createR2Project(
  project: R2Project
) {
  const client = getR2Client();
  const key = getProjectMetadataKey(project.id);

  await client.send(
    new PutObjectCommand({
      Bucket: getR2Bucket(),
      Key: key,
      Body: JSON.stringify(project, null, 2) + "\n",
      ContentType: "application/json",
      IfNoneMatch: "*",
    })
  );

  return project;
}

export async function saveR2Project(
  project: R2Project
) {
  const client = getR2Client();
  const key = getProjectMetadataKey(project.id);

  await client.send(
    new PutObjectCommand({
      Bucket: getR2Bucket(),
      Key: key,
      Body: JSON.stringify(project, null, 2) + "\n",
      ContentType: "application/json",
    })
  );

  return project;
}

export async function deleteR2ProjectMetadata(
  projectId: string
) {
  const client = getR2Client();
  const key = getProjectMetadataKey(projectId);

  await client.send(
    new DeleteObjectCommand({
      Bucket: getR2Bucket(),
      Key: key,
    })
  );
}

export async function listR2Projects(): Promise<R2Project[]> {
  const client = getR2Client();
  const bucket = getR2Bucket();

  const projects: R2Project[] = [];

  let continuationToken: string | undefined;

  do {
    const result = await client.send(
      new ListObjectsV2Command({
        Bucket: bucket,
        Prefix: "projects/",
        ContinuationToken: continuationToken,
        MaxKeys: 1000,
      })
    );

    const keys = (result.Contents ?? [])
      .map((object) => object.Key)
      .filter(
        (key): key is string =>
          typeof key === "string" &&
          /^projects\/[a-zA-Z0-9_-]+\.json$/.test(key)
      );

    const batch = await Promise.all(
      keys.map(async (key) => {
        try {
          const result = await client.send(
            new GetObjectCommand({
              Bucket: bucket,
              Key: key,
            })
          );

          if (!result.Body) return null;

          const contents = await result.Body.transformToString();
          const project = JSON.parse(contents);

          const expectedId = key
            .slice("projects/".length)
            .replace(/\.json$/, "");

          if (
            !project ||
            typeof project !== "object" ||
            project.id !== expectedId
          ) {
            return null;
          }

          return project as R2Project;
        } catch (error) {
          console.error(
            `Failed to read project metadata: ${key}`,
            error
          );

          return null;
        }
      })
    );

    projects.push(
      ...batch.filter(
        (project): project is R2Project => project !== null
      )
    );

    continuationToken = result.NextContinuationToken;
  } while (continuationToken);

  return projects;
}

// -----------------------------------------------------------------------------
// Connection and media operations
// -----------------------------------------------------------------------------

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