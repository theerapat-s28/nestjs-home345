import { Theme } from "@prisma/client";

export interface ProfileResponse {
  id: string;
  userId: string;
  name?: string | null;
  bio?: string | null;
  profileImageUrl?: string | null;
  theme: Theme;
  createdAt: Date;
  updatedAt: Date;
}
