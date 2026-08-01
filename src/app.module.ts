import { Module } from '@nestjs/common';
import { CoreModule } from './core.module';
import { AuthModule } from './modules/auth/auth.module';
import { HealthModule } from './modules/health/health.module';
import { UsersModule } from './modules/users/users.module';

/**
 * Monolith composition — all feature modules on one port. The microservice
 * entrypoints under src/services/* reuse the same CoreModule + feature modules,
 * each mounting a subset on its own port. Run either the monolith or the split
 * services; the modules are unchanged.
 */
@Module({
  imports: [CoreModule, AuthModule, UsersModule, HealthModule],
})
export class AppModule {}
