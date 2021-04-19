import {ClientEvents, GuildMember, PartialGuildMember, Presence} from "discord.js";
import User from "../Models/User/User";
import BaseEventHandler, {ClientEventsTypes} from "./BaseEventHandler";

const ClientEvent = ClientEventsTypes.GUILD_MEMBER_PRESENCE_UPDATE;

type ClientEventType = typeof ClientEvent;
type ClientEventsType = ClientEvents[ClientEventType];

export default class GuildMemberPresenceUpdated extends BaseEventHandler<ClientEventType> {

	async handle(oldPresence : Presence, presence: Presence) {


	}

	getEventName(): ClientEventType {
		return ClientEvent;
	}

}
