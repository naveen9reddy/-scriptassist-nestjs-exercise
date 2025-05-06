import { Injectable, Logger } from "@nestjs/common";
import Redis from "ioredis";

@Injectable()
export class RateLimiterService {
  private readonly logger = new Logger(RateLimiterService.name);
  private redisClient: Redis;
  private readonly namespace: string = 'rate_limit';

  constructor() {
    this.redisClient = new Redis({
      host: 'localhost',
      port: 6379,
    });

    this.redisClient.on('connect', () => this.logger.log('Connected to Redis'));
    this.redisClient.on('error', (err) => this.logger.error(`Redis error: ${err}`));
  }

  async limitRequests(userId: string, endpoint: string, rateLimit: number, windowInSeconds: number): Promise<boolean> {
    const key = `${this.namespace}:${userId}:${endpoint}`;

    const currentRequests = await this.redisClient.incr(key);

    if (currentRequests === 1) {
      await this.redisClient.expire(key, windowInSeconds);
    }

    if (currentRequests > rateLimit) {
      this.logger.warn(`Rate limit exceeded for ${userId} on ${endpoint}`);
      return false;
    }

    return true;
  }
}
