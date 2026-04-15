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
import { SubscriptionsService } from "./subscriptions.service";
import { CreateSubscriptionDto } from "./dtos/create-subscription.dto";
import { UpdateSubscriptionDto } from "./dtos/update-subscription.dto";
import { JwtAuthGuard } from "../../auth/guards/jwt-auth.guard";
import { GetUser } from "../../auth/decorators/get-user.decorator";

@ApiTags("Subscriptions")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller("subscriptions")
export class SubscriptionsController {
  constructor(private readonly subscriptionsService: SubscriptionsService) {}

  @Post()
  @ApiOperation({ summary: "Create a new subscription" })
  create(
    @GetUser("id") userId: string,
    @Body() createSubscriptionDto: CreateSubscriptionDto,
  ) {
    return this.subscriptionsService.create(userId, createSubscriptionDto);
  }

  @Get()
  @ApiOperation({ summary: "Get all active subscriptions for the user" })
  findAll(@GetUser("id") userId: string) {
    return this.subscriptionsService.findAll(userId);
  }

  @Get(":id")
  @ApiOperation({ summary: "Get a single subscription by ID" })
  findOne(@GetUser("id") userId: string, @Param("id") id: string) {
    return this.subscriptionsService.findOne(userId, id);
  }

  @Patch(":id")
  @ApiOperation({ summary: "Update a subscription" })
  update(
    @GetUser("id") userId: string,
    @Param("id") id: string,
    @Body() updateSubscriptionDto: UpdateSubscriptionDto,
  ) {
    return this.subscriptionsService.update(userId, id, updateSubscriptionDto);
  }

  @Delete(":id")
  @ApiOperation({ summary: "Soft delete a subscription" })
  remove(@GetUser("id") userId: string, @Param("id") id: string) {
    return this.subscriptionsService.remove(userId, id);
  }
}
