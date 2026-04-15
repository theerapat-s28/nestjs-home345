import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
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
import { AssetsService } from './assets.service';
import { CreateAssetDto } from './dtos/create-asset.dto';
import { UpdateAssetDto } from './dtos/update-asset.dto';
import { QueryAssetDto } from './dtos/query-asset.dto';
import { CreateAssetPriceDto } from './dtos/create-asset-price.dto';

@ApiTags('Assets')
@ApiBearerAuth('access-token')
@Controller('assets')
export class AssetsController {
  constructor(private readonly assetsService: AssetsService) {}

  // ── Asset CRUD ─────────────────────────────────────────────────────────────

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new global asset definition (admin only)' })
  create(@Request() req: any, @Body() dto: CreateAssetDto) {
    return this.assetsService.create(dto);
  }

  @Get()
  @ApiOperation({ summary: 'Search and list all assets' })
  findAll(@Query() query: QueryAssetDto) {
    return this.assetsService.findAll(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a single asset by ID' })
  @ApiParam({ name: 'id', description: 'Asset UUID' })
  findOne(@Param('id') id: string) {
    return this.assetsService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update an asset (admin only)' })
  @ApiParam({ name: 'id', description: 'Asset UUID' })
  update(@Request() req: any, @Param('id') id: string, @Body() dto: UpdateAssetDto) {
    return this.assetsService.update(id, dto, req.user.role);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Soft-delete an asset (admin only)' })
  @ApiParam({ name: 'id', description: 'Asset UUID' })
  remove(@Request() req: any, @Param('id') id: string) {
    return this.assetsService.remove(id, req.user.role);
  }

  // ── Price history ──────────────────────────────────────────────────────────

  @Post(':id/prices')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Record a new price for an asset' })
  @ApiParam({ name: 'id', description: 'Asset UUID' })
  recordPrice(@Param('id') id: string, @Body() dto: CreateAssetPriceDto) {
    return this.assetsService.recordPrice(id, dto);
  }

  @Get(':id/prices')
  @ApiOperation({ summary: 'Get price history for an asset' })
  @ApiParam({ name: 'id', description: 'Asset UUID' })
  getPriceHistory(
    @Param('id') id: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    return this.assetsService.getPriceHistory(
      id,
      limit ? parseInt(limit, 10) : 50,
      offset ? parseInt(offset, 10) : 0,
    );
  }

  @Get(':id/prices/latest')
  @ApiOperation({ summary: 'Get the latest recorded price for an asset' })
  @ApiParam({ name: 'id', description: 'Asset UUID' })
  getLatestPrice(@Param('id') id: string) {
    return this.assetsService.getLatestPrice(id);
  }
}
