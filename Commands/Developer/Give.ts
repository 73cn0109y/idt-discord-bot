import {CommandOptionType, SlashCommand} from "slash-create";
import CommandContext from "slash-create/lib/context";
import {ItemName} from "../../Models/User/Inventory";
import Skills, {AvailableSkills, SkillName} from "../../Models/User/Skills";
import User from "../../Models/User/User";
import {guildId} from "../../Util/Bot";
import {formatMoney, InvalidNumberResponse, isValidNumber, numbroParse} from "../../Util/Formatter";
import {adminPermissionsForCommand, isAdmin} from "../../Util/Role";

export default class Give extends SlashCommand {
	constructor(creator) {
		super(creator, {
			deferEphemeral    : true,
			guildIDs          : guildId,
			name              : 'give',
			description       : 'Admin give command',
			defaultPermission : false,
			permissions       : adminPermissionsForCommand(),
			options           : [
				{
					name        : 'balance',
					description : 'Give balance to a user',
					type        : CommandOptionType.SUB_COMMAND,
					options     : [
						{
							name        : 'user',
							description : 'User to give balance to',
							type        : CommandOptionType.USER,
							required    : true,
						},
						{
							name        : 'amount',
							description : 'Amount to give',
							type        : CommandOptionType.STRING,
							required    : true,
						}
					]
				},
				{
					name        : 'level',
					description : 'Give a user a level',
					type        : CommandOptionType.SUB_COMMAND,
					options     : [
						{
							name        : 'user',
							description : 'User to give a level to',
							type        : CommandOptionType.USER,
							required    : true,
						},
						{
							name        : 'skill',
							description : 'Skill to set',
							type        : CommandOptionType.STRING,
							required    : true,
							choices     : Object.keys(AvailableSkills).map(
								key => ({name : AvailableSkills[key].title, value : key})
							)
						},
						{
							name        : 'level',
							description : 'Level to set',
							type        : CommandOptionType.STRING,
							required    : true,
						}
					]
				},
				{
					name        : 'item',
					description : 'Give a user a item',
					type        : CommandOptionType.SUB_COMMAND,
					options     : [
						{
							name        : 'user',
							description : 'User to give a level to',
							type        : CommandOptionType.USER,
							required    : true,
						},
						{
							name        : 'item',
							description : 'What item to give',
							type        : CommandOptionType.STRING,
							required    : true,
							choices     : Object.entries(ItemName).map(([name, value]) => ({name, value})
							)
						},
						{
							name        : 'amount',
							description : 'How many of the item to give (defaults to 1)',
							type        : CommandOptionType.INTEGER,
						}
					]
				},
			]
		});
		this.filePath = __filename;
	}

	async run(ctx: CommandContext) {
		if (!isAdmin(ctx.member)) {
			return "You cannot use this command";
		}

		switch (ctx.subcommands[0]) {
			case 'balance':
				return this.giveBalance(ctx);
			case 'level':
				return this.giveLevel(ctx);
			case 'item':
				return this.giveItem(ctx);
		}
	}

	async giveBalance(ctx: CommandContext) {
		const options = ctx.options.balance as IBalanceOptions;
		const valid   = isValidNumber(options.amount);

		if (valid !== InvalidNumberResponse.IS_VALID) {
			return valid;
		}

		const value = numbroParse(options.amount);
		const user  = await User.getOrCreate(options.user);

		await user.balanceManager().addToBalance(value, `Given money by ${ctx.user.username}`);
		await user.queryBuilder().update();

		return `Given ${formatMoney(options.amount)} to ${user.toString()}`;
	}

	private async giveLevel(ctx: CommandContext) {
		const setLevelOptions = ctx.options.level as { skill: SkillName, level: number };

		if (setLevelOptions.level > 99) {
			return 'Max level is 99.';
		}

		const user = await User.getOrCreate(ctx.members.first().id);
		const xp   = Skills.xpForLevel(setLevelOptions.level);


		user.queuedBuilder().set({
			[`skills.${setLevelOptions.skill}.xp`]    : xp,
			[`skills.${setLevelOptions.skill}.level`] : setLevelOptions.level,
		});
		await user.executeQueued();

		return `Successfully set ${user.toString()} to ${setLevelOptions.level} ${setLevelOptions.skill}`;
	}

	private async giveItem(ctx: CommandContext) {
		const options = ctx.options.item as unknown as IItemOptions;
		const user    = await User.getOrCreate(ctx.members.first().id);

		user.inventoryManager().addItem(options.item, options.amount ?? 1);

		await user.executeQueued();

		return `Added ${options.item} (x${options.amount ?? 1}) to ${user.toString()}`;
	}
}

export interface IBalanceOptions {
	user?: string;
	amount?: string;
}

export interface IItemOptions {
	user: string;
	item: ItemName;
	amount?: number;
}
