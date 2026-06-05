export class ContactInfoCrud {
    Name: string = "";
    Surname: string = "";
    Email: string = "";
    Phone: string = "";
    Note: string = "";
    Ipaddress: string | null = null;
    SiteOrigin: string | null = null;

    constructor(
        name: string,
        surname: string,
        email: string,
        phone: string,
        note: string,
        ipaddress: string | null,
        siteOrigin: string | null
    ) {
        this.Name = name;
        this.Surname = surname;
        this.Email = email;
        this.Phone = phone;
        this.Note = note;
        this.Ipaddress = ipaddress;
        this.SiteOrigin = siteOrigin;
    }
}
