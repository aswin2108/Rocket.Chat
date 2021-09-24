import { Meteor } from 'meteor/meteor';
import _ from 'underscore';

import { LDAPEE } from '../sdk';
import { settings, SettingsVersion4 } from '../../../app/settings/server';
import { logger } from '../../../server/lib/ldap/Logger';
import { cronJobs } from '../../../app/utils/server/lib/cron/Cronjobs';
import { LDAPEEManager } from '../lib/ldap/Manager';
import { callbacks } from '../../../app/callbacks/server';
import type { IImportUser } from '../../../definition/IImportUser';
import type { ILDAPEntry } from '../../../definition/ldap/ILDAPEntry';
import { onLicense } from '../../app/license/server';
import { addSettings } from '../settings/ldap';

Meteor.startup(() => onLicense('ldap-enterprise', () => {
	addSettings();

	// Configure background sync cronjob
	function configureBackgroundSync(jobName: string, enableSetting: string, intervalSetting: string, cb: () => {}): () => void {
		let lastSchedule: string;

		return _.debounce(Meteor.bindEnvironment(function addCronJobDebounced() {
			if (settings.get('LDAP_Enable') !== true || settings.get(enableSetting) !== true) {
				if (cronJobs.nextScheduledAtDate(jobName)) {
					logger.info({ msg: 'Disabling LDAP Background Sync', jobName });
					cronJobs.remove(jobName);
				}
				return;
			}

			const schedule = settings.get<string>(intervalSetting);
			if (schedule) {
				if (schedule !== lastSchedule && cronJobs.nextScheduledAtDate(jobName)) {
					cronJobs.remove(jobName);
				}

				lastSchedule = schedule;
				logger.info({ msg: 'Enabling LDAP Background Sync', jobName });
				cronJobs.add(jobName, schedule, () => cb(), 'text');
			}
		}), 500);
	}

	const addCronJob = configureBackgroundSync('LDAP_Sync', 'LDAP_Background_Sync', 'LDAP_Background_Sync_Interval', () => LDAPEE.sync());
	const addAvatarCronJob = configureBackgroundSync('LDAP_AvatarSync', 'LDAP_Background_Sync_Avatars', 'LDAP_Background_Sync_Avatars_Interval', () => LDAPEE.syncAvatars());
	const addLogoutCronJob = configureBackgroundSync('LDAP_AutoLogout', 'LDAP_Sync_AutoLogout_Enabled', 'LDAP_Sync_AutoLogout_Interval', () => LDAPEE.syncLogout());


	SettingsVersion4.watchMultiple(['LDAP_Background_Sync', 'LDAP_Background_Sync_Interval'], addCronJob);
	SettingsVersion4.watchMultiple(['LDAP_Background_Sync_Avatars', 'LDAP_Background_Sync_Avatars_Interval'], addAvatarCronJob);
	SettingsVersion4.watchMultiple(['LDAP_Sync_AutoLogout_Enabled', 'LDAP_Sync_AutoLogout_Interval'], addLogoutCronJob);

	SettingsVersion4.watch('LDAP_Enable', () => {
		addCronJob();
		addAvatarCronJob();
		addLogoutCronJob();
	});

	SettingsVersion4.watch('LDAP_Groups_To_Rocket_Chat_Teams', (value) => {
		try {
			LDAPEEManager.validateLDAPTeamsMappingChanges(value as string);
		} catch (error) {
			logger.error(error);
		}
	});

	callbacks.add('mapLDAPUserData', (userData: IImportUser, ldapUser: ILDAPEntry) => {
		LDAPEEManager.copyCustomFields(ldapUser, userData);
		LDAPEEManager.copyActiveState(ldapUser, userData);
	}, callbacks.priority.MEDIUM, 'mapLDAPCustomFields');
}));