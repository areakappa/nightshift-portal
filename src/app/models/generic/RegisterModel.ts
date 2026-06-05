import { ContactInfoCrud } from "../crud/ContactInfoCrud";
import { CustomerInfoCrud } from "../crud/CustomerInfoCrud";

export class RegisterModel {
    ContactInfoCrud: ContactInfoCrud;
    CustomerCrud: CustomerInfoCrud;

    constructor(customerInfoCrud: CustomerInfoCrud, contactInfoCrud: ContactInfoCrud) {
        this.CustomerCrud = customerInfoCrud;
        this.ContactInfoCrud = contactInfoCrud;
    }
}
