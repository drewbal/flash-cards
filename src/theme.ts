type Theme = 'light' | 'dark' | 'system';
const storageKey = 'slovo-theme';
const systemTheme = window.matchMedia('(prefers-color-scheme: dark)');
let preference: Theme = 'system';
function valid(value: string | null): value is Theme {
    return value === 'light' || value === 'dark' || value === 'system';
}
try {
    const saved = localStorage.getItem(storageKey);
    if (valid(saved)) preference = saved;
} catch { /* The theme still works when browser storage is unavailable. */ }

function apply() {
    const dark = preference === 'dark' || (preference === 'system' && systemTheme.matches);
    document.documentElement.dataset.theme = dark ? 'dark' : 'light';
    document.documentElement.style.colorScheme = dark ? 'dark' : 'light';
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', dark ? '#171e1a' : '#f5f3ec');
    const select = document.querySelector<HTMLSelectElement>('#theme');
    if (select) select.value = preference;
}
export function themeControl() {
    return `<label class="theme-control"><span aria-hidden="true">◐</span><select id="theme" aria-label="Тема приложения">${([['light', 'Светлая'], ['dark', 'Тёмная'], ['system', 'Системная']] as const).map(([value, label]) => `<option value="${value}"${preference === value ? ' selected' : ''}>${label}</option>`).join('')}</select></label>`;
}
export function bindThemeControl() {
    document.querySelector<HTMLSelectElement>('#theme')?.addEventListener('change', event => {
        const value = (event.target as HTMLSelectElement).value;
        if (!valid(value)) return;
        preference = value;
        try { localStorage.setItem(storageKey, preference); } catch { /* Session-only fallback. */ }
        apply();
    });
}
systemTheme.addEventListener('change', apply);
window.addEventListener('storage', event => {
    if (event.key !== storageKey && event.key !== null) return;
    preference = valid(event.newValue) ? event.newValue : 'system';
    apply();
});
apply();
