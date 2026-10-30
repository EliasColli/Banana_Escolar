import bcrypt from 'bcryptjs';

const BCRYPT_ROUNDS = 12;
// Hash de referencia para igualar el costo cuando el correo no existe (mitiga enumeración por tiempo).
const DUMMY_HASH = '$2b$12$C6UzMDM.H6dfI/f/IKcEe.7v0x0u1T7Ew2i7Q4jY0cJm8bVwq9Y5u';

export const hashPassword = (plain: string): Promise<string> => bcrypt.hash(plain, BCRYPT_ROUNDS);

export const verifyPassword = (plain: string, hash: string): Promise<boolean> =>
  bcrypt.compare(plain, hash);

export const fakeVerifyPassword = (plain: string): Promise<boolean> => bcrypt.compare(plain, DUMMY_HASH);
