export type Entry = {
    id: string;
    word: string;
    pos: string;
    translations: string[];
    definition: string;
};
let entries: Entry[] | undefined;
const forms: Record<string, string> = { went: 'go', gone: 'go', was: 'be', were: 'be', been: 'be', am: 'be', is: 'be', are: 'be', had: 'have', has: 'have', did: 'do', done: 'do', saw: 'see', seen: 'see', took: 'take', taken: 'take', came: 'come', got: 'get', made: 'make', said: 'say', told: 'tell', thought: 'think', bought: 'buy', brought: 'bring', knew: 'know', known: 'know', wrote: 'write', written: 'write', ran: 'run', ate: 'eat', eaten: 'eat', gave: 'give', given: 'give', found: 'find', felt: 'feel', left: 'leave', men: 'man', women: 'woman', children: 'child', feet: 'foot', teeth: 'tooth', mice: 'mouse', better: 'good', best: 'good' };
export async function dictionary(): Promise<Entry[]> { if (entries)
    return entries; const r = await fetch(`${import.meta.env.BASE_URL}dictionary.json`); if (!r.ok)
    throw new Error('Словарь пока недоступен. Подключитесь к интернету и попробуйте ещё раз.'); return entries = await r.json(); }
const key = (s: string) => s.toLocaleLowerCase().trim().replace(/\s+/g, ' ');
export async function search(query: string, russian: boolean): Promise<{
    results: Entry[];
    suggestions: string[];
}> {
    const all = await dictionary(), q = key(query);
    if (russian)
        return { results: all.filter(e => e.translations.some(t => key(t) === q)).slice(0, 60), suggestions: [] };
    const results = all.filter(e => key(e.word) === q);
    const candidates = new Set<string>([forms[q]]);
    if (q.endsWith('ies'))
        candidates.add(q.slice(0, -3) + 'y');
    for (const suffix of ['s', 'es', 'ed', 'ing'])
        if (q.endsWith(suffix)) {
            const stem = q.slice(0, -suffix.length);
            candidates.add(stem);
            if (suffix === 'ed' || suffix === 'ing') {
                candidates.add(stem + 'e');
                if (stem.at(-1) === stem.at(-2))
                    candidates.add(stem.slice(0, -1));
            }
        }
    const suggestions = [...new Set(all.filter(e => candidates.has(key(e.word))).map(e => e.word))].slice(0, 8);
    if (!results.length && !suggestions.length)
        suggestions.push(...[...new Set(all.filter(e => key(e.word).startsWith(q)).map(e => e.word))].slice(0, 8));
    return { results, suggestions };
}
