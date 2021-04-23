import {FilterQuery, ObjectId, UpdateOneOptions, UpdateQuery} from "mongodb";
import {HeistType} from "../../Managers/Heist/HeistInstance";
import {collection} from "../ModelHelper";
import Heist from "./Heist";

export interface IHeistParticipant {
	userId: ObjectId;
	totalContributed: string;
}

export interface IHeist {
	_id?: ObjectId;
	participants: { [key: string]: IHeistParticipant };
	heist: HeistType;
	createdAt?: Date;
	updatedAt?: Date;
	endedAt?: Date;
}

export class HeistModel implements IHeist {
	_id?: ObjectId;
	participants: { [key: string]: IHeistParticipant };
	heist: HeistType;
	createdAt?: Date;
	updatedAt?: Date;
	endedAt?: Date;

	constructor(attributes?: IHeist) {
		Object.assign(this, attributes);

		if (!this.participants) {
			this.participants = {};
		}
	}

	static collection() {
		return collection<IHeist>('heists');
	}

	static async find(filter: FilterQuery<IHeist>): Promise<Heist[]> {
		const cursor  = this.collection().find(filter);
		const records = [];

		while (await cursor.hasNext()) {
			const record = await cursor.next();

			records.push(new Heist(record));
		}

		return records;
	}

	static async findOne(filter: FilterQuery<IHeist>): Promise<Heist> {
		const record = await this.collection().findOne(filter);

		if (!record) {
			return null;
		}

		return new Heist(record);
	}

	static async create(data: IHeist) {
		data.createdAt = new Date();
		data.updatedAt = new Date();

		const {insertedId} = await this.collection().insertOne(data);

		return this.findOne({_id : insertedId});
	}

	static async update(filter: FilterQuery<IHeist>, values: UpdateQuery<IHeist> | Partial<IHeist>, options?: UpdateOneOptions) {
		delete (values as any).updatedAt;
		delete (values as any).createdAt;

		values = {
			$set         : values,
			$currentDate : {
				updatedAt : true,
			},
		};

		await this.collection().updateOne(filter, values, options);

		return this.findOne(filter);
	}

	async save() {
		const values = Object.assign({}, this);
		let updatedRecord;

		if (!this._id) {
			updatedRecord = await HeistModel.create(values);
		} else {
			updatedRecord = await HeistModel.update({_id : this._id}, values, {upsert : true});
		}

		// #hacky
		Object.assign(this, updatedRecord);

		return this;
	}
}

export default HeistModel;
