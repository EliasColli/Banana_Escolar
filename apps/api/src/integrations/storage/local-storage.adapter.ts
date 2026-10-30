import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { mkdir, readFile, rm, stat, writeFile } from 'node:fs/promises';
import { dirname, resolve, sep } from 'node:path';
import { StoragePort, StoredObject } from './storage.port';

/** Almacenamiento local privado para desarrollo. En producción se sustituye por S3. */
@Injectable()
export class LocalStorageAdapter implements StoragePort {
  private readonly basePath: string;

  constructor(configService: ConfigService) {
    const configured = configService.get<string>('storage.localPath') ?? './.storage/uploads';
    this.basePath = resolve(process.cwd(), configured);
  }

  private resolveKey(key: string): string {
    if (key.includes('..')) throw new Error('Clave de storage inválida.');
    const target = resolve(this.basePath, key);
    if (!target.startsWith(`${this.basePath}${sep}`) && target !== this.basePath) {
      throw new Error('Intento de acceso fuera del storage.');
    }
    return target;
  }

  async save(key: string, content: Buffer): Promise<StoredObject> {
    const target = this.resolveKey(key);
    await mkdir(dirname(target), { recursive: true });
    await writeFile(target, content, { flag: 'wx' });
    return { key, size: content.byteLength };
  }

  read(key: string): Promise<Buffer> {
    return readFile(this.resolveKey(key));
  }

  async delete(key: string): Promise<void> {
    await rm(this.resolveKey(key), { force: true });
  }

  async exists(key: string): Promise<boolean> {
    try {
      const info = await stat(this.resolveKey(key));
      return info.isFile();
    } catch {
      return false;
    }
  }
}
