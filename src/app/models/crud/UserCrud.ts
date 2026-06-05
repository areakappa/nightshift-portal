export class UserCrud {
    public Idcustomer: number | null = null;
    public Idrole: number | null = null;
    public Name: string | null = null;
    public Surname: string | null = null;
    public Email: string | null = null;
    public Username: string | null = null;
    public Password: string | null = null;
    public Role: string | null = null;
    public AvatarPath: string | null = null;
    public Timezone: number | null = null;
    public Language: string | null = null;
    constructor(idcustomer: number | null, idrole: number | null, name: string | null, surname: string | null, email: string | null, username: string | null, password: string | null, avatar: string | null, timezone: number | null, language: string | null, role: string | null) {
        this.Idcustomer = idcustomer;
        this.Idrole = idrole;
        this.Role = role;
        this.Name = name;
        this.Surname = surname;
        this.Email = email;
        this.Username = username;
        this.Password = password;
        this.AvatarPath = avatar;
        this.Timezone = timezone;
        this.Language = language;
    }
}
