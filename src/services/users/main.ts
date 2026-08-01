import { bootstrapHttpService } from '../../bootstrap';
import { UsersServiceModule } from './users-service.module';

void bootstrapHttpService({
  module: UsersServiceModule,
  port: Number(process.env.USERS_SERVICE_PORT ?? 4002),
  title: 'mini-erp users-svc',
  description: 'Users service — admin user management (CRUD, role, deactivate).',
});
