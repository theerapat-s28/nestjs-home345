import { Module } from '@nestjs/common';
import { PortfolioCashController } from './portfolio-cash.controller';
import { PortfolioCashService } from './portfolio-cash.service';
import { PortfoliosModule } from '@modules/portfolios/portfolios.module';

@Module({
  imports: [PortfoliosModule],
  controllers: [PortfolioCashController],
  providers: [PortfolioCashService],
  exports: [PortfolioCashService],
})
export class PortfolioCashModule {}
