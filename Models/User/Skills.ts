import {Log} from "@envuso/common";
import {ColorResolvable} from "discord.js";
import {guild} from "../../Util/Bot";
import User from "./User";


export interface ISkill {
	level: number;
	xp: number;
}

interface SkillInformation {
	title: string;
	color: ColorResolvable;
}

export const AvailableSkills = {
	chatting  : {
		title : 'Chatting',
		color : 'BLURPLE'
	},
	investing : {
		title : 'Investing',
		color : "GREEN"
	},
	gambling  : {
		title : 'Gambling',
		color : "GOLD"
	},
	hacking   : {
		title : 'Hacking',
		color : "NOT_QUITE_BLACK"
	},
};

export type SkillName = keyof (typeof AvailableSkills);

export default class Skills {

	constructor(private user: User) {}

	/**
	 * Get the level for a specified amount of xp
	 *
	 * @param exp
	 * @returns {number}
	 */
	static levelForXp(exp: number) {
		let points = 0;
		let output = 0;
		for (let lvl = 1; lvl <= 100; lvl++) {
			points += Math.floor(lvl + 100.0 * Math.pow(2.0, lvl / 7.0));
			output = Math.floor(points / 2);

			if ((output - 1) >= exp) {
				return lvl;
			}
		}
		return 99;
	}

	/**
	 * Get the xp required for a specific level
	 *
	 * @param level
	 * @returns {number}
	 */
	static xpForLevel(level: number) {
		let points = 0;
		let output = 0;
		for (let lvl = 1; lvl <= level; lvl++) {
			points += Math.floor(lvl + 100.0 * Math.pow(2.0, lvl / 7.0));
			if (lvl >= level) {
				return output;
			}
			output = Math.floor(points / 2);
		}
		return 0;
	}

	/**
	 *
	 * @param {SkillName} skill
	 * @param {number} xp
	 * @param forceSave
	 * @returns {Promise<void>}
	 */
	async addXp(skill: SkillName, xp: number, forceSave = true) {
		const originalLevel = Skills.levelForXp(this.user.skills[skill].xp);
		const newLevel      = Skills.levelForXp(this.user.skills[skill].xp + xp);

		const member = guild().members.cache.get(this.user.id);

		if (newLevel > originalLevel && this.user.preference('botDmMessages') && !member.user.bot) {
			try {
				const dm = await member.createDM();
				await dm.send(`You have leveled up ${AvailableSkills[skill].title}. You are now level ${newLevel}\n**You can disable these messages with the command /preferences settings**`);
			} catch (error) {
				Log.error('Cannot dm user: ' + member.displayName + ' from add xp method. ' + error.toString());
			}
		}

		this.user.skills[skill].xp += xp;
		this.user.skills[skill].level = newLevel;

		if (forceSave) {
			await this.user.queryBuilder()
				.where({_id : this.user._id})
				.update({
					$set : {
						[`skills.${skill}.xp`]    : this.user.skills[skill].xp + xp,
						[`skills.${skill}.level`] : newLevel
					}
				});
		}

		// if (forceSave)
		// 	await this.user.save();
	}


	has(level: number, skill: SkillName) {
		return this.user.skills[skill].level >= level;
	}

}
