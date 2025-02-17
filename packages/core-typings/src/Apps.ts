import type { AppStatus } from '@rocket.chat/apps-engine/definition/AppStatus';

export type AppScreenshot = {
	id: string;
	appId: string;
	fileName: string;
	accessUrl: string;
	thumbnailUrl: string;
	createdAt: string;
	modifiedAt: string;
};

export type AppTiers = {
	perUnit: boolean;
	minimum: number;
	maximum: number;
	price: number;
};

export type AppPricingPlan = {
	id: string;
	enabled: boolean;
	price: number;
	trialDays: number;
	strategy: string;
	isPerSeat: boolean;
	tiers?: AppTiers[];
};

export type AppLicense = {
	license: string;
	version: number;
	expireDate: string;
};

export enum AppSubscriptionStatus {
	Trialing = 'trialing',
	Active = 'active',
	Cancelled = 'cancelled',
	Cancelling = 'cancelling',
	PastDue = 'pastDue',
}

export type AppSubscriptionInfo = {
	typeOf: string;
	status: AppSubscriptionStatus;
	statusFromBilling: boolean;
	isSeatBased: boolean;
	seats: number;
	maxSeats: number;
	license: AppLicense;
	startDate: string;
	periodEnd: string;
	endDate: string;
	isSubscribedViaBundle: boolean;
};

export type AppPermission = {
	name: string;
};

export type App = {
	id: string;
	iconFileData: string;
	name: string;
	author: {
		name: string;
		homepage: string;
		support: string;
	};
	description: string;
	privacyPolicySummary: string;
	detailedDescription: {
		raw: string;
		rendered: string;
	};
	detailedChangelog: {
		raw: string;
		rendered: string;
	};
	categories: string[];
	version: string;
	price: number;
	purchaseType: string;
	pricingPlans: AppPricingPlan[];
	iconFileContent: string;
	installed?: boolean;
	isEnterpriseOnly?: boolean;
	isPurchased?: boolean;
	isSubscribed: boolean;
	bundledIn: {
		bundleId: string;
		bundleName: string;
		apps: App[];
		addonTierId?: string;
	}[];
	marketplaceVersion: string;
	latest: App;
	status?: AppStatus;
	subscriptionInfo: AppSubscriptionInfo;
	licenseValidation?: {
		errors: { [key: string]: string };
		warnings: { [key: string]: string };
	};
	tosLink: string;
	privacyLink: string;
	marketplace: unknown;
	modifiedAt: string;
	permissions: AppPermission[];
	languages: string[];
};
