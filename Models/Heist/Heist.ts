import {numbro} from "../../Util/Formatter";
import {UserInstance} from "../User/UserInstance";
import HeistModel from "./HeistModel";

export class Heist extends HeistModel {
	hasParticipant(discordId: string) {
		return this.participants.hasOwnProperty(discordId);
	}

	async addParticipant(user: UserInstance, amount: number) {
		let participant = this.participants[user.id];

		if (!participant) {
			participant = this.participants[user.id] = {
				userId           : user._id,
				totalContributed : '0',
			};
		}

		participant.totalContributed = String(
			numbro(participant.totalContributed).add(amount).value(),
		);

		await this.save();
	}
}

export default Heist;
