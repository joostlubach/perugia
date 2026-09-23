import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { GameService } from './game.service';
import { CreateRoomDto } from './dto/create-room.dto';
import { JoinRoomDto } from './dto/join-room.dto';
import { AnswerDto } from './dto/answer.dto';

// There's only one room -- a single reunion, played once -- so none of
// these routes take a room identifier.
@Controller('room')
export class GameController {
  constructor(private readonly game: GameService) {}

  @Post()
  createRoom(@Body() dto: CreateRoomDto) {
    return this.game.createRoom(dto);
  }

  @Get('host')
  getHostView(@Query('token') token: string) {
    return this.game.getHostView(token);
  }

  @Post('join')
  join(@Body() dto: JoinRoomDto) {
    return this.game.joinRoom(dto.name, dto.avatar);
  }

  @Get('state')
  getPlayerView(@Query('playerId') playerId: string, @Query('token') token: string) {
    return this.game.getPlayerView(playerId, token);
  }

  @Post('start')
  start(@Query('token') token: string) {
    return this.game.startGame(token);
  }

  @Post('advance')
  advance(@Query('token') token: string) {
    return this.game.advance(token);
  }

  @Post('answer')
  answer(@Body() dto: AnswerDto) {
    return this.game.submitAnswer(
      dto.playerId,
      dto.playerToken,
      dto.order ?? dto.plates ?? dto.line ?? dto.multiSelect ?? dto.strokes ?? dto.value!,
    );
  }
}
