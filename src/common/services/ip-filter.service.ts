import { Injectable, Logger } from "@nestjs/common";

@Injectable()
export class IpFilterService {
  private readonly logger = new Logger(IpFilterService.name);

  private readonly whitelist: Set<string> = new Set(['192.168.1.1']);
  private readonly blacklist: Set<string> = new Set(['192.168.1.100']);

  isAllowedIp(ip: string): boolean {
    if (this.blacklist.has(ip)) {
      this.logger.warn(`IP ${ip} is blacklisted`);
      return false;
    }

    if (this.whitelist.has(ip)) {
      this.logger.log(`IP ${ip} is whitelisted`);
      return true;
    }

    return true;
  }
}
