import { RoomType } from '@rocket.chat/apps-engine/definition/rooms';

import {
	FederationRoomChangeJoinRulesDto,
	FederationRoomChangeMembershipDto,
	FederationRoomChangeNameDto,
	FederationRoomChangeTopicDto,
	FederationRoomCreateInputDto,
	FederationRoomSendInternalMessageDto,
} from '../../../application/input/RoomReceiverDto';
import { EVENT_ORIGIN } from '../../../domain/IFederationBridge';
import { IMatrixEvent } from '../definitions/IMatrixEvent';
import { AddMemberToRoomMembership } from '../definitions/IMatrixEventContent/IMatrixEventContentAddMemberToRoom';
import { RoomJoinRules } from '../definitions/IMatrixEventContent/IMatrixEventContentSetRoomJoinRules';
import { MatrixEventType } from '../definitions/MatrixEventType';

export class MatrixRoomReceiverConverter {
	public static toRoomCreateDto(externalEvent: IMatrixEvent<MatrixEventType.ROOM_CREATED>): FederationRoomCreateInputDto {
		return Object.assign(new FederationRoomCreateInputDto(), {
			...MatrixRoomReceiverConverter.getBasicRoomsFields(externalEvent.room_id),
			...MatrixRoomReceiverConverter.tryToGetExternalInfoFromTheRoomState(
				externalEvent.invite_room_state || externalEvent.unsigned?.invite_room_state,
			),
			externalInviterId: externalEvent.sender,
			normalizedInviterId: MatrixRoomReceiverConverter.convertMatrixUserIdFormatToRCFormat(externalEvent.sender),
			wasInternallyProgramaticallyCreated: externalEvent.content?.was_internally_programatically_created || false,
		});
	}

	public static toChangeRoomMembershipDto(
		externalEvent: IMatrixEvent<MatrixEventType.ROOM_MEMBERSHIP_CHANGED>,
	): FederationRoomChangeMembershipDto {
		return Object.assign(new FederationRoomChangeMembershipDto(), {
			...MatrixRoomReceiverConverter.getBasicRoomsFields(externalEvent.room_id),
			...MatrixRoomReceiverConverter.tryToGetExternalInfoFromTheRoomState(
				externalEvent.invite_room_state || externalEvent.unsigned?.invite_room_state,
				externalEvent.content?.is_direct,
			),
			externalInviterId: externalEvent.sender,
			normalizedInviterId: MatrixRoomReceiverConverter.convertMatrixUserIdFormatToRCFormat(externalEvent.sender),
			externalInviteeId: externalEvent.state_key,
			normalizedInviteeId: MatrixRoomReceiverConverter.convertMatrixUserIdFormatToRCFormat(externalEvent.state_key),
			inviteeUsernameOnly: MatrixRoomReceiverConverter.formatMatrixUserIdToRCUsernameFormat(externalEvent.state_key),
			inviterUsernameOnly: MatrixRoomReceiverConverter.formatMatrixUserIdToRCUsernameFormat(externalEvent.sender),
			eventOrigin: MatrixRoomReceiverConverter.getEventOrigin(externalEvent.sender, externalEvent.state_key),
			leave: externalEvent.content?.membership === AddMemberToRoomMembership.LEAVE,
		});
	}

	public static toSendRoomMessageDto(externalEvent: IMatrixEvent<MatrixEventType.ROOM_MESSAGE_SENT>): FederationRoomSendInternalMessageDto {
		return Object.assign(new FederationRoomSendInternalMessageDto(), {
			...MatrixRoomReceiverConverter.getBasicRoomsFields(externalEvent.room_id),
			externalSenderId: externalEvent.sender,
			normalizedSenderId: MatrixRoomReceiverConverter.convertMatrixUserIdFormatToRCFormat(externalEvent.sender),
			text: externalEvent.content?.body,
		});
	}

	public static toRoomChangeJoinRulesDto(
		externalEvent: IMatrixEvent<MatrixEventType.ROOM_JOIN_RULES_CHANGED>,
	): FederationRoomChangeJoinRulesDto {
		return Object.assign(new FederationRoomChangeJoinRulesDto(), {
			...MatrixRoomReceiverConverter.getBasicRoomsFields(externalEvent.room_id),
			roomType: MatrixRoomReceiverConverter.convertMatrixJoinRuleToRCRoomType(externalEvent.content?.join_rule),
		});
	}

	public static toRoomChangeNameDto(externalEvent: IMatrixEvent<MatrixEventType.ROOM_NAME_CHANGED>): FederationRoomChangeNameDto {
		return Object.assign(new FederationRoomChangeNameDto(), {
			...MatrixRoomReceiverConverter.getBasicRoomsFields(externalEvent.room_id),
			normalizedRoomName: MatrixRoomReceiverConverter.normalizeRoomNameToRCFormat(externalEvent.content?.name),
		});
	}

	public static toRoomChangeTopicDto(externalEvent: IMatrixEvent<MatrixEventType.ROOM_TOPIC_CHANGED>): FederationRoomChangeTopicDto {
		return Object.assign(new FederationRoomChangeTopicDto(), {
			...MatrixRoomReceiverConverter.getBasicRoomsFields(externalEvent.room_id),
			roomTopic: externalEvent.content?.topic,
		});
	}

	private static convertMatrixUserIdFormatToRCFormat(matrixUserId = ''): string {
		return matrixUserId.replace('@', '');
	}

	private static convertMatrixRoomIdFormatToRCFormat(matrixRoomId = ''): string {
		const prefixedRoomIdOnly = matrixRoomId.split(':')[0];
		const prefix = '!';

		return prefixedRoomIdOnly?.replace(prefix, '');
	}

	private static normalizeRoomNameToRCFormat(matrixRoomName = ''): string {
		return matrixRoomName.replace('@', '');
	}

	private static formatMatrixUserIdToRCUsernameFormat(matrixUserId = ''): string {
		return matrixUserId.split(':')[0]?.replace('@', '');
	}

	private static getEventOrigin(inviterId = '', inviteeId = ''): EVENT_ORIGIN {
		const fromADifferentServer =
			MatrixRoomReceiverConverter.extractServerNameFromMatrixUserId(inviterId) !==
			MatrixRoomReceiverConverter.extractServerNameFromMatrixUserId(inviteeId);

		return fromADifferentServer ? EVENT_ORIGIN.REMOTE : EVENT_ORIGIN.LOCAL;
	}

	private static extractServerNameFromMatrixUserId(matrixUserId = ''): string {
		const splitted = matrixUserId.split(':');

		return splitted.length > 1 ? splitted[1] : '';
	}

	private static getBasicRoomsFields(externalRoomId: string): Record<string, string> {
		return {
			externalRoomId,
			normalizedRoomId: MatrixRoomReceiverConverter.convertMatrixRoomIdFormatToRCFormat(externalRoomId),
		};
	}

	private static convertMatrixJoinRuleToRCRoomType(matrixJoinRule: RoomJoinRules, matrixRoomIsDirect = false): RoomType {
		const mapping: Record<string, RoomType> = {
			[RoomJoinRules.JOIN]: RoomType.CHANNEL,
			[RoomJoinRules.INVITE]: RoomType.PRIVATE_GROUP,
		};
		const roomType = mapping[matrixJoinRule] || RoomType.CHANNEL;

		return roomType === RoomType.PRIVATE_GROUP && matrixRoomIsDirect ? RoomType.DIRECT_MESSAGE : roomType;
	}

	private static tryToGetExternalInfoFromTheRoomState(
		roomState: Record<string, any>[] = [],
		matrixRoomIsDirect = false,
	): Record<string, string> {
		if (roomState.length === 0) {
			return {};
		}
		const externalRoomName = roomState.find((stateEvent: Record<string, any>) => stateEvent.type === MatrixEventType.ROOM_NAME_CHANGED)
			?.content?.name;
		const externalRoomJoinRule = roomState.find(
			(stateEvent: Record<string, any>) => stateEvent.type === MatrixEventType.ROOM_JOIN_RULES_CHANGED,
		)?.content?.join_rule;

		return {
			...(externalRoomName ? { externalRoomName } : {}),
			...(externalRoomJoinRule
				? { roomType: MatrixRoomReceiverConverter.convertMatrixJoinRuleToRCRoomType(externalRoomJoinRule, matrixRoomIsDirect) }
				: {}),
		};
	}
}
