import "server-only";
import { randomUUID } from "crypto";
import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

// Bucket S3-compatible de Railway. Las variables (BUCKET_ENDPOINT,
// BUCKET_ACCESS_KEY_ID, BUCKET_SECRET_ACCESS_KEY, BUCKET_REGION,
// BUCKET_NAME) se cablean como "reference variables" apuntando al recurso
// bucket de Railway -- nunca se escribieron a mano ni se vieron en texto
// plano en ningun momento de la configuracion.
function getClient(): S3Client {
  const endpoint = process.env.BUCKET_ENDPOINT;
  const accessKeyId = process.env.BUCKET_ACCESS_KEY_ID;
  const secretAccessKey = process.env.BUCKET_SECRET_ACCESS_KEY;
  if (!endpoint || !accessKeyId || !secretAccessKey) {
    throw new Error(
      "Falta configurar el bucket de archivos (BUCKET_ENDPOINT/BUCKET_ACCESS_KEY_ID/BUCKET_SECRET_ACCESS_KEY)."
    );
  }
  return new S3Client({
    endpoint,
    region: process.env.BUCKET_REGION || "auto",
    credentials: { accessKeyId, secretAccessKey },
    forcePathStyle: true,
  });
}

function getBucketName(): string {
  const name = process.env.BUCKET_NAME;
  if (!name) throw new Error("Falta la variable de entorno BUCKET_NAME.");
  return name;
}

export function buildStorageKey(scope: string, filename: string): string {
  const safeName = filename.replace(/[^a-zA-Z0-9._-]/g, "_").slice(-100);
  return `${scope}/${randomUUID()}-${safeName}`;
}

export async function uploadObject(
  key: string,
  body: Buffer,
  contentType: string
): Promise<void> {
  const client = getClient();
  await client.send(
    new PutObjectCommand({
      Bucket: getBucketName(),
      Key: key,
      Body: body,
      ContentType: contentType,
    })
  );
}

export async function getSignedDownloadUrl(key: string, filename: string): Promise<string> {
  const client = getClient();
  const command = new GetObjectCommand({
    Bucket: getBucketName(),
    Key: key,
    ResponseContentDisposition: `attachment; filename="${filename.replace(/"/g, "")}"`,
  });
  return getSignedUrl(client, command, { expiresIn: 300 });
}

export async function deleteObject(key: string): Promise<void> {
  const client = getClient();
  await client.send(new DeleteObjectCommand({ Bucket: getBucketName(), Key: key }));
}
