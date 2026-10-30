import { SetMetadata } from '@nestjs/common';
import { Role } from '@prisma/client';

export const ROLES_KEY = 'roles';

/** Restringe la ruta a los roles indicados. La autorización real vive en el servidor. */
export const Roles = (...roles: Role[]) => SetMetadata(ROLES_KEY, roles);
