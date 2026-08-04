import { bootstrapHttpService } from '../../bootstrap';
import { CoreServiceModule } from './core-service.module';

void bootstrapHttpService({
  module: CoreServiceModule,
  port: Number(process.env.CORE_SERVICE_PORT ?? 4003),
  title: 'mini-erp core-svc',
  description: 'Business domains — customers, invoices, dashboard.',
});
