import { Type } from 'class-transformer';
import { MenuCourse, Question } from '../types';
import {
  ArrayMinSize,
  IsArray,
  IsIn,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  Min,
  ValidateIf,
  ValidateNested,
} from 'class-validator';

export class QuestionInputDto {
  @IsIn(['multiple_choice', 'drag_count', 'podium_order', 'plate_assignment', 'ham_cut', 'multi_select', 'trace_marks'])
  type!:
    | 'multiple_choice'
    | 'drag_count'
    | 'podium_order'
    | 'plate_assignment'
    | 'ham_cut'
    | 'multi_select'
    | 'trace_marks';

  @IsString()
  title!: string;

  @IsString()
  text!: string;

  @IsOptional()
  @IsString()
  playerText?: string;

  @IsInt()
  @Min(5)
  @Max(120)
  timeLimitSec!: number;

  @IsInt()
  @Min(0)
  points!: number;

  // multiple_choice / multi_select
  @ValidateIf((q) => q.type === 'multiple_choice' || q.type === 'multi_select')
  @IsArray()
  @ArrayMinSize(2)
  @IsString({ each: true })
  options?: string[];

  // multiple_choice only
  @ValidateIf((q) => q.type === 'multiple_choice')
  @IsInt()
  @Min(0)
  correctIndex?: number;

  // multiple_choice only, optional -- see MultipleChoiceQuestion.menu.
  @IsOptional()
  @IsArray()
  menu?: MenuCourse[];

  // multi_select only
  @ValidateIf((q) => q.type === 'multi_select')
  @IsArray()
  @ArrayMinSize(1)
  correctIndexes?: number[];

  // drag_count only
  @ValidateIf((q) => q.type === 'drag_count')
  @IsString()
  dragLabel?: string;

  @ValidateIf((q) => q.type === 'drag_count')
  @IsInt()
  @Min(0)
  correctCount?: number;

  // podium_order only
  @ValidateIf((q) => q.type === 'podium_order')
  @IsArray()
  @ArrayMinSize(1)
  correctOrder?: string[][];

  @ValidateIf((q) => q.type === 'podium_order')
  @IsArray()
  @IsString({ each: true })
  groupLabels?: string[];

  // plate_assignment only
  @ValidateIf((q) => q.type === 'plate_assignment')
  @IsString()
  head?: string;

  @ValidateIf((q) => q.type === 'plate_assignment')
  @IsArray()
  @IsString({ each: true })
  left?: string[];

  @ValidateIf((q) => q.type === 'plate_assignment')
  @IsArray()
  @IsString({ each: true })
  right?: string[];

  @ValidateIf((q) => q.type === 'plate_assignment')
  @IsArray()
  @IsString({ each: true })
  correctPrimo?: string[];

  @ValidateIf((q) => q.type === 'plate_assignment')
  @IsArray()
  @IsString({ each: true })
  correctSecondo?: string[];

  // ham_cut / trace_marks, optional for multiple_choice
  @ValidateIf((q) => q.type === 'ham_cut' || q.type === 'trace_marks' || q.imageUrl !== undefined)
  @IsString()
  imageUrl?: string;

  @ValidateIf((q) => q.type === 'ham_cut')
  @IsArray()
  rows?: ([number, number] | null)[];

  // trace_marks only
  @ValidateIf((q) => q.type === 'trace_marks')
  @IsString()
  revealImageUrl?: string;

  @ValidateIf((q) => q.type === 'trace_marks')
  @IsNumber()
  aspectRatio?: number;

  @ValidateIf((q) => q.type === 'trace_marks')
  @IsArray()
  marks?: { x: number; y: number }[][];
}

export function questionInputToQuestion(input: QuestionInputDto, id: string): Question {
  if (input.type === 'multiple_choice') {
    return {
      id,
      type: 'multiple_choice',
      title: input.title,
      text: input.text,
      playerText: input.playerText,
      timeLimitSec: input.timeLimitSec,
      points: input.points,
      options: input.options!,
      correctIndex: input.correctIndex!,
      menu: input.menu,
      imageUrl: input.imageUrl,
    };
  }
  if (input.type === 'podium_order') {
    return {
      id,
      type: 'podium_order',
      title: input.title,
      text: input.text,
      playerText: input.playerText,
      timeLimitSec: input.timeLimitSec,
      points: input.points,
      correctOrder: input.correctOrder!,
      groupLabels: input.groupLabels!,
    };
  }
  if (input.type === 'plate_assignment') {
    return {
      id,
      type: 'plate_assignment',
      title: input.title,
      text: input.text,
      playerText: input.playerText,
      timeLimitSec: input.timeLimitSec,
      points: input.points,
      head: input.head!,
      left: input.left!,
      right: input.right!,
      correctPrimo: input.correctPrimo!,
      correctSecondo: input.correctSecondo!,
    };
  }
  if (input.type === 'ham_cut') {
    return {
      id,
      type: 'ham_cut',
      title: input.title,
      text: input.text,
      playerText: input.playerText,
      timeLimitSec: input.timeLimitSec,
      points: input.points,
      imageUrl: input.imageUrl!,
      rows: input.rows!,
    };
  }
  if (input.type === 'trace_marks') {
    return {
      id,
      type: 'trace_marks',
      title: input.title,
      text: input.text,
      playerText: input.playerText,
      timeLimitSec: input.timeLimitSec,
      points: input.points,
      imageUrl: input.imageUrl!,
      revealImageUrl: input.revealImageUrl!,
      aspectRatio: input.aspectRatio!,
      marks: input.marks!,
    };
  }
  if (input.type === 'multi_select') {
    return {
      id,
      type: 'multi_select',
      title: input.title,
      text: input.text,
      playerText: input.playerText,
      timeLimitSec: input.timeLimitSec,
      points: input.points,
      options: input.options!,
      correctIndexes: input.correctIndexes!,
    };
  }
  return {
    id,
    type: 'drag_count',
    title: input.title,
    text: input.text,
    playerText: input.playerText,
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
