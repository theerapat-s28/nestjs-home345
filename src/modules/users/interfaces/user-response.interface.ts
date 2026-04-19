import { Role, UserStatus } from "@prisma/client";

export interface UserInterfaceResponse {
  id: string;
  username: string;
  email: string;
  role: Role;
  status: UserStatus;

  hasHome345Access: boolean;
  isActive: boolean;
  isResetPassword: boolean;
  lastLoginAt?: Date | null;

  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date | null;

  employee?: {
    id: string;
    positionId: string;
    firstName: string;
    lastName: string;
    firstNameTH?: string | null;
    lastNameTH?: string | null;
    position?: {
      id: string;
      name: string;
      code: string;
      level: number;
    } | null;
  } | null;

  profile?: {
    id: string;
    profileImageUrl?: string | null;
  } | null;
}
