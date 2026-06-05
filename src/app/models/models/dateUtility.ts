export class DateUtility {

    public static serializeDate(dateStr: string | Date): string {
        return DateUtility.formatZeroInDateString(DateUtility.getStringFromDateStatic(new Date(dateStr)))
    }

    public static formatZeroInDateString(dateStr: string): string {
        let splitted = dateStr.split("/")
        let day: string = splitted[0]
        let month: string = splitted[1]
        let year: string = splitted[2]
        return this.addZeroIfNecessary(day) + "/" + this.addZeroIfNecessary(month) + "/" + year
    }

    private static addZeroIfNecessary(str: string): string {
        return str.length == 1 ? "0" + str : str
    }

    public static getStringFromDateStatic(date: Date | string): string {
        if (typeof date === "string")
            date = new Date(date)
        var day = date.getDate();
        var month = date.getMonth() + 1;
        var year = date.getFullYear();
        var time = day + "/" + month + "/" + year;
        return time
    }

    public static getDayStringbyNumber(day: number): string {
        switch (day) {
            case 7:
                return 'Domenica';
            case 1:
                return 'Lunedi';
            case 2:
                return 'Martedi';
            case 3:
                return 'Mercoledi';
            case 4:
                return 'Giovedi';
            case 5:
                return 'Venerdi';
            case 6:
                return 'Sabato';
            default:
                return '';
        }
    }

    public static setHoursDate(date: Date, hoursMinutes: string): string {
        const [hours, minutes] = hoursMinutes.split(':');
        // Ottieni i componenti della data UTC
        const year = date.getUTCFullYear();
        const month = String(date.getUTCMonth() + 1).padStart(2, '0');
        const day = String(date.getUTCDate()).padStart(2, '0');
        const h = String(parseInt(hours)).padStart(2, '0');
        const m = String(parseInt(minutes)).padStart(2, '0');

        // Restituisci la stringa ISO in formato UTC senza conversioni di fuso orario
        return `${year}-${month}-${day}T${h}:${m}:00`;
    }

    public static toUtc(datoToConvert: Date) {
        var nowUtc = new Date(datoToConvert.getTime() + (datoToConvert.getTimezoneOffset() * 60000));
        return nowUtc;
    }

    public static toTimeUtcOnlyHours(hours: number): string {
        let minutes = 0;
        //setto oggi all'orario che mi serve
        let now = new Date()
        now.setHours(hours)
        now.setMinutes(minutes)

        //trasformo la data in utc
        let datetoUtc = this.toUtc(now)

        //riottengo la data con ore e minuti giusti
        let hoursToUtc = datetoUtc.getHours().toString()
        let minutesToUtc = datetoUtc.getMinutes().toString()

        let timetoUtc = hoursToUtc + ":" + minutesToUtc
        return timetoUtc
    }
}
