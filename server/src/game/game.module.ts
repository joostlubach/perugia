import { Module } from '@nestjs/common';
import { StorageModule } from '../storage/storage.module';
import { GameController } from './game.controller';
import { GameService } from './game.service';
import { QuestionsController } from './questions.controller';

@Module({
  imports: [StorageModule],
  controllers: [GameController, QuestionsController],
  providers: [GameService],
})
export class GameModule {}
