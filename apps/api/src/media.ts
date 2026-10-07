import { randomUUID } from 'node:crypto';
import { mkdir, readFile, writeFile, unlink } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
} from '@aws-sdk/client-s3';
import sharp from 'sharp';
import type { Config } from './config.js';
import type { DB } from '@tribe/db';
import { HttpError } from './security.js';
export class MediaStorage {
  private s3: S3Client | undefined;
  private root: string;
  constructor(private c: Config) {
    this.root = resolve(c.MEDIA_DIR);
    if (c.S3_BUCKET)
      this.s3 = new S3Client({
        forcePathStyle: true,
        endpoint: c.S3_ENDPOINT,
        region: c.S3_REGION,
        credentials:
          c.S3_ACCESS_KEY_ID && c.S3_SECRET_ACCESS_KEY
            ? { accessKeyId: c.S3_ACCESS_KEY_ID, secretAccessKey: c.S3_SECRET_ACCESS_KEY }
            : undefined,
      });
  }
  async put(key: string, data: Buffer) {
    if (this.s3)
      await this.s3.send(
        new PutObjectCommand({
          Bucket: this.c.S3_BUCKET,
          Key: key,
          Body: data,
          ContentType: 'image/jpeg',
        }),
      );
    else {
      await mkdir(this.root, { recursive: true });
      await writeFile(join(this.root, key), data, { mode: 0o600 });
    }
  }
  async get(key: string) {
    if (this.s3) {
      const r = await this.s3.send(new GetObjectCommand({ Bucket: this.c.S3_BUCKET, Key: key }));
      return Buffer.from(await r.Body!.transformToByteArray());
    }
    return readFile(join(this.root, key));
  }
  async remove(key: string) {
    if (this.s3)
      await this.s3.send(new DeleteObjectCommand({ Bucket: this.c.S3_BUCKET, Key: key }));
    else
      await unlink(join(this.root, key)).catch((e) => {
        if (e.code !== 'ENOENT') throw e;
      });
  }
  async upload(db: DB, owner: string, data: Buffer, alt: string) {
    if (!data.length || data.length > 10 * 1024 * 1024)
      throw new HttpError(400, 'Choose a photo under 10 MB.');
    let result;
    try {
      const photo = sharp(data, { limitInputPixels: 40000000, animated: false });
      const info = await photo.metadata();
      if (!['jpeg', 'png', 'webp', 'heif'].includes(info.format ?? '')) throw new Error('format');
      result = await photo
        .rotate()
        .resize({ width: 1800, height: 1800, fit: 'inside', withoutEnlargement: true })
        .jpeg({ quality: 85 })
        .toBuffer({ resolveWithObject: true });
    } catch {
      throw new HttpError(400, 'This file could not be read as a photo.');
    }
    const id = randomUUID(),
      key = id + '.jpg';
    await this.put(key, result.data);
    try {
      await db.query(
        'INSERT INTO media (id,owner_id,object_key,width,height,alt) VALUES ($1,$2,$3,$4,$5,$6)',
        [id, owner, key, result.info.width, result.info.height, alt],
      );
    } catch (e) {
      await this.remove(key);
      throw e;
    }
    return { id, width: result.info.width, height: result.info.height, alt };
  }
}
