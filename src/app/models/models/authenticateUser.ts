export class AuthenticateUser {
    id: number = 0;
    idCustomer: number = 0;
    username: string = '';
    name: string = '';
    surname: string = '';
    email: string = '';
    isAdmin: boolean = false;
    isUser: boolean = false;
    isCustomerAdmin: boolean = false;
    nameCustomer: string = '';
    defaultPassword: boolean = false;
    profilePicture: string = '';
    timezone: number = 0;
    token: string = '';
    refreshToken: string = '';
    expires: string = '';
    azureToken: string = '';
    created: string = '';
    gpsThreshold: number = 0;
    ignoreGpsPosition: number = 0;

    constructor() { }

    static getRole(user: AuthenticateUser | undefined) {
        if (user?.isAdmin) return 'Admin';
        if (user?.isCustomerAdmin) return 'CustomerAdmin';
        if (user?.isUser) return 'User';
        return 'None';
    }
}
