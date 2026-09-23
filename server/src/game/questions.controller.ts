import { Controller, Get } from '@nestjs/common';
import { sampleQuestions } from './questions.sample';

@Controller('questions')
export class QuestionsController {
  @Get()
  list() {
    return sampleQuestions;
  }
}
