import { IsIn, IsString, Length } from 'class-validator';
import { AVATAR_KEYS } from '../avatars';

export class JoinRoomDto {
  @IsString()
  joinCode!: string;

  @IsString()
  @Length(1, 24)
  name!: string;

  @IsIn(AVATAR_KEYS)
  avatar!: string;
}
