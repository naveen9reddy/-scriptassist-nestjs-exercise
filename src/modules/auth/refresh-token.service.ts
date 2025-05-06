import { Injectable } from '@nestjs/common';
import * as crypto from 'crypto';
import { UsersService } from '../users/users.service';

@Injectable()
export class RefreshTokenService {
  private readonly store = new Map<string, string>(); // Replace with DB or Redis in prod

  constructor(private readonly usersService: UsersService) {}

  async createRefreshToken(userId: string): Promise<string> {
    const token = crypto.randomBytes(64).toString('hex');
    this.store.set(userId, token);
    return token;
  }

  async verifyRefreshToken(userId: string, token: string): Promise<boolean> {
    const stored = this.store.get(userId);
    return stored === token;
  }

  async revokeToken(userId: string): Promise<void> {
    this.store.delete(userId);
  }

  async rotateRefreshToken(userId: string): Promise<string> {
    await this.revokeToken(userId);
    return this.createRefreshToken(userId);
  }
}
