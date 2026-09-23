import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { GameService } from './game.service';
import { CreateRoomDto } from './dto/create-room.dto';
import { JoinRoomDto } from './dto/join-room.dto';
import { AnswerDto } from './dto/answer.dto';

@Controller('rooms')
export class GameController {
  constructor(private readonly game: GameService) {}

  @Post()
  createRoom(@Body() dto: CreateRoomDto) {
    return this.game.createRoom(dto);
  }

  @Get(':code/host')
  getHostView(@Param('code') code: string, @Query('token') token: string) {
    return this.game.getHostView(code, token);
  }

  @Post(':code/join')
  join(@Param('code') code: string, @Body() dto: JoinRoomDto) {
    return this.game.joinRoom(code, dto.name);
  }

  @Get(':code/state')
  getPlayerView(
    @Param('code') code: string,
    @Query('playerId') playerId: string,
    @Query('token') token: string,
  ) {
    return this.game.getPlayerView(code, playerId, token);
  }

  @Post(':code/start')
  start(@Param('code') code: string, @Query('token') token: string) {
    return this.game.startGame(code, token);
  }

  @Post(':code/advance')
  advance(@Param('code') code: string, @Query('token') token: string) {
    return this.game.advance(code, token);
  }

  @Post(':code/answer')
  answer(@Param('code') code: string, @Body() dto: AnswerDto) {
    return this.game.submitAnswer(code, dto.playerId, dto.playerToken, dto.value);
  }
}
