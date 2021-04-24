import {MessageEmbed, TextChannel} from "discord.js";
import {CommandOptionType, SlashCommand} from "slash-create";
import CommandContext from "slash-create/lib/context";
import User from "../../Models/User/User";
import {getChannel, guild, guildId} from "../../Util/Bot";
import {formatMoney, InvalidNumberResponse, isValidNumber, numbroParse} from "../../Util/Formatter";
import NumberInput from "../../Util/NumberInput";

export default class Balance extends SlashCommand {

	constructor(creator) {
		super(creator, {
			deferEphemeral : true,
			guildIDs       : guildId,
			name           : 'balance',
			description    : 'Manage your balance',
			options        : [
				{
					name        : 'get',
					description : 'Get your balance',
					type        : CommandOptionType.SUB_COMMAND,
				},
				{
					name        : 'user',
					description : 'Get a users balance',
					type        : CommandOptionType.SUB_COMMAND,
					options     : [
						{
							name        : 'user',
							required    : true,
							description : 'The user to get the balance of',
							type        : CommandOptionType.USER,
						}
					]
				},
				{
					name        : 'gift',
					description : 'Gift some of your balance to another user',
					type        : CommandOptionType.SUB_COMMAND,
					options     : [
						{
							name        : 'user',
							description : 'The user to gift some balance too',
							required    : true,
							type        : CommandOptionType.USER,
						},
						{
							name        : 'amount',
							description : 'The amount to gift the user',
							required    : true,
							type        : CommandOptionType.STRING
						}
					]
				},
				{
					name        : 'history',
					description : 'See the balance change history for yourself or another user',
					type        : CommandOptionType.SUB_COMMAND,
					options     : [
						{
							name        : 'user',
							description : 'If you want to see another users history ',
							required    : false,
							type        : CommandOptionType.USER,
						}
					]
				},
			]
		});
		this.filePath = __filename;
	}


	async run(ctx: CommandContext) {
		const gambleChannel = getChannel('gambling');

		if (ctx.channelID !== gambleChannel?.id) {
			return `You can only use /balance commands in the ${gambleChannel.toString()} channel.`;
		}

		if (ctx.subcommands.includes('get')) {
			const user = await User.getOrCreate(ctx.user.id);

			return await this.handleBalanceOutput(ctx, user);
		}

		if (ctx.subcommands.includes('user')) {

			const userObj = ctx.options.user as { user: string };

			const user = await User.getOrCreate(userObj.user);

			return await this.handleBalanceOutput(ctx, user);
		}

		if (ctx.subcommands.includes('gift')) {
			const options = ctx.options.gift as { user: string; amount: string; };

			const otherUser   = await User.getOrCreate(options.user);
			const currentUser = await User.getOrCreate(ctx.user.id);

			return await this.handleGiftBalance(ctx, options.amount, currentUser, otherUser);
		}

		if (ctx.subcommands.includes('history')) {
			const options = ctx.options.history as { user?: string; };

			return await this.handleHistory(ctx, options.user);
		}


		return "You need to use one of the sub commands. /balance gift, /balance user or /balance get";
	}

	private async handleBalanceOutput(ctx: CommandContext, user: User) {
		const channel = guild().channels.cache.get(ctx.channelID) as TextChannel;

		const embed = new MessageEmbed()
			.setColor('BLUE')
			.setAuthor(user.username, user.avatar, "")
			.addField('Balance:', formatMoney(user.balances.balance), true)
			.addField('Invested:', formatMoney(user.balances.invested), true)
			.addField('Income:', user.balanceManager().income(true), true);

		await ctx.send({embeds : [embed]});
	}

	private async handleGiftBalance(ctx: CommandContext, amount: string, currentUser: User, otherUser: User) {

		const isValid = isValidNumber(amount, currentUser.balanceManager());

		if (isValid !== InvalidNumberResponse.IS_VALID) {
			return isValid;
		}

		const input = new NumberInput(amount, currentUser).parse();

		if (!input.isValid()) {
			return input.error();
		}


		currentUser.balanceManager().deductFromBalance(input.value(), `Gifted money to ${otherUser.username}`);
		await currentUser.executeQueued();

		otherUser.balanceManager().addToBalance(input.value(), `Gifted by ${currentUser.username}`);
		await otherUser.executeQueued();


		return `You gave ${otherUser.toString()} ${formatMoney(amount)}`;
	}

	private async handleHistory(ctx: CommandContext, otherUserId?: string) {
		const user = await User.getOrCreate(otherUserId ? otherUserId : ctx.user.id);

		if (!user) {
			return "Cannot find user...";
		}

		const embed = new MessageEmbed()
			.setColor('BLUE')
			.setAuthor(user.username, user.avatar, "");

		if (!Array.isArray(user.balanceHistory) || user.balanceHistory.length === 0) {
			embed.addField('No Balance History', 'Start gambling bich...');
		} else {
			const balanceHistory = user.balanceHistory.slice(-10);

			for (let i = 0; i < balanceHistory.length; i++) {
				const history = balanceHistory[i];

				const typeOfChange = history.typeOfChange === 'added' ? 'to' : 'from';
				embed.addField(
					`#${user.balanceHistory.length - (balanceHistory.length - i - 1)} - ${history.typeOfChange} ${formatMoney(history.amount)} ${typeOfChange} ${history.balanceType}`,
					history.reason
				);
			}
		}

		await ctx.send({embeds : [embed]});
	}
}
