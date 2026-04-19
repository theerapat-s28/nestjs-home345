import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  UnauthorizedException,
} from "@nestjs/common";
import { PrismaService } from "@core/prisma/prisma.service";

@Injectable()
export class Home345AccessGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user?.id) throw new UnauthorizedException();

    const dbUser = await this.prisma.user.findUnique({
      where: { id: user.id },
      select: { hasHome345Access: true },
    });

    if (!dbUser?.hasHome345Access) {
      throw new ForbiddenException("Access to Home345 module is restricted");
    }

    return true;
  }
}
