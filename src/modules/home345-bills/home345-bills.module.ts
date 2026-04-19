import { Module } from "@nestjs/common";
import { Home345BillsController } from "./home345-bills.controller";
import { Home345BillsService } from "./home345-bills.service";
import { Home345AccessGuard } from "@auth/guards/home345-access.guard";
import { PrismaModule } from "@core/prisma/prisma.module";

@Module({
  imports: [PrismaModule],
  controllers: [Home345BillsController],
  providers: [Home345BillsService, Home345AccessGuard],
})
export class Home345BillsModule {}
