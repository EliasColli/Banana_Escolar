export const STORAGE_PORT = Symbol('STORAGE_PORT');

export interface StoredObject {
  key: string;
  size: number;
}

export interface StoragePort {
  save(key: string, content: Buffer): Promise<StoredObject>;
  read(key: string): Promise<Buffer>;
  delete(key: string): Promise<void>;
  exists(key: string): Promise<boolean>;
}
