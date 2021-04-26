import {MessageEmbed} from "discord.js";
import {CommandOptionType, SlashCommand} from "slash-create";
import CommandContext from "slash-create/lib/context";
import User from "../../Models/User/User";
import {guildId, isOneOfChannels} from "../../Util/Bot";
import {title} from "../../Util/Formatter";

export default class Inventory extends SlashCommand {
	constructor(creator) {
		super(creator, {
			guildIDs    : guildId,
			name        : 'inventory',
			description : 'Manage your inventory',
			options     : [
				{
					name        : 'list',
					description : 'List out the items in your inventory',
					type        : CommandOptionType.SUB_COMMAND
				}
			]
		});

		this.filePath = __filename;
	}

	async run(ctx: CommandContext) {
		if (!isOneOfChannels(ctx.channelID, 'activities')) {
			return 'You can only use /inventory commands in activities.';
		}

		const user = await User.getOrCreate(ctx.user.id);

		switch (ctx.subcommands[0]) {
			case 'list':
				return this.listInventory(ctx, user);
		}
	}

	async listInventory(ctx: CommandContext, user: User) {
		if (user.inventoryManager().isEmpty()) {
			return 'You have no items in your inventory.';
		}

		const embed = new MessageEmbed()
			.setColor(user.color)
			.setAuthor(user.displayName, user.getAvatar());

		for (const itemName in user.inventory) {
			const item = user.inventory[itemName];

			embed.addField(title(item.name), `x${item.amount}`);
		}

		return ctx.send({embeds : [embed]});
	}
}
