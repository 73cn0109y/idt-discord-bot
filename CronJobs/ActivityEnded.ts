import {Log} from "@envuso/common";
import {FilterQuery} from "mongodb";
import CronJob from "../Handlers/CronJob/CronJob";
import {ActivityName} from "../Models/User/Activities";
import User from "../Models/User/User";
import {illegalActivityChoices} from "../Commands/Activities/RunIllegalActivity";

export default class ActivityEnded extends CronJob {
	handlerId = 'activity-ended';
	runEvery  = '1m';

	public async run() {
		await super.run();

		const users = await User.get<User>(this.buildFilter());

		for (const user of users) {
			for (const activity of illegalActivityChoices) {
				const handler = user.activityManager().handlerForActivity(activity.value as ActivityName);
				const event   = handler.randomEventHit();

				if (handler.hasEnded()) {
					await handler.handleCompletion(user);

					Log.info(`Completed activity "${handler.name()}" for ${user.displayName}`);

					continue;
				}

				if (!event?.name) {
					continue;
				}

				Log.info(`Random event "${event.name}" for ${user.displayName}`);

				await handler.handleRandomEvent(user, event);
			}
		}
	}

	private buildFilter() {
		const filter: FilterQuery<User | { _id: any }> = {};

		for (const activity of illegalActivityChoices) {
			filter[`activities.${activity.value}`] = {
				$exists : 'endsAt',
			};
		}

		return filter;
	}
}
