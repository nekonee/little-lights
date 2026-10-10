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
 ('todayKey przez toISOString (stary błąd UTC)', D, "return dateKey(date.getFullYear(), date.getMonth() + 1, date.getDate());", "return date.toISOString().slice(0, 10);"),
 ('addDaysKey liczy w lokalnym czasie milisekundami', D, "const shifted = new Date(Date.UTC(parsed.year, parsed.month - 1, parsed.day) + days * DAY_MS);\n  return dateKey(shifted.getUTCFullYear(), shifted.getUTCMonth() + 1, shifted.getUTCDate());",
   "const shifted = new Date(parsed.year, parsed.month - 1, parsed.day);\n  shifted.setTime(shifted.getTime() + days * DAY_MS);\n  return dateKey(shifted.getFullYear(), shifted.getMonth() + 1, shifted.getDate());"),
]
TZS=['Europe/Warsaw','America/Los_Angeles','Pacific/Kiritimati','UTC']
def fresh():
    if os.path.exists(TMP):
        shutil.rmtree(TMP)
    os.makedirs(TMP)
    for d in ('js','tests'): shutil.copytree(f'{SRC}/{d}', f'{TMP}/{d}')
    shutil.copy(f'{SRC}/package.json', TMP)
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
