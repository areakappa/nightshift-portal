/**
 * TeamContentCrud model for team content operations
 */
export class TeamContentCrud {
    Idteam: number | null = 0;
    Iduser: number | null = 0;
    IdorganizationRole: number | null = 0;
    IdserviceRole: number | null = 0;
    State: number | null = 1;
    constructor(idteam: number | null, iduser: number | null, idorganizationRole: number | null, idserviceRole: number, state: number | null) {
        this.Idteam = idteam;
        this.Iduser = iduser;
        this.IdorganizationRole = idorganizationRole;
        this.IdserviceRole = idserviceRole;
        this.State = state;
    }
}
