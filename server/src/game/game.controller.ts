import { Body, Controller, ForbiddenException, Get, Post, Query, Req } from '@nestjs/common';
import { Request } from 'express';
import { RoomStatus } from './types';
import { GameService } from './game.service';
import { JoinRoomDto } from './dto/join-room.dto';
import { AnswerDto } from './dto/answer.dto';
import { ReactDto } from './dto/react.dto';

// There's only one room -- a single reunion, played once -- so none of
// these routes take a room identifier.
@Controller('room')
export class GameController {
  constructor(private readonly game: GameService) {}

  @Post()
  createRoom() {
    return this.game.createRoom();
  }

  @Get('host')
  getHostView(@Query('token') token: string) {
    return this.game.getHostView(token);
  }

  // Lets a bare /play on localhost join the current room without scanning
  // the QR code. Deployed, the Host header is never localhost.
  @Get('join-code')
  getJoinCode(@Req() req: Request) {
    if (!LOCAL_HOSTS.includes(req.hostname)) throw new ForbiddenException();
    return this.game.getJoinCode();
  }

  @Post('join')
  join(@Body() dto: JoinRoomDto) {
    return this.game.joinRoom(dto.joinCode, dto.name, dto.avatar);
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
  advance(@Query('token') token: string, @Query('from') from?: RoomStatus) {
    return this.game.advance(token, from);
  }

  @Post('react')
  react(@Body() dto: ReactDto) {
    return this.game.react(dto.playerId, dto.playerToken, dto.kind);
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

const LOCAL_HOSTS = ['localhost', '127.0.0.1'];
