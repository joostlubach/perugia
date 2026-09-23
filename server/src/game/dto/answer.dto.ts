import { IsArray, IsInt, IsObject, IsOptional, IsString, Min, ValidateIf } from 'class-validator';

export class AnswerDto {
  @IsString()
  playerId!: string;

  @IsString()
  playerToken!: string;

  // Option index for multiple_choice questions, dragged-token count for drag_count.
  @ValidateIf((a) => a.order === undefined && a.plates === undefined && a.line === undefined && a.multiSelect === undefined && a.strokes === undefined)
  @IsInt()
  @Min(0)
  value?: number;

  // Avatar keys per group, first place first -- podium_order; avatar keys
  // per map stop -- travel_map.
  @IsOptional()
  @IsArray()
  order?: string[][];

  // Seat keys marked as having each course -- plate_assignment only.
  @IsOptional()
  @IsObject()
  plates?: { primo: string[]; secondo: string[] };

  // Two control points defining the cutting line -- ham_cut only.
  @IsOptional()
  @IsObject()
  line?: { p1: { x: number; y: number }; p2: { x: number; y: number } };

  // Selected option indexes -- multi_select only.
  @IsOptional()
  @IsArray()
  multiSelect?: number[];

  // Freehand strokes of normalized points -- trace_marks only.
  @IsOptional()
  @IsArray()
  strokes?: { x: number; y: number }[][];
}
