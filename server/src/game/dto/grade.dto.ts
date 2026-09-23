import { IsString, Length } from 'class-validator';

export class GradeDto {
  @IsString()
  @Length(1, 100)
  correctAnswer!: string;
}
