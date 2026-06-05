export class InviteUser {
    UrlLink: string;
    IdTeam: number;
    IdOrganization: number;
    IdUser: number;
    constructor(urlLink: string, idTeam: number, idOrganization: number, idUser: number) {
        this.UrlLink = urlLink;
        this.IdTeam = idTeam;
        this.IdOrganization = idOrganization;
        this.IdUser = idUser;
    }
}
