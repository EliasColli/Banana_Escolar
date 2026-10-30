export interface AppConfiguration {
  nodeEnv: string;
  port: number;
  databaseUrl: string;
  jwt: {
    accessSecret: string;
    refreshSecret: string;
    accessTtl: string;
    refreshTtl: string;
  };
  storage: {
    driver: 'local' | 's3';
    localPath: string;
    maxUploadBytes: number;
  };
  corsOrigins: string[];
  cookie: {
    secure: boolean;
    sameSite: 'lax' | 'strict' | 'none';
  };
}

const parseBoolean = (value: string | undefined, fallback: boolean): boolean => {
  if (value === undefined) return fallback;
  return ['1', 'true', 'yes', 'on'].includes(value.toLowerCase());
};

export default (): AppConfiguration => {
  const sameSite = (process.env.COOKIE_SAME_SITE ?? 'lax').toLowerCase();
  return {
    nodeEnv: process.env.NODE_ENV ?? 'development',
    port: Number(process.env.PORT ?? 3000),
    databaseUrl: process.env.DATABASE_URL ?? '',
    jwt: {
      accessSecret: process.env.JWT_ACCESS_SECRET ?? '',
      refreshSecret: process.env.JWT_REFRESH_SECRET ?? '',
      accessTtl: process.env.JWT_ACCESS_TTL ?? '15m',
      refreshTtl: process.env.JWT_REFRESH_TTL ?? '7d',
    },
    storage: {
      driver: (process.env.STORAGE_DRIVER as 'local' | 's3') ?? 'local',
      localPath: process.env.STORAGE_LOCAL_PATH ?? './.storage/uploads',
      maxUploadBytes: Number(process.env.MAX_UPLOAD_BYTES ?? 5 * 1024 * 1024),
    },
    corsOrigins: (process.env.PUBLIC_APP_ORIGIN ?? 'http://localhost:5173')
      .split(',')
      .map((origin) => origin.trim())
      .filter(Boolean),
    cookie: {
      secure: parseBoolean(process.env.COOKIE_SECURE, process.env.NODE_ENV === 'production'),
      sameSite: (['lax', 'strict', 'none'].includes(sameSite) ? sameSite : 'lax') as
        | 'lax'
        | 'strict'
        | 'none',
    },
  };
};

/** Falla rápido si la configuración crítica no es segura o está incompleta. */
export function validateEnvironment(config: Record<string, unknown>): Record<string, unknown> {
  const databaseUrl = String(config.DATABASE_URL ?? '');
  if (!databaseUrl.startsWith('mysql://')) {
    throw new Error('DATABASE_URL debe ser una URL MySQL (mysql://usuario:clave@host:3306/bd).');
  }

  const accessSecret = String(config.JWT_ACCESS_SECRET ?? '');
  const refreshSecret = String(config.JWT_REFRESH_SECRET ?? '');
  if (accessSecret.length < 32 || refreshSecret.length < 32) {
    throw new Error('JWT_ACCESS_SECRET y JWT_REFRESH_SECRET deben tener al menos 32 caracteres.');
  }
  if (accessSecret === refreshSecret) {
    throw new Error('JWT_ACCESS_SECRET y JWT_REFRESH_SECRET deben ser distintos.');
  }

  return config;
}
