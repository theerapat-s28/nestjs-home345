export interface UserMemberResponse {
  id: string; // employee id
  firstName: string;
  firstNameTH?: string | null;
  lastName: string;
  lastNameTH?: string | null;
  position?: {
    id: string;
    name: string;
    nameTH?: string | null;
  } | null;
  user: {
    id: string;
    username: string;
    email: string;
    role: string;
  };
}
