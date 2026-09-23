import { IsInt, IsString, Min } from 'class-validator';

export class AnswerDto {
  @IsString()
  playerId!: string;

  @IsString()
  playerToken!: string;

  // Option index for multiple_choice questions, dragged-token count for drag_count.
  @IsInt()
  @Min(0)
  value!: number;
}
