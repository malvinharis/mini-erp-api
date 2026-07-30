import { SetMetadata } from '@nestjs/common';
import type { UserRole } from '../../shared';

export const ROLES_KEY = 'roles';

/** Restrict a route to the given roles. Enforced by RolesGuard. */
export const Roles = (...roles: UserRole[]) => SetMetadata(ROLES_KEY, roles);
