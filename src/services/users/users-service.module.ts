import { Module } from '@nestjs/common';
import { CoreModule } from '../../core.module';
import { HealthModule } from '../../modules/health/health.module';
import { UsersModule } from '../../modules/users/users.module';

/**
 * users-svc — owns /users/* (admin CRUD + /me) and its own /health. Token
 * validation comes from CoreModule's SecurityModule, so no auth routes are
 * exposed here; the JwtAuthGuard + RolesGuard still enforce access.
 */
@Module({
  imports: [CoreModule, UsersModule, HealthModule],
})
export class UsersServiceModule {}
