import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  Logger,
  HttpStatus,
} from '@nestjs/common';
import { Request, Response } from 'express';

@Catch(HttpException)
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: HttpException, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();
    const status = exception.getStatus?.() || HttpStatus.INTERNAL_SERVER_ERROR;
    const timestamp = new Date().toISOString();
    const path = request.url;

    // Extract response message
    let message = 'An unexpected error occurred';
    let errorCode: string | number | undefined;

    const exceptionResponse = exception.getResponse();

    if (typeof exceptionResponse === 'string') {
      message = exceptionResponse;
    } else if (typeof exceptionResponse === 'object' && exceptionResponse !== null) {
      const res = exceptionResponse as Record<string, any>;
      message = res.message || message;
      errorCode = res.error || res.code;
    }

    // Log differently based on status code
    if (status >= 500) {
      this.logger.error(`[${status}] ${request.method} ${path} - ${message}`, exception.stack);
    } else {
      this.logger.warn(`[${status}] ${request.method} ${path} - ${message}`);
    }

    response.status(status).json({
      success: false,
      statusCode: status,
      message,
      ...(errorCode ? { errorCode } : {}),
      path,
      timestamp,
    });
  }
}
