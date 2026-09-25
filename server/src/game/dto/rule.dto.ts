import { IsIn } from 'class-validator';
import { RULING_PICKS, RulingPick } from '../types';

export class RuleDto {
  @IsIn(RULING_PICKS)
  pick!: RulingPick;
}
