import { Module } from '@nestjs/common';
import { CoreModule } from '../../core.module';
import { AuthModule } from '../../modules/auth/auth.module';
import { HealthModule } from '../../modules/health/health.module';

/** auth-svc — owns /auth/* (login, refresh, logout) and its own /health. */
@Module({
  imports: [CoreModule, AuthModule, HealthModule],
})
export class AuthServiceModule {}
