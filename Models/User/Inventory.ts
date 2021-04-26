import NumberInput from "../../Util/NumberInput";
import User from "./User";

export default class Inventory {
	constructor(private user: User) {}

	public hasItem(name: ItemName): boolean {
		const item = this.getItem(name);

		return item?.amount > 0;
	}

	public getItem(name: ItemName): IItem {
		return this.user.inventory[name];
	}

	public isEmpty(): boolean {
		for (const item in this.user.inventory) {
			if (this.user.inventory[item].amount > 0) {
				return false;
			}
		}

		return true;
	}

	public addItem(name: ItemName, amount: number = 1) {
		const existingItem = this.getItem(name);

		if (!existingItem) {
			this.user.queuedBuilder()
				.set({
					[`inventory.${name}`] : {
						name,
						amount
					}
				});
		} else {
			this.user.queuedBuilder()
				.increment(`inventory.${name}.amount`, String(amount));
		}
	}

	public removeItem(name: ItemName, amount?: number) {
		const existingItem = this.getItem(name);

		if (!existingItem) {
			return;
		}

		if (amount !== undefined) {
			const itemAmount = NumberInput.someFuckingValueToInt(existingItem.amount);

			// Just subtract x amount
			if (itemAmount - amount > 0) {
				this.user.queuedBuilder()
					.decrement(`inventory.${name}.amount`, String(amount));

				return;
			}
		}

		// Amount would be <= 0 so just force it to 0
		this.user.queuedBuilder()
			.set({
				[`inventory.${name}.amount`] : 0
			});
	}
}

export enum ItemName {
	CANNABIS = 'cannabis'
}

export type IInventory = {
	[key: string]: IItem
};

export interface IItem {
	name: ItemName;
	amount: number;
}
