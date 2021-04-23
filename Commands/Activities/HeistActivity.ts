import {CommandOptionType, SlashCommand} from "slash-create";
import CommandContext, {MessageOptions} from "slash-create/lib/context";
import {HeistManager} from "../../Managers/Heist/HeistManager";
import User from "../../Models/User/User";
import {getChannel, guildId} from "../../Util/Bot";
import {numbro} from "../../Util/Formatter";

export default class HeistActivity extends SlashCommand {
	constructor(creator) {
		super(creator, {
			deferEphemeral : true,
			guildIDs       : guildId,
			name           : 'heist',
			description    : 'Start a heist that could take several hours and have multiple stages. Try your luck for big payouts!',
			options        : [
				{
					name        : 'amount',
					description : 'How much you want to contribute to the Heist.',
					required    : true,
					type        : CommandOptionType.STRING,
				},
			],
		});

		this.filePath = __filename;
	}

	async run(ctx: CommandContext): Promise<MessageOptions | string> {
		const gambleChannel = getChannel('gambling');

		if (ctx.channelID !== gambleChannel?.id) {
			return `You can only use /heist commands in the ${gambleChannel.toString()} channel.`;
		}

		if (!HeistManager.hasInstance() && !await HeistManager.canStartHeist()) {
			return 'There is too much heat from the last heist. Come back later to start another one.';
		}

		const amount = numbro(ctx.options.amount).value();
		const user   = await User.get(ctx.user.id);

		return HeistManager.instance().join(user, amount);
	}
}
