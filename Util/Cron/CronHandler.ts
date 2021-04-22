import {Log} from '@envuso/common';
import {collection} from '../../Models/ModelHelper';
import CronJob from './CronJob';
import path from 'path';

export interface ICron {
	handlerId: string;
	runEvery: string;
	lastRun: Date | null;
}

export default class CronHandler {
	private _jobs: CronJob[] = [];
	private _tick: NodeJS.Timeout;

	async boot() {
		await this.loadCrons();

		this._tick = setInterval(this.run.bind(this), 60 * 1000);
	}

	async register(jobClass: typeof CronJob) {
		const job     = new jobClass();
		const jobInfo = await collection<ICron>('crons').findOne({handlerId : job.handlerId});

		if (jobInfo) {
			job.handlerId = jobInfo.handlerId;
			job.runEvery  = jobInfo.runEvery;
			job.lastRun   = jobInfo.lastRun;

			this._jobs.push(job);

			return;
		}

		await collection<ICron>('crons').insertOne({
			handlerId : job.handlerId,
			runEvery  : job.runEvery,
			lastRun   : job.lastRun,
		});

		this._jobs.push(job);
	}

	run() {
		for (const job of this._jobs) {
			this.processJob(job)
				.then(() => Log.info('Processed job: ' + job.handlerId))
				.catch(error => {
					Log.error('Failed to process job: ' + job.handlerId);
					console.trace(error);
				});
		}
	}

	processJob(job: CronJob) {
		if (!job.canRun()) {
			return Promise.resolve();
		}

		return job.run();
	}

	private async loadCrons() {
		const cronJobs: { [key: string]: any } = require('require-all')({
			dirname   : path.join(__dirname, 'Jobs'),
			recursive : true,
			filter    : /^(.+)\.(j|t)s$/,
			resolve   : function (Handler) {
				return Handler.default;
			},
		});

		for (const name in cronJobs) {
			this.register(cronJobs[name])
				.then(() => Log.info('[CRON] Registered: ' + name))
				.catch(error => {
					Log.error('[CRON] Failed to register: ' + name);
					console.trace(error);
				});
		}
	}
}
