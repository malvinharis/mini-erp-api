import {
  type CallHandler,
  type ExecutionContext,
  Injectable,
  type NestInterceptor,
} from '@nestjs/common';
import type { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import type { ApiResponse, PageMeta } from '../../shared';

interface Paginated<T> {
  data: T;
  meta: PageMeta;
}

function isPaginated<T>(value: unknown): value is Paginated<T> {
  return typeof value === 'object' && value !== null && 'data' in value && 'meta' in value;
}

/** Wraps every response in { data, meta } — services may return a Paginated shape. */
@Injectable()
export class TransformInterceptor<T> implements NestInterceptor<T, ApiResponse<T>> {
  intercept(_ctx: ExecutionContext, next: CallHandler<T>): Observable<ApiResponse<T>> {
    return next.handle().pipe(
      map((payload): ApiResponse<T> => {
        if (isPaginated<T>(payload)) {
          return { data: payload.data, meta: payload.meta };
        }
        return { data: payload, meta: null };
      }),
    );
  }
}
