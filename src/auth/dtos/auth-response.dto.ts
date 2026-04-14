import { ApiProperty } from "@nestjs/swagger";

export class UserDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  username: string;

  @ApiProperty()
  email: string;

  @ApiProperty()
  role: string;

  @ApiProperty()
  status: string;

  @ApiProperty({ required: false, nullable: true })
  employeeId?: string;

  @ApiProperty({ required: false, nullable: true })
  position?: string;

  @ApiProperty({ required: false, nullable: true })
  positionCode?: string;

  @ApiProperty({ required: false, nullable: true })
  department?: string;

  @ApiProperty({ required: false, nullable: true })
  firstname?: string;

  @ApiProperty({ required: false, nullable: true })
  lastname?: string;

  @ApiProperty({ required: false, nullable: true })
  profileImageUrl?: string;
}

export class AuthResponseDataDto {
  @ApiProperty()
  access_token: string;

  @ApiProperty({ type: UserDto })
  user: UserDto;
}

export class AuthResponseDto {
  @ApiProperty()
  message: string;

  @ApiProperty({ type: AuthResponseDataDto })
  data: AuthResponseDataDto;
}
