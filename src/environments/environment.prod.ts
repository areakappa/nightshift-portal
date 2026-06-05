import { Settings } from '../app/models/settings';

export const environment: Settings = {
    production: true,
    api: 'https://nightshift.areakappa.it',
    name: 'NightShift Portal',
    companyLogo: 'assets/img/logo_aismartshifts.png',
    googleBilling: {
        enabled: false,
        revenueCatApiKeyAndroid: '',
        revenueCatApiKeyIOS: '',
        entitlementId: 'pro',
        offeringIdentifier: 'default',
        packageIdentifier: '$rc_monthly',
        productIdentifierAndroid: 'pro_monthly_1:p1m',
        productIdentifierIOS: 'pro_monthly_1',
        privacyPolicyUrl: 'https://nightshift.areakappa.it/privacy',
        termsOfUseUrl: 'https://nightshift.areakappa.it/terms',
        proMonthlyPriceLabel: '29,99 EUR/mese',
        proSubscriptionLengthLabel: '1 mese (rinnovo automatico)'
    }
};
