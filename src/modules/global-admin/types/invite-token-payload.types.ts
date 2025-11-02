import { InviteTokenType } from '../enums/invite-token-type.enum';

export interface InviteTokenPayload {
  type: InviteTokenType;
  timestamp: number;
}
