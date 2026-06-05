export class PreUser {
    Name: string = "";
    Surname: string = "";
    Email: string = "";
    IdService: number = 0;
    IdOrganization: number = 0;
    IdRole: number = 0;
    IdTeam: number = 0;
    IdUser: number = 0;
    Username: string = "";
    Password: string = "";
    constructor(name: string, surname: string, email: string, idService: number, idOrganization: number, idRole: number, idTeam: number, username: string, password: string, idUser: number = 0) {
        this.Name = name;
        this.Surname = surname;
        this.Email = email;
        this.IdService = idService;
        this.IdOrganization = idOrganization;
        this.IdRole = idRole;
        this.IdTeam = idTeam;
        this.Username = username;
        this.Password = password;
        this.IdUser = idUser;
    }
}
