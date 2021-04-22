import {client} from "../../../index";
import User from "../../../Models/User/User";
import CronJob from "../CronJob";

export default class BotClaimInvestment extends CronJob {

	handlerId = 'bot-claim-investment';
	runEvery  = '30m';

	public async run() {
		await super.run();

		const botUser = await User.get(client.user.id);

		await botUser.balanceManager().claimInvestment();
	}


}