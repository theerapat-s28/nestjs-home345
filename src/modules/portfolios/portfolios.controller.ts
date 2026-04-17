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
  Request,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';
import { PortfoliosService } from './portfolios.service';
import { CreatePortfolioDto } from './dtos/create-portfolio.dto';
import { UpdatePortfolioDto } from './dtos/update-portfolio.dto';
import { InviteMemberDto } from './dtos/invite-member.dto';
import { UpdateMemberRoleDto } from './dtos/update-member-role.dto';
import { AddMemberByEmailDto } from './dtos/add-member-by-email.dto';

@ApiTags('Portfolios')
@ApiBearerAuth('access-token')
@Controller('portfolios')
export class PortfoliosController {
  constructor(private readonly portfoliosService: PortfoliosService) {}

  // ── Portfolio CRUD ─────────────────────────────────────────────────────────

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new portfolio (caller becomes OWNER)' })
  create(@Request() req: any, @Body() dto: CreatePortfolioDto) {
    return this.portfoliosService.create(req.user.id, dto);
  }

  @Get()
  @ApiOperation({ summary: 'List all portfolios the current user is a member of' })
  findAll(@Request() req: any) {
    return this.portfoliosService.findAll(req.user.id);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get portfolio details with members' })
  @ApiParam({ name: 'id', description: 'Portfolio UUID' })
  findOne(@Request() req: any, @Param('id') id: string) {
    return this.portfoliosService.findOne(id, req.user.id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update portfolio (EDITOR or OWNER)' })
  @ApiParam({ name: 'id', description: 'Portfolio UUID' })
  update(@Request() req: any, @Param('id') id: string, @Body() dto: UpdatePortfolioDto) {
    return this.portfoliosService.update(id, req.user.id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Soft-delete portfolio (OWNER only)' })
  @ApiParam({ name: 'id', description: 'Portfolio UUID' })
  remove(@Request() req: any, @Param('id') id: string) {
    return this.portfoliosService.remove(id, req.user.id);
  }

  // ── Member management ──────────────────────────────────────────────────────

  @Post(':id/members')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Invite a member to the portfolio (OWNER only)' })
  @ApiParam({ name: 'id', description: 'Portfolio UUID' })
  inviteMember(@Request() req: any, @Param('id') id: string, @Body() dto: InviteMemberDto) {
    return this.portfoliosService.inviteMember(id, req.user.id, dto);
  }

  @Post(':id/members/by-email')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Invite a member to the portfolio by email (OWNER only)' })
  @ApiParam({ name: 'id', description: 'Portfolio UUID' })
  addMemberByEmail(@Request() req: any, @Param('id') id: string, @Body() dto: AddMemberByEmailDto) {
    return this.portfoliosService.addMemberByEmail(id, req.user.id, dto);
  }

  @Patch(':id/members/:userId')
  @ApiOperation({ summary: 'Change a member\'s role (OWNER only)' })
  @ApiParam({ name: 'id', description: 'Portfolio UUID' })
  @ApiParam({ name: 'userId', description: 'Target user UUID' })
  updateMemberRole(
    @Request() req: any,
    @Param('id') id: string,
    @Param('userId') targetUserId: string,
    @Body() dto: UpdateMemberRoleDto,
  ) {
    return this.portfoliosService.updateMemberRole(id, req.user.id, targetUserId, dto);
  }

  @Delete(':id/members/:userId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Remove a member from the portfolio (OWNER only)' })
  @ApiParam({ name: 'id', description: 'Portfolio UUID' })
  @ApiParam({ name: 'userId', description: 'Target user UUID' })
  removeMember(
    @Request() req: any,
    @Param('id') id: string,
    @Param('userId') targetUserId: string,
  ) {
    return this.portfoliosService.removeMember(id, req.user.id, targetUserId);
  }

  // ── Holdings ───────────────────────────────────────────────────────────────

  @Get(':id/holdings')
  @ApiOperation({ summary: 'List all asset holdings in the portfolio' })
  @ApiParam({ name: 'id', description: 'Portfolio UUID' })
  getHoldings(@Request() req: any, @Param('id') id: string) {
    return this.portfoliosService.getHoldings(id, req.user.id);
  }

  @Post(':id/accept')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Accept a portfolio invitation' })
  @ApiParam({ name: 'id', description: 'Portfolio UUID' })
  acceptInvitation(@Request() req: any, @Param('id') id: string) {
    return this.portfoliosService.acceptInvitation(id, req.user.id);
  }

  @Post(':id/reject')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Reject a portfolio invitation' })
  @ApiParam({ name: 'id', description: 'Portfolio UUID' })
  rejectInvitation(@Request() req: any, @Param('id') id: string) {
    return this.portfoliosService.rejectInvitation(id, req.user.id);
  }
}
