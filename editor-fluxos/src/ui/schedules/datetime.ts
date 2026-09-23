export function formatLocalDateTime(ts: number): string {
    const dt = new Date(ts);
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${pad(dt.getDate())}/${pad(dt.getMonth() + 1)} ${pad(dt.getHours())}:${pad(dt.getMinutes())}`;
}

export function formatLocalDateTimeInput(ts: number): string {
    const dt = new Date(ts);
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${dt.getFullYear()}-${pad(dt.getMonth() + 1)}-${pad(dt.getDate())}T${pad(dt.getHours())}:${pad(dt.getMinutes())}`;
}

export function formatLocalDateTimeEdit(ts: number): string {
    const dt = new Date(ts);
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${pad(dt.getDate())}/${pad(dt.getMonth() + 1)}/${dt.getFullYear()} ${pad(dt.getHours())}:${pad(dt.getMinutes())}`;
}

export function parseLocalDateTimeEdit(value: string): number {
    const m = /^(\d{2})\/(\d{2})\/(\d{4}) (\d{2}):(\d{2})$/.exec(value.trim());
    if (!m) return NaN;
    const day = parseInt(m[1], 10);
    const month = parseInt(m[2], 10);
    const year = parseInt(m[3], 10);
    const hours = parseInt(m[4], 10);
    const minutes = parseInt(m[5], 10);
    const dt = new Date(year, month - 1, day, hours, minutes);
    if (
        dt.getFullYear() !== year || dt.getMonth() !== month - 1 || dt.getDate() !== day ||
        dt.getHours() !== hours || dt.getMinutes() !== minutes
    ) return NaN;
    return dt.getTime();
}
