import {HeistTarget, HeistType, IHeistConfig} from "../HeistInstance";

export class HouseRobbery extends HeistTarget {
	static readonly type: HeistType      = HeistType.HOUSE_ROBBERY;
	static readonly config: IHeistConfig = {
		// Embed info
		title       : 'House Robbery',
		description : 'Break into a mansion and steal priceless arts',
		color       : 'BLUE',
		// Other Settings
		setupDuration : '1m',
		runDuration   : '5m',
		minimumBuyin  : 1000,
		upgradeCost   : 0,
	};
}
