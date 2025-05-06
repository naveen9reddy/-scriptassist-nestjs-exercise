import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap, catchError } from 'rxjs/operators';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger(LoggingInterceptor.name);

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const { method, url, body, query, user, params } = request;
    const start = Date.now();

    const userId = user?.id || 'guest';
    const clientIp = request.ip || request.connection?.remoteAddress;

    // Sanitize body: avoid logging sensitive fields
    const sanitizedBody = { ...body };
    ['password', 'token', 'accessToken', 'refreshToken'].forEach((key) => {
      if (sanitizedBody[key]) sanitizedBody[key] = '[REDACTED]';
    });

    this.logger.log(
      `Incoming Request | ${method} ${url} | User: ${userId} | IP: ${clientIp} | Params: ${JSON.stringify(params)} | Query: ${JSON.stringify(query)} | Body: ${JSON.stringify(sanitizedBody)}`
    );

    return next.handle().pipe(
      tap((responseBody) => {
        const duration = Date.now() - start;
        this.logger.log(
          `Response | ${method} ${url} | Status: 200 | Time: ${duration}ms | User: ${userId}`
        );
      }),
      catchError((err) => {
        const duration = Date.now() - start;
        this.logger.error(
          `Error | ${method} ${url} | Status: ${err.status || 500} | Time: ${duration}ms | Message: ${err.message} | User: ${userId}`
        );
        throw err;
      }),
    );
  }
}
