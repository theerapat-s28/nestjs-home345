import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
} from "@nestjs/common";
import { ApiTags, ApiOperation, ApiBearerAuth } from "@nestjs/swagger";
import { RemindersService } from "./reminders.service";
import { CreateReminderDto } from "./dtos/create-reminder.dto";
import { UpdateReminderDto } from "./dtos/update-reminder.dto";
import { JwtAuthGuard } from "../../auth/guards/jwt-auth.guard";
import { GetUser } from "../../auth/decorators/get-user.decorator";

@ApiTags("Reminders")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller("reminders")
export class RemindersController {
  constructor(private readonly remindersService: RemindersService) {}

  @Post()
  @ApiOperation({ summary: "Create a reminder rule for a subscription" })
  create(@GetUser("id") userId: string, @Body() createDto: CreateReminderDto) {
    return this.remindersService.create(userId, createDto);
  }

  @Get()
  @ApiOperation({ summary: "Get all reminders for the user" })
  findAll(@GetUser("id") userId: string) {
    return this.remindersService.findAll(userId);
  }

  @Get(":id")
  @ApiOperation({ summary: "Get a single reminder by ID" })
  findOne(@GetUser("id") userId: string, @Param("id") id: string) {
    return this.remindersService.findOne(userId, id);
  }

  @Patch(":id")
  @ApiOperation({ summary: "Update a reminder rule" })
  update(
    @GetUser("id") userId: string,
    @Param("id") id: string,
    @Body() updateDto: UpdateReminderDto,
  ) {
    return this.remindersService.update(userId, id, updateDto);
  }

  @Delete(":id")
  @ApiOperation({ summary: "Delete a reminder rule" })
  remove(@GetUser("id") userId: string, @Param("id") id: string) {
    return this.remindersService.remove(userId, id);
  }
}
