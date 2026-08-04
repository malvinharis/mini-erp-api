import { Module } from '@nestjs/common';
import { CoreModule } from '../../core.module';
import { CustomersModule } from '../../modules/customers/customers.module';
import { DashboardModule } from '../../modules/dashboard/dashboard.module';
import { HealthModule } from '../../modules/health/health.module';
import { InvoicesModule } from '../../modules/invoices/invoices.module';

/**
 * core-svc — owns the business domains: /customers, /invoices, /dashboard
 * (plus its own /health). Token validation comes from CoreModule's
 * SecurityModule, so no auth routes are exposed here; JwtAuthGuard + RolesGuard
 * still enforce access.
 */
@Module({
  imports: [CoreModule, CustomersModule, InvoicesModule, DashboardModule, HealthModule],
})
export class CoreServiceModule {}
