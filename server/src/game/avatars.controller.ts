import { Controller, Get } from '@nestjs/common';
import { AVATAR_KEYS } from './avatars';

@Controller('avatars')
export class AvatarsController {
  @Get()
  list() {
    return AVATAR_KEYS;
  }
}
