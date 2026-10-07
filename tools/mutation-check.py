#!/usr/bin/env python3
"""Kontrola testów kalendarza przez psucie kodu (mutation testing „na piechotę”).

Dla każdej celowej usterki w kopii kodu (poza repozytorium) uruchamia testy kalendarza w czterech
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
    r=subprocess.run(['node','--test','tests/calendar-model.test.js'],cwd=TMP,env={**os.environ,'TZ':tz},capture_output=True,text=True)
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
