import {Log} from "@envuso/common";
import {ColorResolvable, Message, MessageEmbed} from "discord.js";
import ms from "ms";
import Heist from "../../Models/Heist/Heist";
import {UserInstance} from "../../Models/User/UserInstance";
import {getChannel} from "../../Util/Bot";
import {formatMoney, numbro, Numbro} from "../../Util/Formatter";
import {HeistManager} from "./HeistManager";

export enum HeistState {
	INIT,
	SETUP,
	RUNNING,
	ENDED
}

export enum HeistType {
	HOUSE_ROBBERY = 'house-robbery',
	BANK_HEIST    = 'bank-heist',
}

export interface IHeistConfig {
	readonly title: string;
	readonly description: string;
	readonly color: ColorResolvable;
	// How long to wait until the Heist starts
	readonly setupDuration: string;
	// How long the Heist runs for
	readonly runDuration: string;
	// Minimum amount a member needs to join
	readonly minimumBuyin: number;
	// Minumum total amount to upgrade to this Heist
	readonly upgradeCost: number;
}

export class HeistTarget {
	static readonly type: HeistType;
	static readonly config: IHeistConfig;

	public config() {
		return (<typeof HeistTarget>this.constructor).config;
	}
}

export class HeistInstance {
	private _target: HeistTarget;
	private _state: HeistState             = HeistState.INIT;
	private _record: Heist;
	// Timers
	private readonly _tick: NodeJS.Timer;
	private readonly _tickInterval: number = 2_000;
	private _setupCounter: number;
	private _setupTimer: NodeJS.Timer;
	// Discord
	private _message: Message;
	private _embed: MessageEmbed;

	constructor() {
		this._record = new Heist();
		this._tick   = setInterval(this.onSetupTick.bind(this), this._tickInterval);

		Log.info(`[Heist] A new heist has started`);
	}

	/*
	 State
	 */

	private async onSetupTick() {
		if (this._state !== HeistState.SETUP) {
			clearInterval(this._tick);
			return;
		}

		this._setupCounter -= this._tickInterval;

		if (this._setupCounter <= 0) {
			return this.start();
		}

		await this.updateMessage();
	}

	public async start() {
		if (this._state !== HeistState.SETUP) {
			return;
		}

		clearInterval(this._tick);

		this._state = HeistState.RUNNING;

		await this.updateMessage();

		Log.info(`[Heist] ${this._target.config().title} has begun`);
	}

	public async end() {
		this._state = HeistState.ENDED;

		// Just in case it's force ended before it started
		clearInterval(this._tick);

		HeistManager.destroyInstance();

		Log.info(`[Heist] ${this._target.config().title} has ended`);
	}

	private resetSetupTimer() {
		clearTimeout(this._setupTimer);

		if (this._state !== HeistState.INIT && this._state !== HeistState.SETUP) {
			return false;
		}

		this._setupCounter = ms(this._target.config().setupDuration);
	}

	/*
	 User
	 */

	public async join(user: UserInstance, amount: number) {
		if (this._state === HeistState.RUNNING) {
			return 'The Heist has already started.';
		}

		if (this._state === HeistState.ENDED) {
			return 'The Heist has already ended.';
		}

		const joinError = this.canJoin(user, amount);

		if (joinError) {
			return joinError;
		}

		const alreadyJoined = this._record.hasParticipant(user.id);

		await this._record.addParticipant(user, amount);

		if (this._state === HeistState.INIT) {
			await this.chooseTarget();
			await this.sendMessage();

			this._state = HeistState.SETUP;
		} else if (!await this.tryUpgradeTarget()) {
			// Check if tryUpgradeTarget failed so we don't reset the timer twice
			this.resetSetupTimer();
		}

		return alreadyJoined ? 'Contribution updated.' : 'Welcome to the Heist!';
	}

	/*
	 Message
	 */

	public async sendMessage() {
		if (this._message) {
			Log.warn('[Heist] Calling `sendMessage` multiple times is not allowed!');
			return;
		}

		this._message = await getChannel('gambling').send(this.createEmbed());
	}

	private createEmbed() {
		this._embed = new MessageEmbed()
			.setTitle(this._target.config().title)
			.setDescription(this._target.config().description)
			.setColor(this._target.config().color)
			.addField('Minimum Buyin', formatMoney(this._target.config().minimumBuyin), true)
			.addField('Total Contributed', formatMoney(this.getTotalBuyin()), true);

		switch (this._state) {
			case HeistState.INIT:
			case HeistState.SETUP:
				this._embed.addField('Starting In', ms(this._setupCounter, {long : true}));
				break;
			case HeistState.RUNNING:
				this._embed.addField('Status', 'In Progress');
				break;
			case HeistState.ENDED:
				this._embed.addField('Status', 'Completed');
				break;
		}

		// -- Next Target
		const nextTarget = this.getNextTarget();

		if (nextTarget !== undefined) {
			this._embed.addField(
				'Next Target',
				`${nextTarget.config.title} - ${formatMoney(this.getBuyinToHeistTarget(nextTarget))}`,
				true,
			);
		}
		// -- /Next Target

		// -- Members
		let members = '';

		for (const userId in this._record.participants) {
			const member = this._record.participants[userId];

			members += `- <@!${userId}> | ${formatMoney(member.totalContributed)}\n`;
		}

		this._embed.addField('Members', members || 'No Participants');
		// -- /Members

		return this._embed;
	}

	private updateMessage() {
		if (!this._message) {
			return;
		}

		return this._message.edit(this.createEmbed());
	}

	/*
	 Target
	 */

	private async setTarget(target: typeof HeistTarget) {
		this._target       = new target();
		this._record.heist = target.type;

		await this._record.save();

		this.resetSetupTimer();
	}

	private async chooseTarget() {
		if (this._target) {
			Log.warn('[Heist] Trying to choose target when one is already chosen!');
			return;
		}

		const totalBuyin = this.getTotalBuyin();
		let nextTarget   = HeistManager.heistLevels[0];

		for (const target of HeistManager.heistLevels) {
			if (target.config.upgradeCost > totalBuyin) {
				break;
			}

			nextTarget = target;
		}

		await this.setTarget(nextTarget);
	}

	private tryUpgradeTarget() {
		const totalBuyin = this.getTotalBuyin();
		const nextTarget = this.getNextTarget();

		if (nextTarget === undefined) {
			return false;
		}

		if (totalBuyin < this.getBuyinToHeistTarget(nextTarget)) {
			return false;
		}

		return this.upgradeTarget(nextTarget);
	}

	private async upgradeTarget(target: typeof HeistTarget) {
		if (this._target instanceof target) {
			Log.warn('[Heist] Trying to upgrade to the same target!');

			return false;
		}

		await this.setTarget(target);

		const nextTarget = this.getNextTarget();
		let message      = `We're aiming for a ${target.config.title} now!`;

		if (nextTarget !== undefined) {
			message += ` Contribute another ${formatMoney(this.getBuyinToHeistTarget(nextTarget))} to upgrade to ${nextTarget.config.title}.`;
		}

		await getChannel('gambling').send(message);

		return true;
	}

	private getNextTarget() {
		if (!this._target) {
			return HeistManager.heistLevels[0];
		}

		for (let i = 0; i < HeistManager.heistLevels.length; i++) {
			if (this._target instanceof HeistManager.heistLevels[i]) {
				return HeistManager.heistLevels[i + 1];
			}
		}
	}

	private getBuyinToHeistTarget(target: typeof HeistTarget) {
		const totalBuyin = this.getTotalBuyin();

		return Math.max(0, target.config.minimumBuyin - totalBuyin);
	}

	/*
	 Misc
	 */

	public getTotalBuyin() {
		const totalBuyin = numbro(0);

		for (const userId in this._record.participants) {
			totalBuyin.add(
				numbro(this._record.participants[userId].totalContributed).value(),
			);
		}

		return totalBuyin.value();
	}

	public canJoin(user: UserInstance, amount: number) {
		const participant      = this._record.participants[user.id];
		const totalContributed = numbro(participant?.totalContributed ?? 0).add(amount).value();
		const targetConfig     = this._target?.config() ?? this.getNextTarget().config;

		if (totalContributed < targetConfig.minimumBuyin) {
			return `The minimum buyin for the Heist is ${formatMoney(targetConfig.minimumBuyin)}!`;
		}
	}
}
