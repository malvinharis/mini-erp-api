import { Global, Module } from '@nestjs/common';
import { type ConfigService, ConfigModule as NestConfigModule } from '@nestjs/config';
import { type Env, validateEnv } from './env.schema';

@Global()
@Module({
  imports: [
    NestConfigModule.forRoot({
      isGlobal: true,
      cache: true,
      validate: validateEnv,
    }),
  ],
  providers: [],
  exports: [NestConfigModule],
})
export class ConfigModule {}

/** Typed accessor — ConfigService<Env, true> gives inference on get(). */
export type TypedConfigService = ConfigService<Env, true>;
