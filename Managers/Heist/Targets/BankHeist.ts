import {HeistTarget, HeistType, IHeistConfig} from "../HeistInstance";

export class BankHeist extends HeistTarget {
	static readonly type: HeistType      = HeistType.BANK_HEIST;
	static readonly config: IHeistConfig = {
		// Embed info
		title       : 'Bank Heist',
		description : 'Rob a bank to make bank',
		color       : 'GREEN',
		// Other Settings
		setupDuration : '1m',
		runDuration   : '10m',
		minimumBuyin  : 5000,
		upgradeCost   : 5000,
	};
}
