import { Module } from '@nestjs/common';
import { CoreModule } from './core.module';
import { AuthModule } from './modules/auth/auth.module';
import { CustomersModule } from './modules/customers/customers.module';
import { HealthModule } from './modules/health/health.module';
import { InvoicesModule } from './modules/invoices/invoices.module';
import { UsersModule } from './modules/users/users.module';

/**
 * Monolith composition — all feature modules on one port. The microservice
 * entrypoints under src/services/* reuse the same CoreModule + feature modules,
 * each mounting a subset on its own port. Run either the monolith or the split
 * services; the modules are unchanged.
 */
@Module({
  imports: [CoreModule, AuthModule, UsersModule, CustomersModule, InvoicesModule, HealthModule],
})
export class AppModule {}
