import ms from "ms";
import {collection} from "../../Models/ModelHelper";
import {HeistInstance, HeistTarget} from "./HeistInstance";
import {BankHeist} from "./Targets/BankHeist";
import {HouseRobbery} from "./Targets/HouseRobbery";

export class HeistManager {
	private static _instance: HeistInstance;
	private static timeBetweenHeists = '1h';

	static readonly heistLevels: typeof HeistTarget[] = [
		HouseRobbery,
		BankHeist,
	];

	static instance() {
		if (!this._instance) {
			this._instance = new HeistInstance();
		}

		return this._instance;
	}

	static hasInstance() {
		return !!this._instance;
	}

	static destroyInstance() {
		this._instance = undefined;
	}

	static async canStartHeist() {
		const lastHeist = await collection('heists').findOne({
			endedAt : {
				$lte : new Date(Date.now() - ms(this.timeBetweenHeists)),
			},
		}, {
			sort : {
				createdAt : -1,
			},
		});

		return !lastHeist;
	}
}
