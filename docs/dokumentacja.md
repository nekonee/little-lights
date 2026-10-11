# Dokumentacja: Little Lights

Jak aplikacja działa i dlaczego tak. Dokument opisuje **stan obecny**. Co i kiedy się zmieniło, jest w dzienniku zmian,
a co dopiero będzie, w planie.

- [`../README.md`](../README.md): uruchamianie, testy, struktura katalogów.
- [`specyfikacja-dziennik-wdziecznosci.md`](specyfikacja-dziennik-wdziecznosci.md): wymagania i wygląd (palety, cytaty).
- [`plan.json`](plan.json): plan prac, ✅ = zrobione.
- [`dziennik-zmian.md`](dziennik-zmian.md): historia zmian i wyniki sprawdzeń.

Oznaczenie _(plan, pkt N)_ znaczy: jeszcze niezrobione, patrz punkt N w `plan.json`.

## 1. Założenia

- Aplikacja dla jednej osoby, robiona dla zabawy: bez kont, serwera i kosztów (hosting statyczny).
- Główne urządzenie: iPhone 14 (390×844 pt, notch), docelowo PWA na ekranie początkowym. Komputer pomocniczo.
- Interfejs po polsku, identyfikatory w kodzie po angielsku.
- Wygląd jest kluczowy: osiem motywów sezonowych, girlanda zimą, czcionka szeryfowa. **Palet nie zmieniamy bez akceptacji autorki.**
- Wpisy żyją tylko na urządzeniu. Prawdziwe wpisy nie trafiają do repozytorium ani do testów.

## 2. Architektura

Zwykłe pliki statyczne (`index.html`, CSS, moduły ES), bez budowania.

```text
index.html
├─ css/        tokens (motywy), base, components
└─ js/app.js   łączy moduły i trzyma stan wybranego dnia
   ├─ interfejs:      form, calendar, notice, history, summary, backup-panel, header, quote, themes, garland
   ├─ logika (czysta): dates, streak-summary, backup, calendar-model, drafts, today-sync, quotes
   ├─ czas:           draft-sync
   └─ dane:           store.js ── localStorage
```

- **Logika** to czyste funkcje bez DOM i `localStorage`, więc da się je testować w Node w kilku strefach czasowych.
- **`store.js`** jako jedyny dotyka `localStorage`.
- **Interfejs** tylko renderuje i podpina zdarzenia. Moduły dostają potrzebne funkcje z `app.js` (np. `onSave`) i nie znają się nawzajem.
- **`app.js`** trzyma wybrany dzień i stan bazowy formularza. Po zmianie danych woła `refreshAll()` (kalendarz, historia, seria, podsumowanie).

Przebieg głównych akcji:

- **Start:** nagłówek, motyw, girlandy, cytat, formularz na dziś, historia, seria, podsumowanie.
- **Wybór dnia:** kalendarz (`pickDay`) → `onSelectDate` → `app` wczytuje szkic, wpis albo pusty formularz.
- **Zapis:** wymaga min. jednej wdzięczności. Wpis trafia pod klucz dnia z `savedAt`, szkic dnia jest usuwany. Błąd zapisu daje komunikat i nic nie zmienia.
- **Usunięcie:** pytanie z datą, potem usunięcie wpisu i szkicu tego dnia.
- **Eksport:** JSON z wcięciem 2 spacji, plik `kopia-dziennika-wdziecznosci-YYYY-MM-DD.json`, przez okno udostępniania albo pobranie (sekcja 5).
- **Import:** JSON → `sanitizeEntries` → `mergeEntries` → zapis → raport. Błąd na dowolnym etapie nic nie zmienia.

## 3. Dane

| Klucz `localStorage`            | Zawartość                                         |
| ------------------------------- | ------------------------------------------------- |
| `gratitude_journal_entries_v1`  | wpisy kluczowane dniem `YYYY-MM-DD`               |
| `gratitude_journal_drafts_v1`   | szkice niezapisanych formularzy, kluczowane dniem |
| `gratitude_journal_theme`       | nazwa motywu, np. `zima-ciemny`                   |
| `gratitude_journal_last_backup` | dzień ostatniej kopii `YYYY-MM-DD` (poza kopią)   |

```json
{
  "2026-09-25": {
    "date": "2026-09-25",
    "grateful": ["…", "…", "…"],
    "why": "",
    "person": "",
    "proud": "",
    "lesson": "",
    "savedAt": 1790320511748
  }
}
```

- `grateful`: 1–3 niepuste teksty. `savedAt`: moment zapisu w ms (epoch).
- Plik kopii zapasowej to ten sam obiekt co w `localStorage`: jeden format, zgodny ze starymi kopiami.
- `_v1` w kluczu to wersja formatu. Zmiana formatu = `_v2` i migracja _(plan, pkt 1)_.
- **Adres decyduje o danych.** `localStorage` należy do adresu (protokół + domena + port), więc `localhost:8000`, strona
  publiczna i zainstalowana aplikacja mają osobne magazyny. Nowa przeglądarka zaczyna pusta, dane przenosi się plikiem
  kopii. Adres hostingu wybieramy przed pierwszym wpisem w PWA _(plan, pkt 4)_.
- **Prywatność:** `.gitignore` wyklucza `backups/` i `kopia-dziennika-*.json`. Na hosting trafia tylko kod.
- Dlaczego `localStorage`, a nie IndexedDB: to kilka kB tekstu rocznie, a ryzyko wyczyszczenia danych przez iOS łagodzi kopia zapasowa.

## 4. Daty

Cały kod w `js/dates.js`.

1. **Dzień** to tekst `YYYY-MM-DD` w czasie **lokalnym**, **miesiąc** to `YYYY-MM`. Moment zapisu to liczba ms.
2. Miesiące w kluczach i w API liczymy od 1.
3. **Nigdy `toISOString()` do dat.** Zamienia czas na UTC i przesuwa dzień. W prototypie wpis zrobiony między 0:00 a 2:00
   trafiał pod wczorajszą datę, a kropki i „dziś” w kalendarzu wypadały o dzień obok.
4. Rachunek na dniach (`addDaysKey`) idzie przez `Date.UTC`. Doby mają 23 lub 25 godzin (zmiana czasu), więc `setDate`
   i dodawanie milisekund na lokalnym `Date` się mylą.
5. Wyświetlanie przez `Intl` z jawnym `pl-PL` i `timeZone: 'UTC'` (wynik nie zależy od strefy ani ustawień telefonu),
   zawsze wielką literą: „Piątek, 25 września 2026”, „Wrzesień 2026”.

Funkcje: `dateKey`, `monthKey`, `keyFromLocalDate`, `todayKey`, `parseKey`, `isValidKey`, `monthOf`, `addDaysKey`,
`daysBetween`, `formatDatePL`, `formatMonthPL`. Niepoprawny klucz: `parseKey` daje `null`, `addDaysKey` i `daysBetween` rzucają `RangeError`,
funkcje formatujące zwracają tekst bez zmian.

## 5. Kopia zapasowa i import

Plik z zewnątrz to dane niezaufane. `sanitizeEntries` sprawdza każdy wpis:

- klucz musi być prawdziwym dniem (`2026-02-31` odpada) i wygrywa z polem `date`,
- `grateful`: 1–3 niepuste teksty (przycięte), inaczej wpis jest pomijany,
- `savedAt` to liczba, inaczej 0; pola tekstowe nie będące tekstem stają się puste; nieznane pola są odrzucane.

Niepoprawne wpisy są **pomijane z podaniem liczby**, żeby jeden zepsuty nie blokował odzyskania reszty.

**Scalanie** (`mergeEntries`): dla każdej daty zostaje wpis z większym `savedAt` (brak, tekst, `NaN` i wartości ujemne to 0),
żeby stara kopia nie nadpisała świeższej pracy. Przy remisie i przy tej samej treści (5 pól, z kolejnością wdzięczności)
zostaje wpis obecny. Wpis tylko w pliku jest dodawany, wpis tylko lokalny zostaje, a obecny wpis niebędący obiektem liczy się jak brak.
Wynik: `{ entries, added, updated, unchanged }`, argumenty nie są zmieniane. Raport: „Dodano: X, zaktualizowano: Y, bez zmian: Z”
(plus liczba pominiętych wpisów), a plik bez poprawnych wpisów daje „W pliku nie ma wpisów do wczytania”.

- **Usunięcia nie są synchronizowane.** Kopia to zbiór wpisów, nie historia zmian: usunięty wpis wróci po wczytaniu starszej kopii (podpowiedź jest w karcie kopii).
- **Importu nie da się cofnąć.** Zasada „nowszy wygrywa” chroni przed zwykłą pomyłką; przy zepsutym zegarze telefonu pomaga tylko inny plik kopii.
- Telefon i komputer nie synchronizują się. Dane przenosi się plikiem (eksport → AirDrop/Pliki/mail → import).

**Eksport** (`share.js`, `backup-panel.js`): plik `File` powstaje synchronicznie w kliknięciu (iOS gubi gest po `await`).
`pickExportMethod` wybiera okno udostępniania tylko wtedy, gdy `navigator.canShare({ files })` zwróci `true`, inaczej pobranie
linkiem. Zamknięcie okna (`AbortError`) nie jest błędem i nic nie zmienia; inny błąd okna uruchamia pobranie. Wybór pliku
przy imporcie akceptuje `.json,application/json` (węższe `accept` bywa na iOS wyszarzone).

**Licznik „Ostatnia kopia”** (`backupStatus`): dzień udanego eksportu (okno udostępniania zakończone albo pobranie) zapisuje się
w osobnym kluczu, poza plikiem kopii. Różnica liczona w dniach kalendarzowych (`daysBetween`): „dziś”, „wczoraj”, „X dni temu”.
Bez wpisów licznika nie ma, wpisy bez kopii (albo z zepsutą datą) dają „Jeszcze nie robiłaś kopii zapasowej”, a data z przyszłości
(przestawiony zegar) to „dziś”. Import licznika nie zmienia. Licznik odświeża się razem z resztą ekranu (`refreshAll`).
Aplikacja cicho prosi też o trwały magazyn (`navigator.storage.persist()`).

Zachowania **M1–M18** są na początku [`tests/backup.test.js`](../tests/backup.test.js) (M17–M18 w [`tests/share.test.js`](../tests/share.test.js)).

## 6. Kalendarz wyboru daty

Napisany od zera zamiast łatania prototypu: `setMonth(±1)` przeskakiwał miesiące (31 stycznia + 1 = 3 marca), stanem był
obiekt `Date`, komórki były `div`, a popover pływał nad formularzem. Bez biblioteki, bo własny kod daje pełną kontrolę
nad dostępnością i ośmioma motywami.

**Budowa.** `calendar-model.js` to czyste reguły (siatka, przesuwanie miesięcy, opis komórki, reduktor stanu),
`calendar.js` tylko rysuje i podpina zdarzenia, a wpisy i szkice dostaje z `app.js` przez `setEntries`. Stan to
`{open, viewYear, viewMonth, selected}`: **bez dnia widoku**, więc nie ma czego przeskoczyć.

Model: `monthGrid(y, m)`, `shiftMonth(view, delta)`, `isFuture`, `canGoNext`, `describeCell`, `createCalendarState`,
`calendarReducer`. Akcje: `toggle`, `close`, `prev`, `next`, `pickDay`, `goToToday`, `select` (zmiana z zewnątrz, np. „edytuj”).

**Zachowania.** Siatka ma zawsze 42 komórki (6×7) od poniedziałku. Miesiące przesuwają się na liczbach, więc z każdego miesiąca w obie strony i przez granicę roku. „Dalej” jest wyłączone w bieżącym miesiącu, a dni z przyszłości nie da się wybrać. Otwarcie panelu pokazuje miesiąc wybranego dnia; wybór dnia go zaznacza i zamyka panel (dzień z sąsiedniego miesiąca przełącza widok). „Dziś” wybiera dziś i wraca do bieżącego miesiąca. Dzień ze szkicem ma pustą kropkę, a gdy ma też wpis, wygrywa znacznik wpisu. Reduktor nie zmienia stanu wejściowego, a nieznana akcja rzuca wyjątek.

Pełna lista **K1–K23** jest na początku [`tests/calendar-model.test.js`](../tests/calendar-model.test.js), a numer K stoi na początku nazwy każdego testu.

**Sprawdzane ręcznie** (390×844): komórki i strzałki to `<button>` ≥ 44×44 pt z `aria-label`, `aria-pressed`,
`aria-current`; panel rozwija się w karcie; kropki odświeżają się po zapisie, usunięciu i imporcie; wszystkie motywy
czytelne; brak błędów w konsoli i przewijania poziomego; wybór dnia z wpisem wczytuje wpis.

### Kolory kalendarza

Tylko tokeny motywu z `css/tokens.css`. Wyjątek: biały (`#fff`) na wybranym dniu, który zniknie z `--on-accent` _(plan, pkt 15)_.

| Stan                        | Tło             | Cyfra                 | Znacznik                                   |
| --------------------------- | --------------- | --------------------- | ------------------------------------------ |
| zwykły dzień                | brak            | `--ink`               | brak                                       |
| dzień sąsiedniego miesiąca  | brak            | `--muted`, krycie 0,4 | brak                                       |
| dzień z przyszłości         | brak            | `--muted`, krycie 0,3 | brak                                       |
| „dziś”                      | brak            | `--ink`               | obrys 1 px `--accent`                      |
| dzień z wpisem              | `--accent-soft` | `--ink`               | pełna kropka 5 px `--accent`               |
| wpis z sąsiedniego miesiąca | `--accent-soft` | `--muted`, krycie 0,8 | pełna kropka `--accent`                    |
| dzień ze szkicem, bez wpisu | brak            | `--ink`               | pusta kropka 7 px, linia 1,5 px `--accent` |
| wybrany dzień               | `--accent`      | biały                 | kropka lub obrys w kolorze białym          |
| wskazanie (hover)           | `--accent-soft` | bez zmian             | nie dotyczy dnia wybranego                 |

Strzałki i ramki: obramowanie `--border`. Tytuł miesiąca: `--accent2`. Dni tygodnia: `--muted`.

Wartości tokenów (z `css/tokens.css`):

| Motyw            | `--card`  | `--ink`   | `--muted` | `--accent` | `--accent-soft` |
| ---------------- | --------- | --------- | --------- | ---------- | --------------- |
| 🍂 jesień jasny  | `#fffaf3` | `#3d2418` | `#8f6a54` | `#c1592a`  | `#f6dcb8`       |
| 🍂 jesień ciemny | `#2f1e16` | `#f3e3d3` | `#c39d81` | `#e2793f`  | `#43291b`       |
| ❄️ zima jasny    | `#ffffff` | `#1f3b34` | `#7893a0` | `#2f6e52`  | `#dcebf0`       |
| ❄️ zima ciemny   | `#151f2f` | `#e4edf2` | `#7f92a3` | `#5f9bc7`  | `#1c2c40`       |
| 🌿 wiosna jasny  | `#fbfaf5` | `#33402e` | `#7c8a6d` | `#7c9473`  | `#e3e8d6`       |
| 🌿 wiosna ciemny | `#212b1c` | `#e6e9dd` | `#93a184` | `#8fae7f`  | `#2c3524`       |
| 🌊 lato jasny    | `#ffffff` | `#163a4a` | `#5f7f8a` | `#2f8fd1`  | `#d7eefb`       |
| 🌊 lato ciemny   | `#20213f` | `#f3e3cf` | `#a29fc2` | `#c9506b`  | `#2d2a4d`       |

Kontrast (WCAG): cyfry mają ponad 8:1, obrys szkicu co najmniej 3,17:1 we wszystkich motywach. Słabsze są: pełna kropka
na kafelku (wiosna jasny 2,65:1, lato jasny 2,93:1) i biały tekst na wybranym dniu (poniżej 4,5:1 w sześciu motywach,
najniżej wiosna ciemny 2,46:1). Poprawa wymaga zgody autorki _(plan, pkt 15)_.

## 7. Szkice niezapisanych wpisów

Nic, co wpisujesz, nie może zniknąć przy zmianie dnia, odświeżeniu ani zabiciu aplikacji przez iOS. Szkic to kopia
robocza formularza, osobna od wpisów.

**Zasada.** Aplikacja pamięta, z czym formularz został wczytany (**stan bazowy**: wpis tego dnia albo pusty formularz).
Gdy pola się od niego różnią, zapisuje szkic dnia. Gdy są takie same albo puste, szkic usuwa. Przy wczytaniu dnia
pierwszeństwo ma szkic, potem wpis, potem pusty formularz.

```json
{
  "2026-10-07": {
    "grateful": ["kawa", "", "spacer"],
    "why": "",
    "person": "",
    "proud": "",
    "lesson": "",
    "updatedAt": 1790320511748
  }
}
```

Szkic trzyma wartości **surowe i pozycyjne** (zawsze 3 pola wdzięczności na swoich miejscach), żeby formularz wrócił
dokładnie taki, jaki był. Do porównań pola są normalizowane (przycięte, bez pustych wdzięczności).

**Budowa.** `drafts.js`: czysta logika (normalizacja, porównanie, `draftDecision`, `updateDrafts`, `chooseFormSource`,
`formMode`, `afterImport`, `sanitizeDrafts`). `draft-sync.js`: tylko czas zapisu (opóźnienie 500 ms albo wymuszenie).
`store.js`: `loadDrafts`/`saveDrafts`. `form.js` i `app.js`: odczyt pól, wskaźnik, przycisk „Odrzuć szkic”.

**Zachowania.** Szkic zapisuje się 500 ms po ostatnim znaku, a od razu przy zmianie dnia, ukryciu aplikacji i `pagehide`. Pusty formularz ani formularz równy stanowi bazowemu szkicu nie tworzą (różnica tylko w spacjach też nie). Wczytanie dnia: szkic, potem wpis, potem pusty formularz; szkic pusty albo równy wpisowi jest ignorowany i usuwany. Szkic znika po zapisie wpisu, po „Odrzuć szkic” (z potwierdzeniem) i po usunięciu wpisu. Po imporcie nietknięty formularz odświeża się, a z wpisanym tekstem zostaje z ostrzeżeniem. Szkice nie wchodzą do eksportu, serii, podsumowania ani historii, a uszkodzone dane szkiców nie wywracają aplikacji. Przy szkicu wskaźnik w formularzu mówi „📝 Szkic — jeszcze niezapisany” (dzień bez wpisu) albo „📝 Szkic zmian — wpis z tego dnia nie jest jeszcze zaktualizowany”.

Pełna lista **S1–S23** jest na początku [`tests/drafts.test.js`](../tests/drafts.test.js), a numer S stoi na początku nazwy każdego testu.

Szkice nie są w kopii zapasowej i nie wygasają same: tekst znika tylko przez zapis, odrzucenie albo usunięcie wpisu.

## 8. Powrót do dziś

PWA na iPhonie miesiącami żyje w tle. Bez tego po powrocie pokazywałaby wczorajszą datę, a nowy wpis trafiłby pod zły dzień.

- **Zimny start:** zawsze dziś. Gdy jest szkic z innego dnia, baner „📝 Masz niezapisany szkic z dnia … [Otwórz]”.
- **Powrót z tła** (`visibilitychange`, `pageshow` po bfcache): po co najmniej 10 minutach albo po zmianie dnia przechodzimy na dziś,
  także przy rozgrzebanym formularzu, bo szkic zapisał się przy ukryciu aplikacji (potem baner o tym szkicu). Krótkie przełączenie nic nie rusza.
- **Północ przy otwartej aplikacji:** jeśli była wybrana „dziś” i formularz jest nietknięty, po cichu przechodzimy na nowy dzień.
  Gdy właśnie piszesz, nie przerywamy: baner „🌅 Jest już nowy dzień. [Przejdź do dziś]”, a tekst zostaje pod starym dniem.
  Jeśli wybrany był inny dzień, wybór zostaje.
- Po zmianie dnia odświeżają się data w nagłówku, wskaźnik „Nowy wpis na dziś”, pierścień „dziś” w kalendarzu, seria i podsumowanie.
- Dzień liczymy za każdym razem od nowa z zegara urządzenia. Timer do północy tylko przypomina (iOS usypia timery w tle),
  a źródłem są zdarzenia powrotu.

**Budowa.** `today-sync.js`: czysta logika (`decideSync`, `msUntilNextDay`, `findOtherDraft`), zachowania T1–T12 są na początku
[`tests/today-sync.test.js`](../tests/today-sync.test.js). `notice.js`: baner. `app.js`: `syncToday`, zdarzenia i timer.

## 9. Interfejs

- **Bezpieczny DOM.** Elementy powstają przez `h()` z `dom.js`, teksty jako węzły tekstowe. Bez `innerHTML` z tekstem
  użytkownika, więc `<b>` w polu wyświetla się jako zwykły tekst, a plik kopii nie wstrzyknie kodu.
- **Teksty** tworzone w JS są w `strings.js`, statyczne w `index.html`.
- **Motywy.** Osiem (4 pory roku × jasny/ciemny) jako zmienne CSS w `tokens.css`, przełączane przez `data-theme`.
  Kolory w CSS tylko jako zmienne motywu (wyjątek: 5 stałych kolorów żarówek). Domyślny: jesień jasny, wybór zapamiętany.
- **Emoji pór roku:** 🍂 ❄️ 🌿 🌊, jedno źródło prawdy (`SEASON_EMOJI`). Lista motywów i historia jeszcze używają starych _(plan, pkt 16)_.
- **Girlanda** (motywy zimowe, najbardziej lubiany detal): zwisające łuki sznurka od krawędzi do krawędzi i okrągłe żarówki
  na oprawkach z miękką poświatą. `garland-model.js` to czysta geometria (łuki Béziera, żarówki, kolory, rytm migotania
  zależne tylko od szerokości i ziarna; zachowania G1–G12 na początku [`tests/garland-model.test.js`](../tests/garland-model.test.js)),
  `garland.js` rysuje SVG i mierzy szerokość w pikselach (`ResizeObserver`), więc przebudowuje się przy obrocie ekranu, zmianie
  okna i przełączeniu na motyw zimowy. SVG ma `viewBox` równy szerokości w px, więc żarówki są kółkami, nie owalami.
  Żarówek jest ok. jedna na 30 px, łuków jedno na 110 px, a każda girlanda ma własne ziarno (inny zwis, kolory, opóźnienia).
  Sąsiednie żarówki nigdy nie mają tego samego koloru. Migotanie to tylko `opacity` (2,2–3,0 s, ujemne opóźnienia z generatora
  z ziarnem, więc nie ma mechanicznego okresu), wstrzymane poza ekranem (`IntersectionObserver`) i wyłączone przy
  `prefers-reduced-motion`. Sznurek ma kolor `--muted` z kryciem 0,5. Wysokość kontenera jest stała (40 px), więc układ nie skacze.
- **Cytaty:** oryginalne sentencje bez autorów (`quotes.js`), żeby nie przypisywać prawdziwym osobom słów, których nie powiedziały.
- **Seria dni:** liczona wstecz po kluczach dni od dziś, a gdy dziś nie ma wpisu, od wczoraj, żeby nie spadała do zera przed napisaniem.
- **Podsumowanie miesiąca:** liczba wpisów, najdłuższa seria, do 3 osób, 3 losowe chwile. Osoby liczone w `Map`, bo imię „constructor” psuło zwykły obiekt.

## 10. Testy i narzędzia

- `npm start`: serwer `tools/dev-server.py` z `Cache-Control: no-store` (moduły ES nie działają z `file://`, a zwykły serwer pozwalał przeglądarce trzymać stare pliki). `npm test`: `node --test`, bez zależności.
- Testy idą w czterech strefach: `Europe/Warsaw`, `America/Los_Angeles`, `Pacific/Kiritimati`, `UTC`. Czas w testach powstaje lokalnie (`new Date(rok, m, d, h)`).
- Zasady testów: oczekiwane wartości z niezależnego źródła (nie liczone testowanym kodem), własności sprawdzane pętlą po wielu latach, test regresyjny dla każdego znanego błędu, granice zamiast samego środka, numer zachowania (K, S) w nazwie testu.
- **Test musi dać się oblać:** `python3 tools/mutation-check.py` psuje kod na kopii (stare `toISOString`, tydzień od niedzieli, brak blokady przyszłości…) i sprawdza, że testy to wykrywają. Usterka, która przeżyje, to słaby test.
- Interfejs (DOM) nie ma testów automatycznych: sprawdzamy go ręcznie w podglądzie 390×844 w kilku motywach (zawsze też zimowych).
  Scenariusze w prawdziwej przeglądarce są w `tools/scenarios/` (powrót do dziś, girlanda, kopia zapasowa z atrapą okna udostępniania; otwiera się je po `npm start`, zachowują i przywracają `localStorage`). Playwright odłożony jako zbyt ciężki na tę skalę.
- Prettier i `.editorconfig`. `legacy/` to prototyp do porównań, nie część aplikacji.

## 11. iOS i PWA

- **Osobny magazyn danych** zainstalowanej aplikacji (patrz „Adres decyduje o danych”).
- **Ikona:** rudy kotek śpiący pod girlandą na żurawinowym tle (`assets/icon-source.svg`), stała i niezależna od motywu sezonowego.
  Pliki PNG (pełne tło, bez przezroczystości) są w `assets/icons/` (120–512 px) oraz jako `apple-touch-icon.png` w katalogu głównym.
  Podpięta w `<head>` jako `apple-touch-icon.png?v=1` (180 px) i w manifeście (192 i 512 px). Zmiana ikony: podbić `?v=` i dodać aplikację do ekranu od nowa.
- **Manifest i tagi w `<head>`** (statyczne, bez JS): `manifest.json` (nazwa i `short_name` „Little Lights”, `lang` pl, `display` standalone,
  `start_url` i `scope` `./`, kolory `#fbf0e2` z motywu domyślnego, ikony 192 i 512) oraz tagi Apple (tryb aplikacji, tytuł pod ikoną,
  pasek statusu `black-translucent`, `format-detection telephone=no`). Wszystkie ścieżki są względne, bo aplikacja stoi pod adresem
  z podkatalogiem (`…/little-lights/`). Manifest i ikona są czytane przy instalacji; zmiana nazwy lub koloru wymaga ponownego dodania aplikacji.
  Zachowania P1–P9 są na początku [`tests/pwa.test.js`](../tests/pwa.test.js).
- **Ikona i ekran startowy są czytane raz, przy instalacji.** Zmiana = usunąć aplikację i dodać ponownie; podbijamy wersję w nazwie pliku.
- **Timery w tle są usypiane**, więc o zmianie dnia decydują zdarzenia powrotu (`visibilitychange`, `pageshow`), a nie timer.
- **Aplikacja może zostać zamknięta bez ostrzeżenia**, stąd natychmiastowy zapis szkicu przy ukryciu i `pagehide`.
- **Share Sheet** (`navigator.share`) musi być wywołany bezpośrednio w kliknięciu, bez wcześniejszych `await` (tak jest zrobiony eksport).
- **Pola poniżej 16 px powodują zoom** po dotknięciu; dziś mają ok. 15 px _(plan, pkt 12)_.
- **Safe area i notch:** `viewport-fit=cover` i odstępy `env(safe-area-inset-*)` na górze i na dole kontenera są zrobione (pasek statusu jest półprzezroczysty, więc treść nie może wejść pod zegar). Boki i pozostałe poprawki iPhone'a: _(plan, pkt 13)_.

## 12. Znane ograniczenia

- Okno udostępniania i wybór pliku w Plikach nie były sprawdzone na prawdziwym iPhonie (w przeglądarce działa atrapa); trzeba to zrobić po wdrożeniu PWA _(pkt 2–6)_.
- Zły zegar telefonu może dać wpis „z przyszłości”, który wygrywa przy imporcie ze wszystkim.
- Notka pod kartą kopii nadal mówi „Otwieraj ten sam plik”, co po wdrożeniu PWA przestanie być prawdą _(pkt 2–6)_.
- „Zapisano ✓” znika od razu po zapisie; ostrzeżenia i błędy szkicu dzielą z nim jedną linię statusu _(pkt 17)_.
- Systemowe `confirm()` przy usuwaniu wpisu i odrzucaniu szkicu _(pkt 13)_.
- Na ekranie 320 px (iPhone SE) lista motywów w nagłówku wystaje poza ekran i powoduje przewijanie poziome _(pkt 12)_.
- Wpis z datą z przyszłości widać w historii, ale „edytuj” nic nie robi (K16).
- Dwie karty tej samej przeglądarki mogą nadpisać szkic tego samego dnia (wygrywa ostatni zapis).
- Powrót do dziś sprawdzono w Chrome z podmienionym zegarem. Nic nie sprawdzono na prawdziwym iPhonie ani czytnikiem ekranu.

## 13. Decyzje

`(plan, pkt N)` = jeszcze niezrobione.

- **D1 PWA, nie aplikacja natywna.** Darmowa, prototyp już działa, konto deweloperskie Apple jest płatne. _(plan)_
- **D2 Bez frameworka, bundlera i TypeScriptu.** Mało kodu, mniej narzędzi, hosting statyczny działa bez budowania.
- **D3 Własny kalendarz, bez biblioteki.** Pełna kontrola nad dostępnością i ośmioma motywami.
- **D4 Dzień to `YYYY-MM-DD` w czasie lokalnym, także w JSON.** Zgodność z kopią, koniec błędu UTC.
- **D5 Rachunek na dniach przez `Date.UTC`.** Odporność na zmianę czasu.
- **D6 Miesiące od 1 w API dat.** Zgodność z zapisem w kluczu.
- **D7 Daty przez `Intl` (pl-PL, UTC), wielką literą.** Poprawna odmiana bez własnych tabel.
- **D8 Kopia to JSON w kształcie magazynu.** Jeden format, zgodny ze starymi kopiami.
- **D9 Import pomija niepoprawne wpisy zamiast odrzucać plik.** Jeden zły wpis nie blokuje reszty.
- **D10 Import: wygrywa nowszy wpis (`savedAt`).** Stara kopia nie nadpisze świeżej pracy.
- **D11 Usunięcia nie są synchronizowane.** Prostota formatu; znaczniki usunięcia komplikowałyby kopię.
- **D12 Niezapisane dane trafiają do szkicu.** Nic nie ma zniknąć przy zmianie dnia, w tle ani przy zabiciu aplikacji.
- **D13 Powrót do dziś: zimny start zawsze dziś, z tła po ≥ 10 min lub zmianie dnia, północ w trakcie pisania nie przerywa.** PWA miesiącami żyje w tle, a nowy wpis nie może trafić pod wczorajszą datę.
- **D14 Dni z przyszłości są nieaktywne.** Dziennik opisuje to, co było (zatwierdzone przez autorkę).
- **D15 Ikona jako PNG z pełnym kwadratowym tłem.** iOS czyta ją raz, ignoruje SVG, a przezroczystość wypełnia czernią. _(plan, pkt 3)_
- **D16 Ekran startowy w dwóch warstwach** (statyczny obraz systemowy + animowany ekran w aplikacji). iOS pozwala tylko na statyczny. _(plan, pkt 21)_
- **D17 Animujemy tylko `transform` i `opacity`.** Gradienty i filtry SVG są kosztowne na iOS. _(girlanda: zrobione; ekran startowy: plan, pkt 21)_
- **D18 `prefers-reduced-motion`: bez ruchu.** Dostępność i bateria. _(plan)_
- **D19 Emoji pór roku: 🍂 ❄️ 🌿 🌊.** Wybór autorki (🌸 i ☀️ za oczywiste). _(plan, pkt 16)_
- **D20 Palety zmieniamy tylko po akceptacji autorki, kontrast pokazujemy przed/po.** To jej decyzja estetyczna. _(plan, pkt 15)_
- **D21 Service worker: najpierw sieć, potem cache.** Cache-first długo pokazywałby starą wersję. _(plan, pkt 19)_
- **D22 Eksport przez Share Sheet, pobranie linkiem tylko zapasowo.** Na iOS zwykłe pobieranie działa inaczej; na komputerze nic nie wyróżniamy, bo aplikacja jest głównie na telefon.
- **D23 Prywatne kopie poza repozytorium.** Wpisy są prywatne, a repozytorium może być publiczne.
- **D24 Teksty w `strings.js`, logika bez DOM, jeden dostęp do danych.** Testowalność i jeden punkt zmiany.
- **D25 Bez `innerHTML` z tekstem użytkownika.** Bezpieczeństwo importu.
- **D26 Osoby w podsumowaniu liczone w `Map`.** Imię „constructor” psuło zwykły obiekt.
- **D27 Cytaty bez autorów.** Nie przypisujemy prawdziwym osobom nie ich słów.
- **D28 Stan kalendarza to rok i miesiąc, bez `Date` i dnia.** Usuwa przyczynę przeskoków `setMonth`.
- **D29 Reguły kalendarza w czystym module z reduktorem.** Da się je sprawdzić w Node w kilku strefach.
- **D30 Panel kalendarza rozwija się w karcie.** Bez `z-index`, przycinania i kłopotów z klawiaturą ekranową.
- **D31 Dzień z wpisem: kafelek `--accent-soft` + kropka `--accent`.** Dawna kropka `--gold` była słabo widoczna. Istniejące tokeny, palety bez zmian; zaakceptowane przez autorkę.
- **D32 Bez testów przeglądarkowych (Playwright) na razie.** Ciężkie jak na tę skalę; do ponownej oceny.
- **D33 Serwer deweloperski bez cache'u.** Zwykły serwer pozwalał trzymać stare pliki.
- **D34 Szkice w osobnym kluczu.** Nie mogą wpływać na serię, podsumowanie, eksport ani oznaczenia wpisów.
- **D35 Szkic trzyma wartości surowe, porównania idą po normalizacji.** Formularz wraca taki, jaki był, bez fałszywych szkiców.
- **D36 Pusty formularz nie jest szkicem.** Brak pustych szkiców, a wpis zawsze da się odzyskać.
- **D37 Zapis szkicu po 500 ms i wymuszony przy zmianie dnia, ukryciu, `pagehide`.** iOS może uśpić aplikację bez ostrzeżenia.
- **D38 „Odrzuć szkic” z potwierdzeniem.** Skasowanie napisanego tekstu jest nieodwracalne. _(własne okno: pkt 13)_
- **D39 Po imporcie nietknięty formularz odświeżamy, rozgrzebany zostawiamy z ostrzeżeniem.** Zapis nie nadpisze po cichu zaimportowanego wpisu.
- **D40 Szkice poza kopią zapasową i bez wygasania.** To robocza kopia chwili; tekst znika tylko z decyzji autorki.
- **D41 Szkic w kalendarzu to pusta kropka, wpis wygrywa.** Wyraźnie inna niż pełna kropka, kontrast ≥ 3:1; obrys komórki zajmuje „dziś”.
- **D42 Dokumentacja opisuje tylko stan obecny, historia w dzienniku zmian.** Krótszy dokument jest aktualny i czytelny.
- **D43 Północ w trakcie pisania: baner z propozycją przejścia od razu, nie po zapisie.** Nie przerywa pisania, a od razu widać, że to już nowy dzień.
- **D44 Baner szkicu z innego dnia tylko przy starcie i po powrocie na dziś, nie przy każdej nawigacji.** Żeby nie był natrętny; pusta kropka w kalendarzu przypomina cały czas.
- **D45 Girlanda mierzona w pikselach, bez `preserveAspectRatio="none"`.** Stały `viewBox` 640 rozciągał żarówki w owale na wąskim telefonie.
- **D46 Sznurek girlandy w kolorze `--muted` (krycie 0,5) zamiast `--border`.** W zima jasny `--border` był prawie niewidoczny na białym tle. Istniejący token, palety bez zmian. Zaakceptowane przez autorkę po porównaniu zrzutów przed/po (390 px, zima jasny).
- **D47 Poświata żarówek gradientem, migotanie tylko `opacity`, pauza poza ekranem.** Filtry SVG i animacje gradientów są ciężkie na iOS, a ukryte girlandy nie powinny zużywać baterii.
- **D48 Import bez cofania.** Aplikacja jest dla zabawy, a „nowszy wygrywa” z raportem wystarcza; cofanie podwajałoby dane i dodawało kod, którego autorka nie potrzebuje (jej decyzja).
- **D49 Remis `savedAt` i ta sama treść to „bez zmian”, bez osobnej liczby konfliktów.** Remis z różną treścią zdarza się tylko przy wpisach bez `savedAt`, a prostszy raport jest czytelniejszy.
- **D50 „Ostatnia kopia” w osobnym kluczu i liczona w dniach kalendarzowych.** Zapis licznika nie może psuć eksportu ani trafiać do pliku, a zmiana czasu nie może przesuwać wyniku.
- **D51 Ikona: kotek pod girlandą na żurawinie, jedna przez cały rok.** Wybór autorki spośród czterech projektów (girlanda, kubek, słoik, kotek); ciepła, „cozy” ikona ma cieszyć o każdej porze. Czerwona żarówka zamieniona na kremową, żeby nie ginęła na czerwonym tle.
- **D52 Nazwa „Little Lights” wszędzie:** manifest, tytuł pod ikoną, `<title>`, nagłówek w aplikacji (`APP_TITLE`) i nazwa repozytorium. Spójność wybrana przez autorkę; stara nazwa „Dziennik Wdzięczności” zostaje tylko w dokumentach projektu i w `legacy/`.
- **D53 `black-translucent` razem z odstępami na safe area.** Półprzezroczysty pasek statusu wciąga treść pod zegar i notch, więc tag i odstępy idą w jednym kroku (początek punktu 13).

## 14. Konwencje

- Komentarze tylko tam, gdzie kod sam nie tłumaczy powodu. Stałe zamiast magicznych liczb. Dostępność jako standard (`lang="pl"`, `<label>`, `<button>`, kontrast).
- Commity małe, z opisem „po co”. Jeden punkt planu w osobnym commicie.
- **Praca nad punktem planu:** krótki opis zachowań → testy przed kodem (najpierw czerwone) → kod → kontrola przez psucie kodu → sprawdzenie w przeglądarce 390×844 → aktualizacja planu, dokumentacji i dziennika zmian.
- **Gdzie co zapisujemy:** reguły i powody decyzji w tym dokumencie (krótko, tylko stan obecny), nowa decyzja jako kolejne `D`;
  co się zmieniło i wyniki sprawdzeń w `dziennik-zmian.md`; co jest do zrobienia w `plan.json`.
