export const filterFunc = (entry: Record<string, any>, fieldsToSearch: string[], searchTerms: string[]) => {
    const fieldValues = fieldsToSearch.map(field => entry[field]?.toLowerCase());

    // All search terms must be present in at least one field
    return searchTerms.every(term => fieldValues.some(field => field?.includes(term)));
}

// Turn checkbox value of string 'on' into boolean true.
export const isChecked = (value: any) => value === 'on';

// Split a comma separated string into array of strings.
export const splitCommaSeparatedString = (value: string) => value.split(',').map(v => v.trim());

export const formatDateTimeCompact = (date: Date): string => {
    return new Intl.DateTimeFormat('nb-NO', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    })
        .format(date)
        .replace(',', ' -');
};

export const dateFromEpochSeconds = (epochSeconds: number): Date => {
    return new Date(epochSeconds * 1000);
}

export const isExpired = (date: Date): boolean => {
    return Date.now() > date.getTime();
};

export const isExpiredAfterOneMonth = (date: Date): boolean => {
    const oneMonthFromNow = new Date();
    oneMonthFromNow.setMonth(oneMonthFromNow.getMonth() + 1);

    return date.getTime() < oneMonthFromNow.getTime();
};
