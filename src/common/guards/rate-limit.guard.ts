import {
  CanActivate,
  ExecutionContext,
  Injectable,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RateLimitOptions, RATE_LIMIT_KEY } from '../decorators/rate-limit.decorator';
import Redis from 'ioredis';

@Injectable()
export class RateLimitGuard implements CanActivate {
  private readonly logger = new Logger(RateLimitGuard.name);
  private readonly redisClient: Redis;

  constructor(private reflector: Reflector) {
    this.redisClient = new Redis({
      host: 'localhost',
      port: 6379,
    });
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const ip = request.ip;
    const userId = request.user?.id || 'guest';  // Use user ID if available
    const handler = context.getHandler();
const className = context.getClass().name;
const methodName = handler.name;
const key = `rate-limit:${ip}:${userId}:${className}.${methodName}`;  // Unique key per route/user
    const rateLimit: RateLimitOptions = this.reflector.get(
      RATE_LIMIT_KEY,
      context.getHandler(),
    );

    if (!rateLimit) {
      return true; // If no rate limit is defined, allow the request
    }

    const { limit, windowMs } = rateLimit;

    try {
      const current = await this.redisClient.get(key);
      const currentCount = current ? parseInt(current, 10) : 0;

      if (currentCount >= limit) {
        this.logger.warn(`[RateLimitGuard] Rate limit exceeded for ${key}. Current count: ${currentCount}`);
        throw new HttpException('Too many requests', HttpStatus.TOO_MANY_REQUESTS);
      }

      const result = await this.redisClient.multi()
        .incr(key)
        .expire(key, Math.ceil(windowMs / 1000))
        .exec();

      this.logger.log(`[RateLimitGuard] Request allowed for ${key}. New count: ${currentCount + 1}`);

      return true;
    } catch (error) {
      if (error instanceof HttpException) {
        throw error; // Re-throw known exceptions like 429
      }
    
      this.logger.error('Unexpected error in rate limiter', error);
      throw new HttpException('Rate limiting error', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }
}
