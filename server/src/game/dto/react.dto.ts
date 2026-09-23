import { IsIn, IsString } from 'class-validator';
import { REACTION_KINDS, ReactionKind } from '../types';

export class ReactDto {
  @IsString()
  playerId!: string;

  @IsString()
  playerToken!: string;

  @IsIn(REACTION_KINDS)
  kind!: ReactionKind;
}
