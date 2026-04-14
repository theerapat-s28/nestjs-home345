import { ExecutionContext, Injectable } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { AuthGuard } from "@nestjs/passport";
import { IS_PUBLIC_KEY } from "../decorators/public.decorator";

@Injectable()
export class JwtAuthGuard extends AuthGuard("jwt") {
  constructor(private reflector: Reflector) {
    super();
  }

  canActivate(context: ExecutionContext) {
    // 1. Check if the handler (method) or class (controller) has the '@Public()' decorator
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    // 2. If it is marked as public, allow access immediately without checking the token
    if (isPublic) {
      return true;
    }

    // 2.1 Bypass authentication in development if configured
    if (
      process.env.NODE_ENV === "development" &&
      process.env.BYPASS_AUTH === "true"
    ) {
      const request = context.switchToHttp().getRequest();
      // Attach a mock admin user for convenience
      request.user = {
        id: "dev-bypass-user-id",
        username: "dev-admin",
        role: "admin",
      };
      return true;
    }

    // 3. Otherwise, use the default Passport JWT strategy to verify the token
    // If the token is invalid or missing, it throws a 401 Unauthorized exception
    return super.canActivate(context);
  }
}
