
import { RateLimitGuard } from '@common/guards/rate-limit.guard';
import { CacheService } from '@common/services/cache.service';
import { IpFilterService } from '@common/services/ip-filter.service';
import { RateLimiterService } from '@common/services/rate-limit.service';
import { CacheModule } from '@nestjs/cache-manager';
import { Module } from '@nestjs/common';

@Module({
  imports: [CacheModule.register()],
  providers: [CacheService,RateLimiterService, IpFilterService, RateLimitGuard],
  exports: [CacheService,RateLimiterService, IpFilterService, RateLimitGuard],
})
export class CommonModule {}
