import { AppModule } from './app.module';
import { bootstrapHttpService } from './bootstrap';

// Monolith entrypoint — every module on one port (PORT, default 4000).
void bootstrapHttpService({
  module: AppModule,
  title: 'mini-erp API',
  description:
    'mini-erp backend API. Authenticate via /auth/login, then use the bearer access token.',
});
