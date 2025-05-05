import {
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
  Injectable,
  } from '@nestjs/common';
  import { Reflector } from '@nestjs/core';
  import { RateLimitOptions,RATE_LIMIT_KEY } from './../decorators/rate-limit.decorator';
  // rate-limit.guard.ts
  
  type RateRecord = { count: number; timestamp: number };
  
  @Injectable()
  export class RateLimitGuard implements CanActivate {
  constructor(private reflector: Reflector) {}
  
  private memoryStore = new Map<string, RateRecord>();
  
  canActivate(context: ExecutionContext): boolean {
  const request = context.switchToHttp().getRequest();
  const ip = request.ip;
  
  // Read metadata from @RateLimit decorator
  const rateLimit: RateLimitOptions = this.reflector.get(
  RATE_LIMIT_KEY,
  context.getHandler(),
  );
  
  if (!rateLimit) return true;
  
  const { limit, windowMs } = rateLimit;
  const now = Date.now();
  const record = this.memoryStore.get(ip);
  
  if (record) {
  if (now - record.timestamp < windowMs) {
  if (record.count >= limit) {
  throw new HttpException('Too many requests', HttpStatus.TOO_MANY_REQUESTS);
  }
  
  record.count += 1;
  this.memoryStore.set(ip, record);
  } else {
  // Reset the window
  this.memoryStore.set(ip, { count: 1, timestamp: now });
  }
  } else {
  this.memoryStore.set(ip, { count: 1, timestamp: now });
  }
  
  return true;
  }
  }
  