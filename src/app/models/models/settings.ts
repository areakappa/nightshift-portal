export interface Settings {
    production: boolean;
    api: string;
    name: string;
    companyLogo: string;
    googleMapsApiKey?: string;
    googleBilling?: {
        enabled: boolean;
        revenueCatApiKeyAndroid?: string;
        revenueCatApiKeyIOS?: string;
        entitlementId?: string;
        offeringIdentifier?: string;
        packageIdentifier?: string;
        productIdentifierAndroid?: string;
        productIdentifierIOS?: string;
        productIdentifier?: string;
        privacyPolicyUrl?: string;
        termsOfUseUrl?: string;
        proMonthlyPriceLabel?: string;
        proSubscriptionLengthLabel?: string;
    };
}
