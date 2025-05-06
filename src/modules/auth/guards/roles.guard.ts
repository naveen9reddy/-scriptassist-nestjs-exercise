import { ROLES_KEY } from '@common/decorators/roles.decorator';
import { CanActivate, ExecutionContext, Injectable, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    // Get roles metadata from the handler
    const requiredRoles = this.reflector.get<string[]>(ROLES_KEY, context.getHandler());

    if (!requiredRoles || requiredRoles.length === 0) {
      return true;  // If no roles are specified, allow access
    }

    const { user } = context.switchToHttp().getRequest();
    
    if (!user || !requiredRoles.includes(user.role)) {
      throw new ForbiddenException('Access denied: insufficient role');
    }

    return true;
  }
}
