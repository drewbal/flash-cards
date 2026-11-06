import './style.css';
import { themeControl, bindThemeControl } from './theme';
import { check, day, directions, initial, intervals, learned, normalize, queue, reviewCard, validData, type Card, type Data, type Direction, type Task } from './core';
import { load, save } from './storage';
import { search, type Entry } from './dictionary';
const app = document.querySelector<HTMLDivElement>('#app')!;
let data: Data = { cards: [], history: [] }, screen = 'home', results: Entry[] = [], lookupDirection: Direction = 'en-ru', query = '', filter = '', activeEntry: Entry | undefined, editing: Card | undefined;
let tasks: Task[] = [], total = 0, completed = 0, feedback = '', almost = false, answered = false, previousId = '', ready = false;
const esc = (s: unknown) => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!));
const label = (d: Direction) => d === 'en-ru' ? 'EN → RU' : 'RU → EN';
const dueCount = () => queue(data.cards).length;
const icon = (name: string) => ({ home: '◈', search: '⌕', cards: '▤', settings: '⚙' }[name] || '');
function notify(message: string) { document.querySelector('.toast')?.remove(); const el = document.createElement('div'); el.className = 'toast'; el.role = 'status'; el.textContent = message; document.body.append(el); setTimeout(() => el.remove(), 5000); }
async function commit(next: Data) { await save(next, data); data = next; }
function mutate(fn: (next: Data) => void) { const next = structuredClone(data); fn(next); return commit(next); }
function log(next: Data, c: Card, d: Direction, kind: 'correct' | 'wrong' | 'lookup') { next.history.push({ cardId: c.id, direction: d, kind, at: new Date().toISOString() }); }
function navigation() { return `<nav aria-label="Основная навигация">${[['home', 'Сегодня'], ['search', 'Словарь'], ['cards', 'Мои слова'], ['settings', 'Настройки']].map(([id, title]) => `<button data-nav="${id}" class="${screen === id ? 'selected' : ''}"><span>${icon(id)}</span>${title}</button>`).join('')}</nav>`; }
function render() {
    app.innerHTML = `<div class="shell"><header><a href="#" data-nav="home" class="brand"><span class="brand-mark">с.</span> слово<span class="brand-caption">ЛИЧНЫЙ СЛОВАРЬ</span></a>${themeControl()}</header><main>${screen === 'home' ? home() : screen === 'search' ? searchView() : screen === 'cards' ? cardsView() : screen === 'settings' ? settings() : screen === 'edit' ? editor() : training()}</main>${navigation()}<footer>Маленькая привычка. Большой словарный запас.</footer></div>`;
    bind();
    bindThemeControl();
}
function home() { const count = dueCount(), learnedCount = data.cards.filter(learned).length; return `<div class="eyebrow">АНГЛИЙСКИЙ · КАЖДЫЙ ДЕНЬ</div><section class="intro"><h1>Слова остаются<br><em>с тобой.</em></h1><p>Находи новое в книгах. <br>Запоминай — по одному слову за раз.</p></section><section class="daily panel"><div><span class="eyebrow">ПЛАН НА СЕГОДНЯ</span><h2>${count ? `${count} ${plural(count, 'проверка', 'проверки', 'проверок')}` : 'Всё в своём темпе'}</h2><p>${count ? 'Немного практики, чтобы слова не забывались.' : data.cards.length ? 'На сегодня проверок нет. Новые слова появятся здесь завтра.' : 'Добавь первое слово — завтра начнём повторять.'}</p></div><button class="primary" id="start" ${count ? '' : 'disabled'}>Начать тренировку <span>↗</span></button><div class="intervals"><span>РИТМ ПОВТОРЕНИЙ</span>${intervals.map(n => `<b>${n}<small>дн.</small></b>`).join('<i>·</i>')}</div></section><div class="stats"><div><strong>${data.cards.length}</strong><span>в коллекции</span></div><div><strong>${data.cards.length - learnedCount}</strong><span>изучаются</span></div><div><strong>${learnedCount}</strong><span>выучено</span></div></div><button class="add-banner" data-nav="search"><span class="plus">＋</span><span><b>Встретилось новое слово?</b><small>Найди перевод и сохрани карточку</small></span><span>→</span></button>${data.cards.length ? `<div class="section-heading"><h3>Недавно добавленные</h3><button class="link" data-nav="cards">Все слова →</button></div>${data.cards.slice(-3).reverse().map(c => `<div class="recent"><span>${esc(c.en.join(', '))}</span><small>${learned(c) ? 'Выучено' : 'В обучении'}</small></div>`).join('')}` : `<p class="note">Без аккаунта и подписки. Твои слова хранятся на этом устройстве.</p>`}`; }
function plural(n: number, a: string, b: string, c: string) { return n % 10 === 1 && n % 100 !== 11 ? a : n % 10 >= 2 && n % 10 <= 4 && (n % 100 < 12 || n % 100 > 14) ? b : c; }
function searchView() { return `<div class="eyebrow">НАЙТИ И ЗАПОМНИТЬ</div><h1>Словарь</h1><p class="subtitle">Одно значение — одна карточка.</p><div class="segmented"><button data-dir="en-ru" class="${lookupDirection === 'en-ru' ? 'active' : ''}">English → Русский</button><button data-dir="ru-en" class="${lookupDirection === 'ru-en' ? 'active' : ''}">Русский → English</button></div><form id="search-form" class="search-box"><input id="query" aria-label="Слово для поиска" placeholder="${lookupDirection === 'en-ru' ? 'Например, wonder' : 'Например, удивление'}" value="${esc(query)}" autocomplete="off" autocapitalize="none" spellcheck="false" required><button class="primary" type="submit">Найти</button></form><p class="note">FreeDict · 62 181 статья · поиск работает офлайн после загрузки</p><div id="search-status" role="status"></div><div id="results">${resultView()}</div><button class="secondary full" id="manual">＋ Создать карточку вручную</button>`; }
function resultView() { return results.map((e, i) => `<article class="result panel"><div class="result-heading"><h3>${esc(lookupDirection === 'en-ru' ? e.word : e.translations.join(' / '))}</h3><span class="tag">${esc(e.pos || 'слово')}</span></div><p class="meaning">${esc(e.definition || 'Без пояснения значения')}</p><button class="secondary reveal" data-entry="${i}">Открыть перевод →</button><small>Открытие сбросит прогресс этого значения в направлении ${label(lookupDirection)}.</small></article>`).join(''); }
function cardsView() { const shown = data.cards.filter(c => [...c.en, ...c.ru].some(s => normalize(s).includes(normalize(filter)))); return `<div class="eyebrow">ТВОЯ КОЛЛЕКЦИЯ</div><h1>Мои слова <sup>${data.cards.length}</sup></h1><input class="collection-search" id="filter" aria-label="Поиск по карточкам" placeholder="Найти слово или перевод" value="${esc(filter)}"><p class="note">Перевод скрыт: открытие карточки считается просмотром перевода EN → RU.</p><div id="card-list">${shown.length ? shown.map(c => `<article class="word-card panel"><div class="result-heading"><h3>${esc(c.en.join(', '))}</h3><span class="tag">${learned(c) ? 'Выучено' : 'В обучении'}</span></div>${c.hint ? `<p>${esc(c.hint)}</p>` : ''}<div class="progress-pair">${directions.map(d => `<div><span>${label(d)}</span><div class="dots">${intervals.map((_, i) => `<i class="${c.progress[d].level > i ? 'filled' : ''}"></i>`).join('')}</div><small>${progressText(c, d)}</small></div>`).join('')}</div><button class="link" data-card="${c.id}">Открыть перевод и карточку →</button></article>`).join('') : `<div class="empty"><span>▤</span><h3>${filter ? 'Ничего не найдено' : 'Здесь будут твои слова'}</h3><p>Сохраняй слова из словаря или добавляй свои.</p><button class="primary" data-nav="search">Открыть словарь</button></div>`}</div>`; }
function progressText(c: Card, d: Direction) { const p = c.progress[d]; if (p.level === 4)
    return 'Выучено'; return p.due! <= day() ? 'Пора повторить' : `Проверка ${new Date(p.due + 'T12:00:00').toLocaleDateString('ru', { day: 'numeric', month: 'short' })}`; }
function editor() { const e = activeEntry, c = editing; return `<button class="link back" data-nav="${c ? 'cards' : 'search'}">← Назад</button><div class="eyebrow">${c ? 'ТВОЁ СЛОВО' : 'НОВОЕ СЛОВО'}</div><h1>${esc(c?.en[0] || e?.word || 'Карточка')}</h1>${e ? `<p class="subtitle">${esc(e.definition)}</p>` : ''}<form id="card-form" class="panel editor"><label>Английское слово или выражение<textarea id="en" rows="2" required>${esc(c?.en.join('; ') || e?.word || '')}</textarea></label><label>Допустимые переводы<textarea id="ru" rows="3" required>${esc(c?.ru.join('; ') || e?.translations.join('; ') || '')}</textarea><small>Разделяй синонимы точкой с запятой. Для ответа хватит одного.</small></label><label>Уточнение значения<input id="hint" value="${esc(c?.hint || '')}" placeholder="Например, берег реки"><small>Видно во время проверки. Не указывай здесь ответ.</small></label><button class="primary full">${c ? 'Сохранить изменения' : 'Добавить в обучение'} <span>＋</span></button>${c ? `<button type="button" class="danger" id="delete">Удалить карточку</button>` : ''}</form>`; }
function training() {
    const t = tasks[0], c = t && data.cards.find(c => c.id === t.id);
    if (!t || !c)
        return `<div class="empty finished"><span>✓</span><div class="eyebrow">ХОРОШАЯ ПРИВЫЧКА</div><h1>На сегодня всё.</h1><p>Пройдено проверок: ${completed}.<br>Следующие повторения уже запланированы.</p><button class="primary" data-nav="home">На главную →</button></div>`;
    if (t.id === previousId && !answered)
        return `<div class="empty"><span>↔</span><h2>Теперь в другую сторону</h2><p>Предыдущий ответ мог подсказать слово. Сделай небольшую паузу перед продолжением.</p><button class="primary" id="continue">Продолжить</button></div>`;
    return `<div class="training-top"><button class="link" data-nav="home">← Завершить</button><span>${t.repeat ? 'Закрепление' : `${answered ? completed : completed + 1} / ${total}`}</span></div><div class="meter"><div style="width:${total ? completed / total * 100 : 0}%"></div></div><div class="exercise"><span class="tag">${label(t.direction)} · ${t.repeat ? 'без повышения уровня' : answered ? progressText(c, t.direction) : `интервал ${intervals[c.progress[t.direction].level] || 14} дн.`}</span><h1>${esc((t.direction === 'en-ru' ? c.en : c.ru).join(' / '))}</h1>${c.hint ? `<p class="hint">${esc(c.hint)}</p>` : ''}<p>Напиши ${t.direction === 'en-ru' ? 'русский' : 'английский'} перевод</p><form id="answer-form"><input id="answer" aria-label="Твой перевод" placeholder="Твой ответ" autocomplete="off" autocorrect="off" autocapitalize="none" spellcheck="false" ${answered ? 'disabled' : ''} required><div class="feedback ${answered ? 'settled' : ''}" role="status">${feedback}</div>${answered ? `<button type="button" class="primary full" id="next">Дальше →</button>` : `<button class="primary full">Проверить →</button><button type="button" class="link" id="give-up">${almost ? 'Показать ответ' : 'Не помню / показать подсказку'}</button>`}</form></div>`;
}
function settings() { return `<div class="eyebrow">ВСЁ ПОД РУКОЙ</div><h1>Настройки</h1><section class="panel settings"><h2>Резервная копия</h2><p>Карточки и прогресс хранятся только на этом устройстве. Сохрани копию в «Файлы», чтобы перенести или восстановить их.</p><button class="primary full" id="export">Скачать резервную копию ↓</button><label class="secondary file-button">Восстановить из файла<input type="file" id="import" accept="application/json,.json"></label><small>Восстановление заменяет текущую коллекцию после подтверждения.</small></section><section class="panel settings"><h2>На домашний экран iPhone</h2><p>Открой приложение в Safari, нажми «Поделиться» → «На экран Домой».</p><button class="secondary full" id="offline">Проверить готовность офлайн</button><p id="offline-status" role="status"></p><button class="link" id="persist">Запросить постоянное хранение</button></section><section class="panel settings"><h2>Как устроено обучение</h2><p>Повторения через 1, 3, 7 и 14 дней от успешного ответа. Каждый интервал считается в календарных днях по времени устройства.</p><p>Направления независимы. Ошибка или открытие перевода возвращает соответствующее направление к проверке завтра. Исправление одной опечатки не сбрасывает уровень.</p><p>Подсказка с ответом считается ошибкой.</p></section><section class="panel settings"><h2>О словаре</h2><p>English–Русский FreeDict+WikDict, 2025.11.23. Maintainer: Karl Bartel. Данные Wiktionary через DBnary. 62 181 статья.</p><p>База преобразована: удалены ударения и wiki-разметка, объединены дубли переводов. Возможны неточности; переводы можно редактировать.</p><a href="https://freedict.org/" target="_blank" rel="noreferrer">FreeDict</a> · <a href="https://creativecommons.org/licenses/by-sa/3.0/" target="_blank" rel="noreferrer">CC BY-SA 3.0</a> · <a href="./dictionary-LICENSE.txt">Полная лицензия</a></section>`; }
function bind() {
    document.querySelectorAll<HTMLElement>('[data-nav]').forEach(el => el.onclick = ev => { ev.preventDefault(); screen = el.dataset.nav!; render(); window.scrollTo(0, 0); });
    document.querySelectorAll<HTMLButtonElement>('[data-dir]').forEach(el => el.onclick = () => { lookupDirection = el.dataset.dir as Direction; results = []; query = ''; render(); });
    on('start', () => { tasks = queue(data.cards); total = tasks.length; completed = 0; previousId = ''; answered = false; feedback = ''; almost = false; screen = 'train'; render(); });
    on('continue', () => { previousId = ''; render(); });
    const sf = document.querySelector<HTMLFormElement>('#search-form');
    if (sf)
        sf.onsubmit = ev => { ev.preventDefault(); void runSearch(); };
    document.querySelectorAll<HTMLElement>('[data-entry]').forEach(el => el.onclick = () => void guarded(async () => {
        const entry = results[Number(el.dataset.entry)];
        const existing = data.cards.filter(c => c.sourceId === entry.id || (!c.sourceId && c.en.some(w => normalize(w) === normalize(entry.word)) && c.ru.some(w => entry.translations.some(t => normalize(t) === normalize(w)))));
        await mutate(next => { for (const c of next.cards.filter(c => existing.some(x => x.id === c.id))) {
            c.progress[lookupDirection] = initial();
            log(next, c, lookupDirection, 'lookup');
        } });
        activeEntry = entry;
        editing = existing.length ? data.cards.find(c => c.id === existing[0].id) : undefined;
        screen = 'edit';
        render();
        if (existing.length)
            notify(`Перевод открыт. ${label(lookupDirection)} — повторение завтра.`);
    }));
    document.querySelectorAll<HTMLElement>('[data-card]').forEach(el => el.onclick = () => void guarded(async () => { await mutate(next => { const c = next.cards.find(c => c.id === el.dataset.card)!; c.progress['en-ru'] = initial(); log(next, c, 'en-ru', 'lookup'); }); editing = data.cards.find(c => c.id === el.dataset.card); activeEntry = undefined; screen = 'edit'; render(); notify('EN → RU: повторение завтра.'); }));
    on('manual', () => { editing = undefined; activeEntry = undefined; screen = 'edit'; render(); });
    const f = document.querySelector<HTMLInputElement>('#filter');
    if (f)
        f.oninput = () => { const pos = f.selectionStart; filter = f.value; render(); const next = document.querySelector<HTMLInputElement>('#filter')!; next.focus(); next.setSelectionRange(pos, pos); };
    const cf = document.querySelector<HTMLFormElement>('#card-form');
    if (cf)
        cf.onsubmit = ev => { ev.preventDefault(); void guarded(saveCard); };
    on('delete', () => void guarded(async () => { if (!confirm('Удалить карточку и её историю?'))
        return; await mutate(next => { next.cards = next.cards.filter(c => c.id !== editing?.id); next.history = next.history.filter(e => e.cardId !== editing?.id); }); screen = 'cards'; render(); }));
    const af = document.querySelector<HTMLFormElement>('#answer-form');
    if (af)
        af.onsubmit = ev => { ev.preventDefault(); void guarded(() => answer(false)); };
    on('give-up', () => void guarded(() => answer(true)));
    on('next', () => { previousId = tasks[0].id; tasks.shift(); answered = false; almost = false; feedback = ''; render(); document.querySelector<HTMLInputElement>('#answer')?.focus(); });
    on('export', () => { const blob = new Blob([JSON.stringify({ format: 'slovo-backup', version: 1, exported: new Date().toISOString(), data }, null, 2)], { type: 'application/json' }); const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = `slovo-${day()}.json`; a.click(); setTimeout(() => URL.revokeObjectURL(url), 30000); });
    const imp = document.querySelector<HTMLInputElement>('#import');
    if (imp)
        imp.onchange = () => void guarded(async () => { const file = imp.files?.[0]; if (!file)
            return; if (file.size > 50 * 1024 * 1024)
            throw new Error('Файл слишком большой (максимум 50 МБ).'); const backup = JSON.parse(await file.text()); if (backup.format !== 'slovo-backup' || backup.version !== 1 || !validData(backup.data))
            throw new Error('Это не поддерживаемая резервная копия. Данные не изменены.'); if (!confirm(`Заменить текущую коллекцию (${data.cards.length}) данными из копии (${backup.data.cards.length} карточек)?`)) {
            imp.value = '';
            return;
        } await commit(backup.data); render(); notify('Коллекция восстановлена.'); });
    on('persist', () => void guarded(async () => { const ok = await navigator.storage?.persist?.(); notify(ok ? 'Постоянное хранение разрешено.' : 'Браузер не предоставил постоянное хранение. Сохраняй резервные копии.'); }));
    on('offline', () => void guarded(async () => { const status = document.querySelector('#offline-status')!; if (!('serviceWorker' in navigator)) {
        status.textContent = 'Для офлайн-режима нужен HTTPS или localhost.';
        return;
    } const dict = await caches.match(new URL('dictionary.json', location.href).href); status.textContent = dict && navigator.serviceWorker.controller ? 'Приложение и словарь сохранены. Можно отключать интернет.' : 'Загрузка ещё идёт. Оставь приложение открытым с интернетом и проверь снова.'; }));
}
function on(id: string, fn: () => void) { document.getElementById(id)?.addEventListener('click', fn); }
let busy = false;
async function guarded(fn: () => Promise<void>) { if (busy)
    return; busy = true; try {
    await fn();
}
catch (e) {
    notify(e instanceof Error ? e.message : 'Не удалось сохранить данные. Попробуй ещё раз.');
}
finally {
    busy = false;
} }
async function runSearch() { const input = document.querySelector<HTMLInputElement>('#query')!; query = input.value.trim(); if (!query)
    return; const status = document.querySelector('#search-status')!; status.textContent = 'Ищем… При первом поиске загружается словарь (16 МБ).'; const button = document.querySelector<HTMLButtonElement>('#search-form button')!; button.disabled = true; try {
    const found = await search(query, lookupDirection === 'ru-en');
    if (screen !== 'search')
        return;
    results = found.results;
    render();
    const s = document.querySelector('#search-status')!;
    s.innerHTML = results.length ? `<p class="note">Найдено значений: ${results.length}${results.length === 60 ? ' (первые 60)' : ''}</p>` : '<p>Точного совпадения нет. Можно добавить свой перевод.</p>';
    if (found.suggestions.length) {
        const wrap = document.createElement('div');
        wrap.className = 'suggestions';
        wrap.append('Возможно, ты ищешь: ');
        for (const word of found.suggestions) {
            const b = document.createElement('button');
            b.className = 'link';
            b.textContent = word;
            b.onclick = () => { document.querySelector<HTMLInputElement>('#query')!.value = word; void runSearch(); };
            wrap.append(b);
        }
        s.append(wrap);
    }
}
catch (e) {
    status.textContent = e instanceof Error ? e.message : 'Не удалось загрузить словарь.';
}
finally {
    button.disabled = false;
} }
async function saveCard() { const values = (id: string) => [...new Set((document.querySelector<HTMLTextAreaElement>(`#${id}`)!.value).split(';').map(x => x.trim()).filter(Boolean))]; const en = values('en'), ru = values('ru'); if (!en.length || !ru.length)
    throw new Error('Заполни слово и хотя бы один перевод.'); const hint = document.querySelector<HTMLInputElement>('#hint')!.value.trim(); const duplicate = data.cards.find(c => c.id !== editing?.id && c.en.map(normalize).sort().join('|') === en.map(normalize).sort().join('|') && c.ru.map(normalize).sort().join('|') === ru.map(normalize).sort().join('|')); if (duplicate)
    throw new Error('Такая карточка уже есть в коллекции. Открой её в «Мои слова».'); await mutate(next => { if (editing) {
    const c = next.cards.find(c => c.id === editing!.id)!;
    const changed = JSON.stringify(c.en) !== JSON.stringify(en) || JSON.stringify(c.ru) !== JSON.stringify(ru);
    Object.assign(c, { en, ru, hint });
    if (changed) {
        c.sourceId = '';
        c.progress = { 'en-ru': initial(), 'ru-en': initial() };
    }
}
else
    next.cards.push({ id: crypto.randomUUID(), sourceId: activeEntry?.id || '', en, ru, hint, example: '', created: new Date().toISOString(), progress: { 'en-ru': initial(), 'ru-en': initial() } }); });
    const wasEditing = Boolean(editing);
    if (wasEditing) {
        screen = 'cards';
    } else {
        query = '';
        results = [];
        activeEntry = undefined;
        editing = undefined;
        screen = 'search';
    }
    render();
    window.scrollTo(0, 0);
    if (!wasEditing) document.querySelector<HTMLInputElement>('#query')?.focus();
    notify(wasEditing ? 'Карточка сохранена. При изменении ответов оба направления начнутся заново.' : 'Слово добавлено. Первые проверки — завтра.');
}
async function answer(giveUp: boolean) {
    if (answered)
        return;
    const t = tasks[0], c = data.cards.find(c => c.id === t.id)!;
    const accepted = t.direction === 'en-ru' ? c.ru : c.en;
    const input = document.querySelector<HTMLInputElement>('#answer')!;
    const result = giveUp ? 'wrong' : check(input.value, accepted);
    if (result === 'almost') {
        almost = true;
        feedback = 'Почти верно. Исправь опечатку — прогресс сохранится.';
        const value = input.value;
        render();
        const next = document.querySelector<HTMLInputElement>('#answer')!;
        next.value = value;
        next.focus();
        return;
    }
    const correct = result === 'correct';
    if (!t.repeat) {
        await mutate(next => { reviewCard(next, t.id, t.direction, correct); });
        completed++;
        if (!correct)
            tasks.push({ ...t, repeat: true });
    }
    answered = true;
    feedback = `<strong>${correct ? 'Верно ✓' : t.repeat ? 'Закрепим в следующий раз' : 'Повторим завтра'}</strong><p>${esc(accepted.join(' · '))}</p>${t.repeat ? '<small>Закрепление не меняет уровень.</small>' : ''}`;
    render();
}
async function init() { try {
    data = await load();
    ready = true;
    render();
}
catch (e) {
    app.innerHTML = `<main><h1>Хранилище недоступно</h1><p>${esc(e instanceof Error ? e.message : e)}</p><p>Проверь настройки браузера и перезагрузи страницу. Существующие данные не перезаписаны.</p></main>`;
} if (ready && 'serviceWorker' in navigator && import.meta.env.PROD) {
    navigator.serviceWorker.register(`${import.meta.env.BASE_URL}sw.js`).then(() => { navigator.serviceWorker.addEventListener('message', e => { if (e.data === 'offline-ready')
        notify('Словарь сохранён. Приложение готово к работе офлайн.'); }); }).catch(() => notify('Офлайн-режим не подключился. Перезагрузи приложение с интернетом.'));
} }
void init();
