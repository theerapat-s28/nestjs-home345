export interface ProfileResponse {
  id: string;
  userId: string;
  firstname?: string | null;
  lastname?: string | null;
  nickname?: string | null;
  phone?: string | null;
  profileImageUrl?: string | null;
  createdAt: Date;
  updatedAt: Date;
}
