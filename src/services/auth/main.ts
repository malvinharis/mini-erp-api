import { bootstrapHttpService } from '../../bootstrap';
import { AuthServiceModule } from './auth-service.module';

void bootstrapHttpService({
  module: AuthServiceModule,
  port: Number(process.env.AUTH_SERVICE_PORT ?? 4001),
  title: 'mini-erp auth-svc',
  description: 'Authentication service — login, refresh rotation, logout.',
});
