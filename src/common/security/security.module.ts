import { Global, Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { JwtStrategy } from '../../modules/auth/strategies/jwt.strategy';

/**
 * Registers the passport JWT strategy so the global JwtAuthGuard resolves in
 * every service — the gateway, auth-svc, and each feature service. Keeping it
 * here (not in AuthModule) lets a feature service validate tokens without
 * pulling in the auth controller/routes.
 */
@Global()
@Module({
  imports: [PassportModule],
  providers: [JwtStrategy],
  exports: [PassportModule, JwtStrategy],
})
export class SecurityModule {}
