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
import { TransactionsService } from './transactions.service';
import { CreateTransactionDto } from './dtos/create-transaction.dto';
import { QueryTransactionDto } from './dtos/query-transaction.dto';

@ApiTags('Transactions')
@ApiBearerAuth('access-token')
@Controller('portfolios/:portfolioId/transactions')
export class TransactionsController {
  constructor(private readonly transactionsService: TransactionsService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Record a new transaction (BUY/SELL/etc.) for a portfolio asset' })
  @ApiParam({ name: 'portfolioId', description: 'Portfolio UUID' })
  create(
    @Request() req: any,
    @Param('portfolioId') portfolioId: string,
    @Body() dto: CreateTransactionDto,
  ) {
    return this.transactionsService.create(portfolioId, req.user.id, dto);
  }

  @Get()
  @ApiOperation({ summary: 'List transactions for a portfolio' })
  @ApiParam({ name: 'portfolioId', description: 'Portfolio UUID' })
  findAll(
    @Request() req: any,
    @Param('portfolioId') portfolioId: string,
    @Query() query: QueryTransactionDto,
  ) {
    return this.transactionsService.findAll(portfolioId, req.user.id, query);
  }

  @Get(':txnId')
  @ApiOperation({ summary: 'Get a single transaction by ID' })
  @ApiParam({ name: 'portfolioId', description: 'Portfolio UUID' })
  @ApiParam({ name: 'txnId', description: 'Transaction UUID' })
  findOne(
    @Request() req: any,
    @Param('portfolioId') portfolioId: string,
    @Param('txnId') txnId: string,
  ) {
    return this.transactionsService.findOne(portfolioId, req.user.id, txnId);
  }
}
