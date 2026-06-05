export class CustomerInfoCrud {
    public Name: string | null = null;
    public Description: string | null = null;
    public Email: string | null = null;
    public Authorized: number | null = null;
    public IsDemo: boolean = false;
    public DemoDuration: number | null = null;
    public ActiveUsers: number | null = null;
    public PassiveUsers: number | null = null;
    public StorageSize: number | null = null;
    public UserName: string | null = null;
    public UserPassword: string | null = null;

    constructor(
        name: string | null,
        description: string | null,
        email: string | null,
        authorized: number | null,
        isDemo: boolean,
        demoDuration: number | null,
        activeUsers: number | null,
        passiveUsers: number | null,
        storageSize: number | null
    ) {
        this.Name = name;
        this.Description = description;
        this.Email = email;
        this.Authorized = authorized;
        this.IsDemo = isDemo;
        this.DemoDuration = demoDuration;
        this.ActiveUsers = activeUsers;
        this.PassiveUsers = passiveUsers;
        this.StorageSize = storageSize;
    }
}
