import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  HttpCode,
  HttpStatus,
} from "@nestjs/common";
import {
  ApiTags,
  ApiOkResponse,
  ApiCreatedResponse,
  ApiBearerAuth,
} from "@nestjs/swagger";
import { UsersService } from "./users.service";
import { CreateUserDto } from "./dtos/create-user.dto";
import { UpdateUserDto } from "./dtos/update-user.dto";
import { SearchUserDto } from "./dtos/seach-user.dto";
import { Roles } from "@auth/decorators/roles.decorator";
import { Role } from "@prisma/client";

@ApiTags("Users")
@ApiBearerAuth("access-token")
@Controller("users")
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post()
  @Roles(Role.ADMIN)
  @HttpCode(HttpStatus.CREATED)
  @ApiCreatedResponse({ description: "Create a new user" })
  create(@Body() dto: CreateUserDto) {
    return this.usersService.create(dto);
  }

  @Get()
  @HttpCode(HttpStatus.OK)
  @ApiOkResponse({ description: "Retrieve all users" })
  findAll() {
    return this.usersService.findAll();
  }

  @Get(":id")
  @HttpCode(HttpStatus.OK)
  @ApiOkResponse({ description: "Retrieve a user by ID" })
  findById(@Param("id") id: string) {
    return this.usersService.findById(id);
  }

  @Patch(":id")
  @Roles(Role.ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiOkResponse({ description: "Update a user by ID" })
  update(@Param("id") id: string, @Body() dto: UpdateUserDto) {
    return this.usersService.update(id, dto);
  }

  @Delete(":id")
  @Roles(Role.ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiOkResponse({ description: "Soft delete a user by ID" })
  remove(@Param("id") id: string) {
    return this.usersService.remove(id);
  }

  @Post("search")
  @HttpCode(HttpStatus.OK)
  @ApiOkResponse({
    description: "Paginated list of users matching filters",
    type: Object,
  })
  async search(@Body() dto: SearchUserDto) {
    return this.usersService.search(dto);
  }
}
