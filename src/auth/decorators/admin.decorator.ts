import { applyDecorators } from "@nestjs/common";
import { Role } from "@prisma/client";
import { Roles } from "./roles.decorator";

export const Admin = () => applyDecorators(Roles(Role.admin));
