export type Direction = 'en-ru' | 'ru-en';
export type Progress = {
    level: number;
    due: string | null;
};
export type Card = {
    id: string;
    sourceId: string;
    en: string[];
    ru: string[];
    hint: string;
    example: string;
    created: string;
    progress: Record<Direction, Progress>;
};
export type Event = {
    cardId: string;
    direction: Direction;
    at: string;
    kind: 'correct' | 'wrong' | 'lookup';
};
export type Data = {
    cards: Card[];
    history: Event[];
};
export const intervals = [1, 3, 7, 14];
export const directions: Direction[] = ['en-ru', 'ru-en'];
export function day(date = new Date()): string {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}
export function after(days: number, date = new Date()): string { const d = new Date(date); d.setDate(d.getDate() + days); return day(d); }
export function initial(now = new Date()): Progress { return { level: 0, due: after(1, now) }; }
export function review(p: Progress, correct: boolean, now = new Date()): Progress {
    if (!correct)
        return initial(now);
    const level = Math.min(4, p.level + 1);
    return { level, due: level === 4 ? null : after(intervals[level], now) };
}
export function reviewCard(data: Data, id: string, direction: Direction, correct: boolean, now = new Date()): void {
    const card = data.cards.find(item => item.id === id);
    if (!card)
        throw new Error('Карточка не найдена. Перезапусти тренировку.');
    card.progress[direction] = review(card.progress[direction], correct, now);
    data.history.push({ cardId: id, direction, kind: correct ? 'correct' : 'wrong', at: now.toISOString() });
}
export const learned = (c: Card) => directions.every(d => c.progress[d].level === 4);
export const normalize = (s: string) => s.normalize('NFC').replace(/\u0301/g, '').toLocaleLowerCase().replace(/\s/g, '');
export function distance(a: string, b: string): number {
    const rows = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array(b.length).fill(0)]);
    rows[0] = Array.from({ length: b.length + 1 }, (_, i) => i);
    for (let i = 1; i <= a.length; i++)
        for (let j = 1; j <= b.length; j++) {
            rows[i][j] = Math.min(rows[i - 1][j] + 1, rows[i][j - 1] + 1, rows[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
            if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1])
                rows[i][j] = Math.min(rows[i][j], rows[i - 2][j - 2] + 1);
        }
    return rows[a.length][b.length];
}
export function check(answer: string, accepted: string[]): 'correct' | 'almost' | 'wrong' {
    const a = normalize(answer), list = accepted.map(normalize);
    if (list.includes(a))
        return 'correct';
    if (a.length >= 4 && list.some(b => b.length >= 4 && distance(a, b) === 1))
        return 'almost';
    return 'wrong';
}
export type Task = {
    id: string;
    direction: Direction;
    repeat?: boolean;
};
export function queue(cards: Card[], now = new Date()): Task[] {
    const due = directions.flatMap(direction => cards.filter(c => c.progress[direction].due !== null && c.progress[direction].due! <= day(now)).map(c => ({ id: c.id, direction, due: c.progress[direction].due! }))).sort((a, b) => a.due.localeCompare(b.due));
    const result: Task[] = [];
    while (due.length) {
        const other = due.findIndex(t => t.id !== result.at(-1)?.id);
        result.push(...due.splice(other < 0 ? 0 : other, 1));
    }
    return result;
}
export function validData(value: unknown): value is Data {
    if (!value || typeof value !== 'object')
        return false;
    const d = value as Data;
    if (!Array.isArray(d.cards) || !Array.isArray(d.history) || d.cards.length > 100000)
        return false;
    const ids = new Set<string>();
    const validDate = (s: unknown) => typeof s === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(s) && day(new Date(`${s}T12:00:00`)) === s;
    return d.cards.every(c => {
        if (!c || typeof c.id !== 'string' || ids.has(c.id))
            return false;
        ids.add(c.id);
        return typeof c.sourceId === 'string' && typeof c.hint === 'string' && typeof c.example === 'string' && typeof c.created === 'string' && [c.en, c.ru].every(a => Array.isArray(a) && a.length > 0 && a.every(s => typeof s === 'string' && s.trim().length > 0)) && c.progress && directions.every(k => { const p = c.progress[k]; return p && Number.isInteger(p.level) && p.level >= 0 && p.level <= 4 && (p.level === 4 ? p.due === null : validDate(p.due)); });
    }) && d.history.every(e => e && typeof e.cardId === 'string' && directions.includes(e.direction) && typeof e.at === 'string' && ['correct', 'wrong', 'lookup'].includes(e.kind));
}
