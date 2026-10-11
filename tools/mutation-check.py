#!/usr/bin/env python3
"""Kontrola testów przez psucie kodu (mutation testing „na piechotę”).

Dla każdej celowej usterki w kopii kodu (poza repozytorium) uruchamia wszystkie testy w czterech
strefach czasowych. Usterka jest „wykryta”, gdy choć jeden test pada. Usterka, która przeżyje,
oznacza słaby test albo martwy kod. Uruchomienie: python3 tools/mutation-check.py

Wzorce tekstu są przypisane do obecnego kodu. Gdy kod się zmieni, skrypt zgłosi „NIE ZNALEZIONO WZORCA”
i trzeba zaktualizować odpowiednią usterkę.
"""
import os
import re
import shutil
import subprocess
import tempfile

SRC = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
TMP = os.path.join(tempfile.mkdtemp(prefix='dziennik-mutacje-'), 'kopia')
M = 'js/calendar-model.js'
D = 'js/dates.js'
J = 'js/drafts.js'
S = 'js/draft-sync.js'
T = 'js/today-sync.js'
G = 'js/garland-model.js'
B = 'js/backup.js'
H = 'js/share.js'
STR = 'js/strings.js'
MF = 'manifest.json'
IX = 'index.html'
CSS = 'css/base.css'
WF = '.github/workflows/pages.yml'
GI = '.gitignore'
mutants=[
 ('tydzień od niedzieli', M, "(weekdayOfFirst + DAYS_IN_WEEK - 1) % DAYS_IN_WEEK", "weekdayOfFirst"),
 ('5 wierszy zamiast 6 (35 komórek)', M, "const GRID_ROWS = 6;", "const GRID_ROWS = 5;"),
 ('inMonth zawsze prawda', M, "inMonth: cellYear === year && cellMonth === month", "inMonth: true"),
 ('inMonth ignoruje miesiąc', M, "inMonth: cellYear === year && cellMonth === month", "inMonth: cellYear === year"),
 ('shiftMonth bez przeniesienia roku', M, "return { year, month: index - year * MONTHS_IN_YEAR + 1 };", "return { year: view.year, month: ((index % 12) + 12) % 12 + 1 };"),
 ('shiftMonth przesunięty o 1', M, "(view.month - 1) + delta", "view.month + delta"),
 ('isFuture: dziś liczy się jako przyszłość', M, "return key > today;", "return key >= today;"),
 ('isFuture: brak blokady przyszłości', M, "return key > today;", "return false;"),
 ('isFuture: odwrócone porównanie', M, "return key > today;", "return key < today;"),
 ('canGoNext: <=', M, "view.month < year * MONTHS_IN_YEAR + month", "view.month <= year * MONTHS_IN_YEAR + month"),
 ('canGoNext: zawsze prawda', M, "return view.year * MONTHS_IN_YEAR + view.month < year * MONTHS_IN_YEAR + month;", "return true;"),
 ('pickDay: bez sprawdzania przyszłości', M, "return isSelectable(action.key, today)\n        ? { ...withSelected(state, action.key), open: false }\n        : state;", "return { ...withSelected(state, action.key), open: false };"),
 ('pickDay: nie zamyka panelu', M, "? { ...withSelected(state, action.key), open: false }", "? { ...withSelected(state, action.key), open: state.open }"),
 ('toggle: otwarcie bez powrotu do miesiąca wybranego dnia', M, ": { ...state, ...viewOf(state.selected), open: true };", ": { ...state, open: true };"),
 ('goToToday: nie zmienia widoku', M, "return { ...withSelected(state, today), open: false };", "return { ...state, selected: today, open: false };"),
 ('goToToday: nie zamyka panelu', M, "return { ...withSelected(state, today), open: false };", "return { ...withSelected(state, today), open: state.open };"),
 ('select: bez blokady przyszłości', M, "return isSelectable(action.key, today) ? withSelected(state, action.key) : state;", "return withSelected(state, action.key);"),
 ('nieznana akcja: cicho pomijana', M, "throw new Error(`Nieznana akcja kalendarza: ${action.type}`);", "return state;"),
 ('prev przesuwa do przodu', M, "return withShiftedView(state, -1);", "return withShiftedView(state, 1);"),
 ('next bez blokady bieżącego miesiąca', M, "? withShiftedView(state, 1)\n        : state;", "? withShiftedView(state, 1)\n        : withShiftedView(state, 1);"),
 ('isToday po samym numerze dnia', M, "isToday: cell.key === today,", "isToday: cell.day === Number(today.slice(8)),"),
 ('isSelected porównuje z dziś', M, "isSelected: cell.key === selected,", "isSelected: cell.key === today,"),
 ('hasEntry: kropka dzień wcześniej', M, "Object.hasOwn(entries, cell.key);", "Object.hasOwn(entries, addDaysKey(cell.key, 1));"),
 ('opis bez informacji o wpisie', M, "if (hasEntry) return [strings.calendar.entrySaved];", "if (hasEntry) return [];"),
 ('walidacja miesiąca przepuszcza 13', M, "month <= MONTHS_IN_YEAR;", "month <= 13;"),
 ('walidacja przepuszcza ułamki', M, "const validMonth = Number.isInteger(month) &&", "const validMonth = Number.isFinite(month) &&"),
 ('reduktor zmienia stan wejściowy (toggle)', M, "return state.open\n        ? { ...state, open: false }", "return state.open\n        ? Object.assign(state, { open: false })"),
 ('stan zawiera dzień widoku (setMonth-owy dryf)', M, "return { ...state, viewYear: year, viewMonth: month };", "return { ...state, viewYear: year, viewMonth: month, viewDay: 31 };"),
 ('szkic wygrywa z wpisem w znaczniku', M, "marker: hasEntry ? 'entry' : hasDraft ? 'draft' : null,", "marker: hasDraft ? 'draft' : hasEntry ? 'entry' : null,"),
 ('znacznik szkicu zawsze pusty', M, "marker: hasEntry ? 'entry' : hasDraft ? 'draft' : null,", "marker: hasEntry ? 'entry' : null,"),
 ('znacznik szkicu także bez szkicu', M, "marker: hasEntry ? 'entry' : hasDraft ? 'draft' : null,", "marker: hasEntry ? 'entry' : 'draft',"),
 ('szkic rozpoznawany przez in (dziedziczone klucze)', M, "const hasDraft = Object.hasOwn(drafts, cell.key);", "const hasDraft = cell.key in drafts;"),
 ('szkic o dzień dalej', M, "const hasDraft = Object.hasOwn(drafts, cell.key);", "const hasDraft = Object.hasOwn(drafts, addDaysKey(cell.key, 1));"),
 ('opis bez szkicu', M, "if (hasDraft) return [strings.calendar.draftUnsaved];", "if (hasDraft) return [];"),
 ('opis wpisu ze szkicem bez informacji o szkicu', M, "if (hasEntry && hasDraft) return [strings.calendar.entrySaved, strings.calendar.draftOfEntry];", "if (hasEntry && hasDraft) return [strings.calendar.entrySaved];"),
 ('szkic: pusty formularz nie usuwa szkicu', J, "if (isEmpty(formFields)) return 'remove';", ""),
 ('szkic: formularz równy bazie tworzy szkic', J, "return fieldsEqual(formFields, baseline) ? 'remove' : 'save';", "return 'save';"),
 ('normalizacja bez przycinania wdzięczności', J, ".map((item) => item.trim())", ".map((item) => item)"),
 ('normalizacja bez przycinania pól tekstowych', J, "asText(fields?.[name]).trim()", "asText(fields?.[name])"),
 ('normalizacja zostawia puste wdzięczności', J, ".map((item) => item.trim())\n    .filter(Boolean);", ".map((item) => item.trim());"),
 ('withoutDraft zwraca kopię, gdy szkicu nie ma', J, "if (!Object.hasOwn(drafts, key)) return drafts;", ""),
 ('szkic bez uzupełnienia do trzech pól', J, "Array.from({ length: GRATEFUL_SLOTS }, (_, index) => list[index] ?? '')", "list"),
 ('szkic zapisuje wartości znormalizowane', J, "{ ...rawFieldsOf(rawFields), updatedAt: now }", "{ ...normalizeFields(rawFields), updatedAt: now }"),
 ('updateDrafts nie usuwa szkicu', J, "    : withoutDraft(drafts, key);", "    : drafts;"),
 ('formularz: zapisany wpis wygrywa ze szkicem', J, "const useDraft = hasDraft && !isEmpty(draft) && !fieldsEqual(draft, saved ?? null);", "const useDraft = false;"),
 ('formularz: szkic równy wpisowi jest używany', J, " && !fieldsEqual(draft, saved ?? null)", ""),
 ('formularz: pusty szkic jest używany', J, "hasDraft && !isEmpty(draft) &&", "hasDraft &&"),
 ('formularz: nieaktualny szkic niewykryty', J, "const staleDraft = hasDraft;", "const staleDraft = false;"),
 ('wskaźnik: Odrzuć zawsze widoczne', J, "showDiscard: hasDraft,", "showDiscard: true,"),
 ('wskaźnik: etykieta zapisu zależy od szkicu', J, "saveLabel: hasSaved ? text.saveExisting : text.saveNew,", "saveLabel: hasDraft ? text.saveExisting : text.saveNew,"),
 ('import: zawsze przeładowuje formularz', J, "return fieldsEqual(formFields, baseline ?? null)\n    ? { action: 'reload', warn: false }\n    : { action: 'keep', warn: true };", "return { action: 'reload', warn: false };"),
 ('import: zmiana bez ostrzeżenia', J, "{ action: 'keep', warn: true }", "{ action: 'keep', warn: false }"),
 ('import: brak zmiany wpisu niewykryty', J, "if (fieldsEqual(baseline ?? null, newSaved ?? null)) return { action: 'unchanged', warn: false };", ""),
 ('sanitizeDrafts: bez sprawdzania klucza', J, "if (!isValidKey(key) || !isPlainObject(value)) continue;", "if (!isPlainObject(value)) continue;"),
 ('sanitizeDrafts: ujemne updatedAt przechodzi', J, " && value.updatedAt > 0", ""),
 ('draft-sync: flush zapisuje zawsze', S, "if (handle === null) return;\n      cancel();\n      persist();", "cancel();\n      persist();"),
 ('draft-sync: schedule nie anuluje poprzedniego', S, "cancel();\n      handle = timers.set(", "handle = timers.set("),
 ('draft-sync: flush nie anuluje timera', S, "      cancel();\n      persist();\n    },", "      persist();\n    },"),
 ('draft-sync: cancel nic nie robi', S, "function cancel() {\n    if (handle === null) return;", "function cancel() {\n    return;"),
 ('draft-sync: opóźnienie 0', S, "export const DRAFT_DELAY_MS = 500;", "export const DRAFT_DELAY_MS = 0;"),
 ('powrót: próg 10 minut liczony jako większy (>)', T, "const longAway = awayMs >= RETURN_THRESHOLD_MS;", "const longAway = awayMs > RETURN_THRESHOLD_MS;"),
 ('powrót: próg 1 minuta', T, "export const RETURN_THRESHOLD_MS = 10 * 60 * 1000;", "export const RETURN_THRESHOLD_MS = 60 * 1000;"),
 ('powrót: długa przerwa nie wraca na dziś', T, "if ((dayChanged || longAway) && selectedDate !== today) action = 'goToToday';", "if (dayChanged && selectedDate !== today) action = 'goToToday';"),
 ('powrót: zmiana dnia nie wraca na dziś', T, "if ((dayChanged || longAway) && selectedDate !== today) action = 'goToToday';", "if (longAway && selectedDate !== today) action = 'goToToday';"),
 ('powrót: przejście także na dziś, gdy już dziś', T, "&& selectedDate !== today) action = 'goToToday';", ") action = 'goToToday';"),
 ('powrót: rozgrzebany formularz blokuje powrót', T, "if ((dayChanged || longAway) && selectedDate !== today) action = 'goToToday';", "if ((dayChanged || longAway) && selectedDate !== today && !formDirty) action = 'goToToday';"),
 ('północ: rozgrzebany formularz też przechodzi', T, "action = formDirty ? 'offerToday' : 'goToToday';", "action = 'goToToday';"),
 ('północ: rozgrzebany formularz nic nie proponuje', T, "action = formDirty ? 'offerToday' : 'goToToday';", "action = formDirty ? 'none' : 'goToToday';"),
 ('północ: przejście także z innego dnia', T, "} else if (dayChanged && selectedDate === lastKnownToday) {", "} else if (dayChanged) {"),
 ('etykiety nie odświeżają się', T, "return { action, refreshLabels: dayChanged };", "return { action, refreshLabels: false };"),
 ('nieskończony czas w tle liczony jako 0', T, "Number.isFinite(hiddenMs) ? hiddenMs : 0", "hiddenMs ?? 0"),
 ('nieznany powód ignorowany', T, "if (reason !== 'return' && reason !== 'tick') {", "if (false) {"),
 ('północ: czas do północy o dzień za krótki', T, "now.getDate() + 1);", "now.getDate());"),
 ('baner: szkic wybranego dnia też się liczy', T, "if (key === selectedDate) continue;", ""),
 ('baner: pusty szkic się liczy', T, "if (draftDecision(draft, entries[key] ?? null) !== 'save') continue;", ""),
 ('baner: szkic równy wpisowi się liczy', T, "entries[key] ?? null", "null"),
 ('baner: wybiera najstarszy szkic', T, "updatedAt > best.updatedAt ||", "updatedAt < best.updatedAt ||"),
 ('baner: remis rozstrzyga wcześniejszy dzień', T, "key > best.key", "key < best.key"),
 ('girlanda: żarówka co 40 px zamiast 30', G, "const BULB_SPACING_PX = 30;", "const BULB_SPACING_PX = 40;"),
 ('girlanda: brak minimum żarówek', G, "return Math.max(MIN_BULBS, Math.round(width / BULB_SPACING_PX));", "return Math.round(width / BULB_SPACING_PX);"),
 ('girlanda: zła szerokość nie daje zera', G, "return Number.isFinite(width) && width > 0;", "return width > 0;"),
 ('girlanda: łuk co 200 px', G, "const SWAG_WIDTH_PX = 110;", "const SWAG_WIDTH_PX = 200;"),
 ('girlanda: brak limitu łuków', G, "Math.min(MAX_SWAGS, Math.max(MIN_SWAGS,", "Math.min(99, Math.max(MIN_SWAGS,"),
 ('girlanda: łuk nie sięga prawej krawędzi', G, "const x1 = round1((width * (k + 1)) / swagTotal);", "const x1 = round1((width * (k + 1)) / (swagTotal + 0.2));"),
 ('girlanda: punkt sterujący nie w środku', G, "const cx = round1((x0 + x1) / 2);", "const cx = round1(x0 + (x1 - x0) * 0.4);"),
 ('girlanda: zwis za duży', G, "export const SAG_MAX = 14;", "export const SAG_MAX = 20;"),
 ('girlanda: zwis zawsze maksymalny', G, "const sag = SAG_MIN + random() * (SAG_MAX - SAG_MIN);", "const sag = SAG_MAX; random();"),
 ('girlanda: żarówka na punkcie zaczepienia', G, "const t = (i + 0.5) / inThisSwag;", "const t = i / inThisSwag;"),
 ('girlanda: żarówki nierówno rozdzielone', G, "Math.floor(bulbTotal / swagTotal) + (k < bulbTotal % swagTotal ? 1 : 0)", "k === 0 ? bulbTotal - swagTotal + 1 : 1"),
 ('girlanda: żarówka bez oprawki (zbyt wysoko)', G, "cy: round1(y + SOCKET_HEIGHT + BULB_RADIUS - 1),", "cy: round1(y),"),
 ('girlanda: żarówka za nisko', G, "cy: round1(y + SOCKET_HEIGHT + BULB_RADIUS - 1),", "cy: round1(y + 20),"),
 ('girlanda: sąsiednie kolory mogą być takie same', G, "return (previous + 1 + Math.floor(random() * (BULB_COLORS.length - 1))) % BULB_COLORS.length;", "return Math.floor(random() * BULB_COLORS.length);"),
 ('girlanda: tylko dwa kolory', G, "return (previous + 1 + Math.floor(random() * (BULB_COLORS.length - 1))) % BULB_COLORS.length;", "return (previous + 1) % 2;"),
 ('girlanda: dodatnie opóźnienie', G, "delay: -round2(random() * duration),", "delay: round2(random() * duration),"),
 ('girlanda: opóźnienie dłuższe niż cykl', G, "delay: -round2(random() * duration),", "delay: -round2(random() * duration * 3),"),
 ('girlanda: stały czas migotania', G, "const duration = round2(TWINKLE_MIN_S + random() * (TWINKLE_MAX_S - TWINKLE_MIN_S));", "const duration = 2.6; random();"),
 ('girlanda: mechaniczny okres opóźnień', G, "delay: -round2(random() * duration),", "delay: -round2(((i + k) % 8) * 0.18),"),
 ('girlanda: ziarno ignorowane', G, "const random = seededRandom(seed);", "const random = seededRandom(1);"),
 ('girlanda: generator zwraca 1', G, "return ((t ^ (t >>> 14)) >>> 0) / 4294967296;", "return ((t ^ (t >>> 14)) >>> 0) / 4294967295;"),
 ('girlanda: generator ignoruje ziarno', G, "let state = seed | 0;", "let state = 7;"),
 ('girlanda: wysokość 30 (poświata ucięta)', G, "export const HEIGHT = 40;", "export const HEIGHT = 30;"),
 ('todayKey przez toISOString (stary błąd UTC)', D, "return dateKey(date.getFullYear(), date.getMonth() + 1, date.getDate());", "return date.toISOString().slice(0, 10);"),
 ('addDaysKey liczy w lokalnym czasie milisekundami', D, "const shifted = new Date(Date.UTC(parsed.year, parsed.month - 1, parsed.day) + days * DAY_MS);\n  return dateKey(shifted.getUTCFullYear(), shifted.getUTCMonth() + 1, shifted.getUTCDate());",
   "const shifted = new Date(parsed.year, parsed.month - 1, parsed.day);\n  shifted.setTime(shifted.getTime() + days * DAY_MS);\n  return dateKey(shifted.getFullYear(), shifted.getMonth() + 1, shifted.getDate());"),
 ('kopia: remis zastępuje obecny wpis', B, "savedAtOf(incoming) > savedAtOf(existing)", "savedAtOf(incoming) >= savedAtOf(existing)"),
 ('kopia: starszy wpis z pliku wygrywa', B, "savedAtOf(incoming) > savedAtOf(existing)", "savedAtOf(incoming) < savedAtOf(existing)"),
 ('kopia: plik zawsze wygrywa (zachowanie z prototypu)', B, "!sameContent(existing, incoming) && savedAtOf(incoming) > savedAtOf(existing)", "true"),
 ('kopia: obecny zawsze wygrywa', B, "!sameContent(existing, incoming) && savedAtOf(incoming) > savedAtOf(existing)", "false"),
 ('kopia: ta sama treść liczy się jako zmiana', B, "!sameContent(existing, incoming) &&", ""),
 ('kopia: treść porównywana tylko po wdzięczności', B, "TEXT_FIELDS.every((field) => a[field] === b[field])", "true"),
 ('kopia: treść bez ostatniego pola', B, "TEXT_FIELDS.every((field) => a[field] === b[field])", "TEXT_FIELDS.slice(0, 3).every((field) => a[field] === b[field])"),
 ('kopia: kolejność wdzięczności bez znaczenia', B, "a.grateful.every((item, index) => item === b.grateful[index])", "a.grateful.every((item) => b.grateful.includes(item))"),
 ('kopia: różna liczba wdzięczności bez znaczenia', B, "a.grateful.length === b.grateful.length &&", ""),
 ('kopia: savedAt jako tekst się liczy', B, "Number.isFinite(entry.savedAt) && entry.savedAt > 0 ? entry.savedAt : 0", "Number(entry.savedAt) > 0 ? Number(entry.savedAt) : 0"),
 ('kopia: ujemne savedAt się liczy', B, "Number.isFinite(entry.savedAt) && entry.savedAt > 0 ? entry.savedAt : 0", "Number.isFinite(entry.savedAt) ? entry.savedAt : 0"),
 ('kopia: uszkodzony wpis lokalny nie jest zastępowany', B, "if (!isPlainObject(existing)) {", "if (existing === undefined) {"),
 ('kopia: tablica jako wpis lokalny', B, "if (!isPlainObject(existing)) {", "if (typeof existing !== 'object' || existing === null) {"),
 ('kopia: dodane liczone jako zaktualizowane', B, "entries[key] = incoming;\n      added++;", "entries[key] = incoming;\n      updated++;"),
 ('kopia: zaktualizowane liczone jako dodane', B, "entries[key] = incoming;\n      updated++;", "entries[key] = incoming;\n      added++;"),
 ('kopia: bez zmian nie liczone', B, "} else {\n      unchanged++;\n    }", "} else {\n    }"),
 ('kopia: scalanie modyfikuje obecne wpisy', B, "const entries = { ...current };", "const entries = current;"),
 ('kopia: wpisy tylko lokalne giną', B, "const entries = { ...current };", "const entries = {};"),
 ('status: bez wpisów też pokazuje licznik', B, "if (entryCount === 0) return { kind: 'none' };", ""),
 ('status: zepsuta data nie daje „jeszcze nie”', B, "if (!isValidKey(lastBackup)) return { kind: 'never' };", ""),
 ('status: data z przyszłości daje liczbę ujemną', B, "Math.max(0, daysBetween(lastBackup, today))", "daysBetween(lastBackup, today)"),
 ('status: dni liczone odwrotnie', B, "daysBetween(lastBackup, today)", "daysBetween(today, lastBackup)"),
 ('daysBetween: lokalna północ zamiast UTC', D, "const utc = ({ year, month, day }) => Date.UTC(year, month - 1, day);", "const utc = ({ year, month, day }) => new Date(year, month - 1, day).getTime();"),
 ('daysBetween: odwrócony znak', D, "return Math.round((utc(to) - utc(from)) / DAY_MS);", "return Math.round((utc(from) - utc(to)) / DAY_MS);"),
 ('daysBetween: brak błędu dla złego „od”', D, "if (!from) throw new RangeError(`Niepoprawny klucz dnia: ${fromKey}`);", ""),
 ('daysBetween: brak błędu dla złego „do”', D, "if (!to) throw new RangeError(`Niepoprawny klucz dnia: ${toKey}`);", ""),
 ('eksport: udostępnianie bez sprawdzenia canShare', H, "return nav.canShare({ files: [file] }) === true ? 'share' : 'download';", "return 'share';"),
 ('eksport: „prawdopodobnie prawda” z canShare wystarcza', H, "nav.canShare({ files: [file] }) === true", "nav.canShare({ files: [file] })"),
 ('eksport: canShare pytany bez pliku', H, "nav.canShare({ files: [file] })", "nav.canShare({})"),
 ('eksport: błąd canShare nie jest łapany', H, "} catch {\n    return 'download';\n  }", "} finally {\n  }"),
 ('eksport: brak share nie wymusza pobrania', H, "typeof nav?.share !== 'function' || typeof nav?.canShare !== 'function'", "typeof nav?.canShare !== 'function'"),
 ('eksport: każdy błąd to anulowanie', H, "return error?.name === 'AbortError';", "return error !== undefined && error !== null;"),
 ('eksport: żaden błąd to nie anulowanie', H, "return error?.name === 'AbortError';", "return false;"),
 ('teksty: wczoraj jako „1 dni temu”', STR, "if (status.days === 1) return 'Ostatnia kopia: wczoraj';", ""),
 ('teksty: dziś jako „0 dni temu”', STR, "if (status.days === 0) return 'Ostatnia kopia: dziś';", ""),
 ('teksty: licznik pokazuje się dla „none”', STR, "if (status.kind !== 'done') return '';", "if (status.kind !== 'done') return 'Jeszcze nie robiłaś kopii zapasowej';"),
 ('teksty: pusty plik bez osobnego komunikatu', STR, "added + updated + unchanged === 0", "false"),
 ('teksty: pusty plik także, gdy tylko „bez zmian”', STR, "added + updated + unchanged === 0", "added + updated === 0"),
 ('teksty: pominięte zawsze widoczne', STR, "skipped > 0 ?", "true ?"),
 ('teksty: zamienione liczby w raporcie', STR, "Dodano: ${added}, zaktualizowano: ${updated}", "Dodano: ${updated}, zaktualizowano: ${added}"),
 ('pwa: nazwa w manifeście stara', MF, '"name": "Little Lights"', '"name": "Dziennik Wdzięczności"'),
 ('pwa: short_name inny niż name', MF, '"short_name": "Little Lights"', '"short_name": "Dziennik"'),
 ('pwa: język manifestu angielski', MF, '"lang": "pl"', '"lang": "en"'),
 ('pwa: tryb z paskiem przeglądarki', MF, '"display": "standalone"', '"display": "browser"'),
 ('pwa: start_url absolutny (zepsuje podkatalog)', MF, '"start_url": "./"', '"start_url": "/"'),
 ('pwa: scope absolutny', MF, '"scope": "./"', '"scope": "/"'),
 ('pwa: start_url z pełnym adresem', MF, '"start_url": "./"', '"start_url": "https://nekonee.github.io/little-lights/"'),
 ('pwa: tło ładowania inne niż motyw domyślny', MF, '"background_color": "#fbf0e2"', '"background_color": "#ffffff"'),
 ('pwa: kolor motywu inny niż domyślny', MF, '"theme_color": "#fbf0e2"', '"theme_color": "#000000"'),
 ('pwa: ikona 192 deklarowana jako 193', MF, '"sizes": "192x192"', '"sizes": "193x193"'),
 ('pwa: ikona 512 wskazuje na ikonę 192', MF, '"src": "assets/icons/icon-512.png"', '"src": "assets/icons/icon-192.png"'),
 ('pwa: ikona wskazuje na nieistniejący plik', MF, '"src": "assets/icons/icon-192.png"', '"src": "assets/icons/brak.png"'),
 ('pwa: ikona ze ścieżką absolutną', MF, '"src": "assets/icons/icon-192.png"', '"src": "/assets/icons/icon-192.png"'),
 ('pwa: ikona z błędnym typem MIME', MF, '"type": "image/png",\n      "purpose": "any"\n    },\n    {\n      "src": "assets/icons/icon-512.png"', '"type": "image/jpeg",\n      "purpose": "any"\n    },\n    {\n      "src": "assets/icons/icon-512.png"'),
 ('pwa: brak ikony 512', MF, '"sizes": "512x512"', '"sizes": "256x256"'),
 ('pwa: brak linku do manifestu', IX, '<link rel="manifest" href="manifest.json" />', ''),
 ('pwa: link do manifestu z absolutną ścieżką', IX, 'href="manifest.json"', 'href="/manifest.json"'),
 ('pwa: brak trybu aplikacji Apple', IX, 'name="apple-mobile-web-app-capable" content="yes"', 'name="apple-mobile-web-app-capable" content="no"'),
 ('pwa: tytuł pod ikoną inny', IX, 'name="apple-mobile-web-app-title" content="Little Lights"', 'name="apple-mobile-web-app-title" content="Dziennik"'),
 ('pwa: pasek statusu domyślny zamiast translucent', IX, 'content="black-translucent"', 'content="default"'),
 ('pwa: telefony zamieniane na linki', IX, 'content="telephone=no"', 'content="telephone=yes"'),
 ('pwa: brak apple-touch-icon', IX, '<link rel="apple-touch-icon" sizes="180x180" href="apple-touch-icon.png?v=1" />', ''),
 ('pwa: apple-touch-icon bez wersji w adresie', IX, 'href="apple-touch-icon.png?v=1"', 'href="apple-touch-icon.png"'),
 ('pwa: apple-touch-icon o złym rozmiarze', IX, 'sizes="180x180"', 'sizes="152x152"'),
 ('pwa: brak viewport-fit=cover', IX, ', viewport-fit=cover', ''),
 ('pwa: zablokowane powiększanie', IX, 'initial-scale=1, viewport-fit=cover', 'initial-scale=1, maximum-scale=1, viewport-fit=cover'),
 ('pwa: stary tytuł strony w HTML', IX, '<title>🍂 Little Lights</title>', '<title>🍂 Dziennik Wdzięczności</title>'),
 ('pwa: stary nagłówek h1 w HTML', IX, '<h1>🍂 Little Lights</h1>', '<h1>🍂 Dziennik Wdzięczności</h1>'),
 ('pwa: APP_TITLE inny niż w manifeście', STR, "export const APP_TITLE = 'Little Lights';", "export const APP_TITLE = 'Little Light';"),
 ('pwa: brak wcięcia u góry (notch)', CSS, 'calc(28px + env(safe-area-inset-top))', '28px'),
 ('pwa: brak wcięcia na dole (pasek home)', CSS, 'calc(60px + env(safe-area-inset-bottom))', '60px'),
 ('deploy: na stronę trafia docs', WF, "cp -R css js _site/", "cp -R css js docs _site/"),
 ('deploy: na stronę trafiają testy', WF, "cp -R css js _site/", "cp -R css js tests _site/"),
 ('deploy: na stronę trafia legacy', WF, "cp -R css js _site/", "cp -R css js legacy _site/"),
 ('deploy: na stronę trafiają narzędzia', WF, "cp -R css js _site/", "cp -R css js tools _site/"),
 ('deploy: na stronę trafiają prywatne kopie', WF, "cp -R css js _site/", "cp -R css js backups _site/"),
 ('deploy: kopiowanie całego repozytorium', WF, "cp -R css js _site/", "cp -R . _site/"),
 ('deploy: wzorzec zamiast listy plików', WF, "cp -R css js _site/", "cp -R css js* _site/"),
 ('deploy: README na stronie', WF, "cp index.html manifest.json apple-touch-icon.png _site/", "cp index.html manifest.json apple-touch-icon.png README.md _site/"),
 ('deploy: package.json na stronie', WF, "cp index.html manifest.json apple-touch-icon.png _site/", "cp index.html manifest.json apple-touch-icon.png package.json _site/"),
 ('deploy: brak katalogu js', WF, "cp -R css js _site/", "cp -R css _site/"),
 ('deploy: brak katalogu css', WF, "cp -R css js _site/", "cp -R js _site/"),
 ('deploy: brak manifestu', WF, "cp index.html manifest.json apple-touch-icon.png _site/", "cp index.html apple-touch-icon.png _site/"),
 ('deploy: brak ikony apple-touch-icon', WF, "cp index.html manifest.json apple-touch-icon.png _site/", "cp index.html manifest.json _site/"),
 ('deploy: brak index.html', WF, "cp index.html manifest.json apple-touch-icon.png _site/", "cp manifest.json apple-touch-icon.png _site/"),
 ('deploy: brak ikon z katalogu assets/icons', WF, "          cp -R assets/icons _site/assets/\n", ""),
 ('deploy: brak favicony', WF, "          cp assets/favicon.svg _site/assets/\n", ""),
 ('deploy: publikacja z innej gałęzi', WF, "branches: [main]", "branches: [develop]"),
 ('deploy: publikacja bez testów (brak needs)', WF, "    needs: test\n", ""),
 ('deploy: zadanie testów nie uruchamia testów', WF, "      - run: npm test\n", ""),
 ('deploy: brak kroku publikacji', WF, "actions/deploy-pages@v5", "actions/configure-pages@v6"),
 ('deploy: brak wysyłania artefaktu', WF, "actions/upload-pages-artifact@v5", "actions/configure-pages@v6"),
 ('deploy: uprawnienia zapisu do kodu', WF, "permissions:\n  contents: read", "permissions:\n  contents: write"),
 ('deploy: write-all', WF, "permissions:\n  contents: read", "permissions: write-all\n  x: read"),
 ('deploy: brak uprawnienia pages', WF, "      pages: write\n", ""),
 ('deploy: brak tokenu OIDC', WF, "      id-token: write\n", ""),
 ('deploy: brak uprawnienia odczytu kodu', WF, "permissions:\n  contents: read", "permissions:\n  actions: read"),
 ('deploy: cudza akcja', WF, "actions/checkout@v7", "someone/checkout@v7"),
 ('deploy: akcja bez wersji głównej', WF, "actions/setup-node@v7", "actions/setup-node@main"),
 ('deploy: sekret w workflow', WF, "      - run: npm test", "      - run: npm test\n        env:\n          T: ${{ secrets.TOKEN }}"),
 ('gitignore: brak ochrony katalogu backups', GI, "backups/\n", ""),
 ('gitignore: brak ochrony plików kopii', GI, "kopia-dziennika-*.json\n", ""),
]
TZS=['Europe/Warsaw','America/Los_Angeles','Pacific/Kiritimati','UTC']
def fresh():
    if os.path.exists(TMP):
        shutil.rmtree(TMP)
    os.makedirs(TMP)
    for d in ('js','tests','css','assets','.github'): shutil.copytree(f'{SRC}/{d}', f'{TMP}/{d}')
    for f in ('package.json','index.html','manifest.json','apple-touch-icon.png','.gitignore'): shutil.copy(f'{SRC}/{f}', TMP)
def run(tz):
    r=subprocess.run(['node','--test'],cwd=TMP,env={**os.environ,'TZ':tz},capture_output=True,text=True)
    m=re.search(r'ℹ fail (\d+)',r.stdout); return int(m.group(1)) if m else -1
fresh()
print('baza:', {tz:run(tz) for tz in TZS})
survivors=[]
for name,f,old,new in mutants:
    fresh()
    p=f'{TMP}/{f}'; s=open(p,encoding='utf-8').read()
    if old not in s: print('!! NIE ZNALEZIONO WZORCA:',name); continue
    open(p,'w',encoding='utf-8').write(s.replace(old,new,1))
    res={tz:run(tz) for tz in TZS}
    killed=any(v!=0 for v in res.values())
    print(('WYKRYTY ' if killed else 'PRZEŻYŁ  '), name, res)
    if not killed: survivors.append(name)
print('\nPrzeżyli:', survivors)
