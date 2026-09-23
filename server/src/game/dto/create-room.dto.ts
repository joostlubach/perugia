import { Type } from 'class-transformer';
import { Question } from '../types';
import {
  ArrayMinSize,
  IsArray,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Max,
  Min,
  ValidateIf,
  ValidateNested,
} from 'class-validator';

export class QuestionInputDto {
  @IsIn(['multiple_choice', 'drag_count'])
  type!: 'multiple_choice' | 'drag_count';

  @IsString()
  text!: string;

  @IsInt()
  @Min(5)
  @Max(120)
  timeLimitSec!: number;

  @IsInt()
  @Min(0)
  points!: number;

  // multiple_choice only
  @ValidateIf((q) => q.type === 'multiple_choice')
  @IsArray()
  @ArrayMinSize(2)
  @IsString({ each: true })
  options?: string[];

  @ValidateIf((q) => q.type === 'multiple_choice')
  @IsInt()
  @Min(0)
  correctIndex?: number;

  // drag_count only
  @ValidateIf((q) => q.type === 'drag_count')
  @IsString()
  dragLabel?: string;

  @ValidateIf((q) => q.type === 'drag_count')
  @IsInt()
  @Min(0)
  correctCount?: number;
}

export function questionInputToQuestion(input: QuestionInputDto, id: string): Question {
  if (input.type === 'multiple_choice') {
    return {
      id,
      type: 'multiple_choice',
      text: input.text,
      timeLimitSec: input.timeLimitSec,
      points: input.points,
      options: input.options!,
      correctIndex: input.correctIndex!,
    };
  }
  return {
    id,
    type: 'drag_count',
    text: input.text,
    timeLimitSec: input.timeLimitSec,
    points: input.points,
    dragLabel: input.dragLabel!,
    correctCount: input.correctCount!,
  };
}

export class CreateRoomDto {
  @IsOptional()
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => QuestionInputDto)
  questions?: QuestionInputDto[];
}
