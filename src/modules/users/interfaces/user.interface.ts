import { Role, UserStatus } from "@prisma/client";

export interface User {
  id: string;
  username: string;
  email: string;
  password?: string | null;
  isResetPassword: boolean;
  role: Role;
  status: UserStatus;
  lastLoginAt?: Date | null;
  hasHome345Access: boolean;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date | null;
}
