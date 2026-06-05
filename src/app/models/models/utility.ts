import { HttpHeaders } from '@angular/common/http';

export class Utility {
    public static isNullOrEmpty(value: string | undefined | null): boolean {
        return !value || value.length === 0 || !value.trim() ? true : false;
    }

    public static clean(value: string): string | null {
        return this.isNullOrEmpty(value) ? null : value.trim();
    }

    public static truncate(value: string, maxLength: number): string | null {
        return this.isNullOrEmpty(value)
            ? null
            : value.length > maxLength
                ? value.slice(0, maxLength)
                : value;
    }

    public static getUserToken(): string | null {
        let token: string | null = null;
        try {
            token = sessionStorage.getItem('token');
        } catch (e) {
            // console.log('Cannot get user');
        }
        return token;
    }

    public static getAuthHeader(authToken?: string): HttpHeaders {
        let headers = new HttpHeaders();
        let token = this.isNullOrEmpty(authToken) ? this.getUserToken() : authToken;

        if (!this.isNullOrEmpty(token))
            headers = headers.set('Authorization', `Bearer ${token}`);

        return headers;
    }

    public static getErrorMessage(error: any): string {
        return error.error?.body ?? error.message;
    }

    public static isValidEnumValue(enumerator: any, value: any): boolean {
        return Object.values(enumerator).indexOf(value) !== -1;
    }

    public static convertToHMS(milliseconds: number): string {
        let seconds = milliseconds / 1000;
        let hours = seconds / 3600;
        seconds = seconds % 3600;
        let minutes = seconds / 60;
        seconds = seconds % 60;

        hours = isNaN(hours) ? 0 : Math.floor(hours);
        minutes = isNaN(minutes) ? 0 : Math.floor(minutes);
        seconds = isNaN(seconds) ? 0 : Math.floor(seconds);

        return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
    }

    public static dateDiff(
        startDate: Date | number | string,
        endDate: Date | number | string,
        unit: 'milliseconds' | 'seconds' | 'minutes' | 'hours' | 'days' = 'days'
    ): number {
        let startNumber = 0;
        let endNumber = 0;

        if (typeof startDate === 'number') startNumber = startDate;
        else if (typeof startDate === 'string')
            startNumber = new Date(startDate).getTime();
        else if (startDate instanceof Date) startNumber = startDate.getTime();

        if (typeof endDate === 'number') endNumber = endDate;
        else if (typeof endDate === 'string')
            endNumber = new Date(endDate).getTime();
        else if (endDate instanceof Date) endNumber = endDate.getTime();

        const diff = endNumber - startNumber;

        switch (unit) {
            case 'milliseconds':
                return diff;
            case 'seconds':
                return diff / 1000;
            case 'minutes':
                return diff / (1000 * 60);
            case 'hours':
                return diff / (1000 * 60 * 60);
            case 'days':
                return diff / (1000 * 60 * 60 * 24);
            default:
                return diff;
        }
    }

    public static getInitials(title: any): string {
        if (title == "" || title == null)
            return "";

        return title.split(" ")
            .map((w: any) => w[0])
            .join("")
            .substring(0, 2)
            .toUpperCase();
    }
}
