import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Query,
  Request,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';
import { PortfolioCashService } from './portfolio-cash.service';
import { CashOperationDto } from './dtos/cash-operation.dto';
import { QueryCashTxnDto } from './dtos/query-cash-txn.dto';

@ApiTags('Portfolio Cash')
@ApiBearerAuth('access-token')
@Controller('portfolios/:portfolioId/cash')
export class PortfolioCashController {
  constructor(private readonly portfolioCashService: PortfolioCashService) {}

  @Get()
  @ApiOperation({ summary: 'Get cash balances for all currencies in the portfolio' })
  @ApiParam({ name: 'portfolioId', description: 'Portfolio UUID' })
  getBalances(@Request() req: any, @Param('portfolioId') portfolioId: string) {
    return this.portfolioCashService.getBalances(portfolioId, req.user.id);
  }

  @Post('operations')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Record a manual cash operation (DEPOSIT / WITHDRAWAL / etc.)' })
  @ApiParam({ name: 'portfolioId', description: 'Portfolio UUID' })
  recordOperation(
    @Request() req: any,
    @Param('portfolioId') portfolioId: string,
    @Body() dto: CashOperationDto,
  ) {
    return this.portfolioCashService.recordOperation(portfolioId, req.user.id, dto);
  }

  @Get('transactions')
  @ApiOperation({ summary: 'List cash transaction history for the portfolio' })
  @ApiParam({ name: 'portfolioId', description: 'Portfolio UUID' })
  getCashTransactions(
    @Request() req: any,
    @Param('portfolioId') portfolioId: string,
    @Query() query: QueryCashTxnDto,
  ) {
    return this.portfolioCashService.getCashTransactions(portfolioId, req.user.id, query);
  }
}
