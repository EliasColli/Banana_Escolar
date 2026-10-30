import { Global, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { LocalStorageAdapter } from './local-storage.adapter';
import { STORAGE_PORT } from './storage.port';

@Global()
@Module({
  providers: [
    LocalStorageAdapter,
    {
      provide: STORAGE_PORT,
      inject: [ConfigService, LocalStorageAdapter],
      useFactory: (config: ConfigService, local: LocalStorageAdapter) => {
        const driver = config.get<string>('storage.driver') ?? 'local';
        if (driver !== 'local') {
          throw new Error(
            `STORAGE_DRIVER=${driver} no está implementado todavía. Usa "local" o añade un adaptador S3.`,
          );
        }
        return local;
      },
    },
  ],
  exports: [STORAGE_PORT],
})
export class StorageModule {}
