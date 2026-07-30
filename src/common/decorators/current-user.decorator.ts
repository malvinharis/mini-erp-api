import { type ExecutionContext, createParamDecorator } from '@nestjs/common';
import type { AuthUser } from '../../shared';

/** Pulls the authenticated user (set by JwtStrategy.validate) off the request. */
export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): AuthUser => {
    const request = ctx.switchToHttp().getRequest<{ user: AuthUser }>();
    return request.user;
  },
);
