# Dokumentacja projektu: Dziennik Wdzięczności

Ten dokument tłumaczy, **jak aplikacja działa** i **dlaczego zrobiono ją tak, a nie inaczej**. Kto wraca do kodu po
miesiącu (albo trafia tu pierwszy raz), powinien tu znaleźć powód każdej ważniejszej decyzji, zanim ją zmieni.

Pozostałe dokumenty:

| Plik                                                                             | Do czego służy                                                         |
| -------------------------------------------------------------------------------- | ---------------------------------------------------------------------- |
| [`../README.md`](../README.md)                                                   | Szybki start: uruchamianie, testy, struktura katalogów, format danych. |
| [`specyfikacja-dziennik-wdziecznosci.md`](specyfikacja-dziennik-wdziecznosci.md) | Co aplikacja ma robić i jak wyglądać (wymagania, palety, cytaty).      |
| [`plan.json`](plan.json)                                                         | Plan prac z priorytetami i stanem wykonania (✅ = zrobione).           |
| Ten plik                                                                         | Architektura, zasady i rejestr decyzji.                                |

Dokument opisuje stan faktyczny (ostatnia aktualizacja: 07.10.2026, po punkcie 8 planu i uwagach autorki). Rzeczy zaplanowane, ale jeszcze niezrobione, są oznaczone **(planowane, punkt N)**,
gdzie N to numer punktu w `plan.json`.

---

## 1. Założenia

- **Dla jednej osoby.** Aplikacja jest prywatnym dziennikiem, robionym dla zabawy. Nie ma kont, serwera ani
  udostępniania.
- **Za darmo.** Zero kosztów: hosting statyczny, brak backendu, brak płatnych usług.
- **Telefon jest głównym miejscem pracy:** iPhone 14 (ekran 390×844 pt, notch). Docelowo PWA dodana do ekranu
  początkowego. Komputer służy pomocniczo.
- **Język interfejsu: polski.** Identyfikatory w kodzie są po angielsku, teksty widoczne dla użytkowniczki po polsku.
- **Wygląd jest ważną częścią aplikacji:** osiem motywów sezonowych, girlanda światełek zimą, szeryfowa typografia.
  Zmiany palet kolorów robimy **wyłącznie po akceptacji autorki** (to jej wybór estetyczny).
- **Prywatność przede wszystkim.** Wpisy żyją tylko na urządzeniu. Do repozytorium i do testów nigdy nie trafiają
  prawdziwe wpisy.

## 2. Jak to działa w skrócie

Aplikacja to zwykłe pliki statyczne: `index.html`, trochę CSS i moduły JavaScript. Nie ma kroku budowania.

```text
przeglądarka
  └─ index.html
       ├─ css/ (tokens, base, components)
       └─ js/app.js ── łączy moduły, trzyma jedyny stan (wybrany dzień)
            ├─ interfejs: form, calendar, history, summary, backup-panel, header, quote, themes, garland
            ├─ logika (czyste funkcje): dates, streak-summary, backup, calendar-model, quotes
            └─ dostęp do danych: store.js ── localStorage
```

### Warstwy i dlaczego są rozdzielone

1. **Logika** (`dates.js`, `streak-summary.js`, `backup.js`, `calendar-model.js`, `quotes.js`): czyste funkcje, bez DOM i bez
   `localStorage`. Dzięki temu da się je testować w Node, w kilku strefach czasowych, bez przeglądarki. To właśnie
   w tej warstwie były błędy z datami, więc tu jest najwięcej testów.
2. **Dostęp do danych** (`store.js`): jedyne miejsce, które dotyka `localStorage`. Gdy kiedyś zmieni się sposób
   przechowywania (np. IndexedDB), zmienia się jeden plik.
3. **Interfejs** (`form`, `calendar`, `history`, `summary`, `backup-panel`, `header`, `quote`, `themes`, `garland`):
   cienka warstwa, która tylko renderuje i podpina zdarzenia. Każdy moduł dostaje potrzebne funkcje z `app.js` jako
   argumenty (np. `onSave`, `onSelectDate`), więc nie zna pozostałych.
4. **`app.js`**: punkt startowy i właściciel stanu danych (`state.selectedDate`). Po każdej zmianie danych woła
   `refreshAll()`, który przerysowuje kalendarz (kropki), historię, serię i podsumowanie z aktualnych danych. Stan samego
   wyglądu kalendarza (czy panel jest otwarty, jaki miesiąc widać) jest osobno, w reduktorze `calendar-model.js`.

### Co się dzieje przy najważniejszych akcjach

| Akcja          | Przebieg                                                                                                                                                                                                                                                                                                    |
| -------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Start**      | Ustaw datę w nagłówku i motyw, zbuduj girlandy, wylosuj cytat, wczytaj formularz dla dzisiejszego dnia, narysuj historię, serię i podsumowanie.                                                                                                                                                             |
| **Wybór dnia** | Dotknięcie dnia w kalendarzu trafia do reduktora (`pickDay`). Jeśli wybrany dzień się zmienił, `calendar` woła `onSelectDate(klucz)`, a `app` wczytuje wpis (lub pusty formularz), ustawia tekst przycisku („Zapisz wpis” / „Zapisz zmiany”) i wskaźnik trybu. Przycisk „Dziś” to `goToToday()` w `app.js`. |
| **Zapis**      | Odczyt pól (z przycięciem spacji), wymagana minimum jedna wdzięczność. Wpis trafia pod klucz wybranego dnia z `savedAt = Date.now()`. Jeśli zapis się nie uda (pełny magazyn), użytkowniczka dostaje komunikat, a stan się nie zmienia.                                                                     |
| **Usunięcie**  | Pytanie z czytelną datą, potem usunięcie z magazynu i `refreshAll()`.                                                                                                                                                                                                                                       |
| **Eksport**    | Wszystkie wpisy jako JSON z wcięciem 2 spacji, plik `kopia-dziennika-wdziecznosci-YYYY-MM-DD.json` (lokalna data).                                                                                                                                                                                          |
| **Import**     | Wczytaj tekst, sprawdź JSON, zwaliduj wpisy (`sanitizeEntries`), scal z obecnymi, zapisz, odśwież. Błąd na dowolnym etapie przerywa import i nic nie zmienia.                                                                                                                                               |

## 3. Dane

### Gdzie i w jakim kształcie

| Klucz `localStorage`           | Zawartość                                    |
| ------------------------------ | -------------------------------------------- |
| `gratitude_journal_entries_v1` | Obiekt wpisów kluczowany dniem `YYYY-MM-DD`. |
| `gratitude_journal_theme`      | Nazwa wybranego motywu, np. `zima-ciemny`.   |

Wpis:

```json
{
  "date": "2026-09-25",
  "grateful": ["…", "…", "…"],
  "why": "",
  "person": "",
  "proud": "",
  "lesson": "",
  "savedAt": 1790320511748
}
```

- `grateful`: od 1 do 3 niepustych tekstów. `savedAt`: moment ostatniego zapisu w milisekundach (epoch).
- Plik kopii zapasowej to **dokładnie ten sam obiekt** co w `localStorage`. Dzięki temu nie ma osobnego formatu
  eksportu do utrzymywania, a stara kopia z prototypu wczytuje się bez zmian.
- Przyrostek `_v1` w kluczu to wersja formatu. Przy zmianie formatu powstanie `_v2` i funkcja migracji
  **(planowane, punkt 1)**.

### Dlaczego `localStorage`, a nie coś większego

Wpisy to kilka kilobajtów tekstu rocznie, a prototyp już używał `localStorage`. IndexedDB dałoby więcej miejsca
i transakcje, ale kosztowałoby kod, którego ta skala nie potrzebuje. Ryzyko (iOS może wyczyścić dane strony
w skrajnych przypadkach) łagodzimy kopią zapasową, a nie zmianą technologii.

### Adres decyduje o danych

`localStorage` jest przypisany do **adresu strony** (origin: protokół + domena + port). Konsekwencje:

- `localhost:8000`, adres publiczny i zainstalowana aplikacja na telefonie mają **trzy osobne magazyny**.
- Zmiana adresu hostingu (nazwy użytkownika, repozytorium, domeny) oznacza pusty magazyn. Dlatego adres wybieramy
  **przed pierwszym wpisem w PWA** (punkt 4), a dane przenosimy przez plik kopii.

### Prywatność

- `.gitignore` wyklucza `backups/` i `kopia-dziennika-*.json`. Prywatna kopia leży w `backups/`.
- Na hosting trafia wyłącznie kod. Wpisy zostają na urządzeniu.
- Testy używają wymyślonych danych. Prawdziwą kopię sprawdzamy ręcznie, lokalnie, bez zapisywania jej w repozytorium.

## 4. Daty

Obsługa dat jest najczęstszym źródłem błędów w takich aplikacjach, więc ma najostrzejsze reguły. Całość mieści się w
`js/dates.js`.

### Zasady

1. **Dzień** to tekst `YYYY-MM-DD` w **czasie lokalnym urządzenia**, bez strefy. **Miesiąc** to `YYYY-MM`.
2. **Moment zapisu** (`savedAt`) to liczba milisekund epoch. To jedyne miejsce, gdzie liczy się dokładna chwila.
3. **Miesiące w kluczach i w API `dates.js` liczymy od 1** (styczeń = 1), zgodnie z zapisem. Funkcje wbudowane JS
   liczą od 0, więc granica jest w jednym miejscu (`keyFromLocalDate`).
4. **Nie używamy `toISOString()` do dat.** To jest zasada nadrzędna, bo ten błąd już tu wystąpił (niżej).
5. Rachunek na dniach (dodawanie, odejmowanie) idzie przez `Date.UTC`.
6. Wyświetlanie: jeden format wszędzie, **zawsze wielką literą**: „Piątek, 25 września 2026” i „Wrzesień 2026”.

### Skąd te zasady: błąd z prototypu

Prototyp liczył klucz dnia przez `new Date().toISOString().slice(0, 10)`. `toISOString()` zamienia czas na UTC.
W Polsce (UTC+1 / UTC+2) między 0:00 a 1:00 lub 2:00 UTC jest jeszcze „wczoraj”, więc:

- wpis zrobiony tuż po północy trafiał pod **zły dzień**,
- w kalendarzu kropki, „dziś” i wybrany dzień wypadały **o dzień obok**,
- seria dni mogła się zerować bez powodu.

Rozwiązanie: klucz powstaje z lokalnych `getFullYear()`, `getMonth()`, `getDate()` (`keyFromLocalDate`,
`todayKey`). Format zapisu się nie zmienił, więc istniejące kopie działają bez migracji. Sprawdzono, że żaden
z dotychczasowych wpisów nie powstał w oknie błędu (wszystkie z godzin dziennych).

### Dlaczego rachunek przez `Date.UTC`

Dodawanie dni na lokalnym `Date` (`setDate(getDate() + 1)`) jest wrażliwe na zmianę czasu: doba ma 23 albo 25
godzin (29.03 i 25.10.2026 w Polsce). Dodawanie milisekund psuje się tak samo. `Date.UTC` nie ma zmiany czasu, więc
`addDaysKey('2026-10-25', 1)` zawsze daje `2026-10-26`.

### Dlaczego format przez `Intl` z `timeZone: 'UTC'`

Do formatowania przekazujemy południe UTC danego dnia i każemy `Intl` formatować w UTC. Dzięki temu wynik nie zależy
od strefy urządzenia (inaczej dzień mógłby się przesunąć). Nazwy dni i miesięcy dostarcza przeglądarka (`pl-PL`),
nie nasze tabele, więc odmiana jest poprawna i nie ma czego utrzymywać. Język podajemy jawnie, bo nie chcemy zależeć od
ustawień telefonu.

### Funkcje (`js/dates.js`)

| Funkcja                                   | Rola                                                                                |
| ----------------------------------------- | ----------------------------------------------------------------------------------- |
| `dateKey(y, m, d)`, `monthKey(y, m)`      | Składanie kluczy z liczb (miesiąc od 1).                                            |
| `keyFromLocalDate(date)`                  | Klucz z lokalnych składników obiektu `Date`.                                        |
| `todayKey(now)`                           | Dziś; `now` można podać w testach.                                                  |
| `parseKey(key)`                           | Liczby z klucza albo `null`, gdy format lub data są niepoprawne (np. `2026-02-31`). |
| `isValidKey(key)`, `monthOf(key)`         | Pochodne `parseKey`.                                                                |
| `addDaysKey(key, n)`                      | Dzień przesunięty o `n` dni; rzuca `RangeError` dla niepoprawnego klucza.           |
| `formatDatePL(key)`, `formatMonthPL(key)` | Wyświetlanie. Niepoprawny klucz wraca bez zmian, żeby widok się nie wywrócił.       |

## 5. Kopia zapasowa i import

### Walidacja (`sanitizeEntries`, zrobione)

Plik z kopią to dane z zewnątrz, więc nie ufamy mu. Dla każdego wpisu:

| Reguła                                                             | Powód                                                                 |
| ------------------------------------------------------------------ | --------------------------------------------------------------------- |
| Klucz musi być prawdziwym dniem `YYYY-MM-DD`.                      | Zły klucz zepsułby kalendarz, serię i sortowanie.                     |
| Klucz wygrywa z polem `date`.                                      | Klucz jest źródłem prawdy, pole `date` to tylko duplikat.             |
| `grateful`: 1–3 niepuste teksty, przycięte. Brak = wpis pominięty. | Wpis bez wdzięczności nie ma sensu i formularz też by go nie zapisał. |
| `savedAt` to liczba, inaczej 0.                                    | Pole potrzebne do porównań; 0 oznacza „bardzo stary”.                 |
| Pola tekstowe, które nie są tekstem, stają się puste.              | Zabezpiecza render.                                                   |
| Nieznane pola są odrzucane.                                        | Magazyn nie zbiera śmieci z cudzych plików.                           |

Niepoprawne wpisy są **pomijane z informacją o ich liczbie**, a nie wywracają całego importu: jeden zepsuty wpis
nie powinien blokować odzyskania pozostałych.

### Scalanie

- **Dziś:** wpis z pliku zastępuje obecny z tej samej daty (zachowanie z prototypu).
- **Docelowo (planowane, punkt 14):** dla każdej daty zostaje wpis z większym `savedAt`. Brak lub zły `savedAt` liczy
  się jako 0, przy remisie zostaje obecny, wpisy występujące tylko w jednym miejscu są zachowane. Powód: import starej
  kopii nie może nadpisać świeższego wpisu.

### Czego kopia nie robi: usunięcia nie są synchronizowane

Kopia to zbiór wpisów, a nie historia zmian. Jeśli usuniesz wpis, a później wczytasz starszą kopię, **wpis wróci**.
To świadoma cena prostoty: synchronizacja usunięć wymagałaby znaczników usunięcia („nagrobków”) i zniszczyłaby
prosty format. Komunikat w aplikacji ma o tym informować (punkt 14).

### Przepływ telefon ↔ komputer

Komputer i telefon mają osobne magazyny i **nie synchronizują się automatycznie**. Dane przenosi się plikiem:
eksport, AirDrop/Pliki/mail, import. Synchronizacja przez iCloud lub backend jest poza zakresem projektu
(specyfikacja, sekcja 12).

## 6. Interfejs

### Bezpieczny DOM

Elementy budujemy funkcją `h(tag, atrybuty, ...dzieci)` z `js/dom.js`, a teksty wstawiamy jako węzły tekstowe.
**Nie sklejamy HTML z tekstu użytkownika** (`innerHTML` z konkatenacją). Powody:

- tekst `<b>` wpisany w pole ma się wyświetlić jako zwykły tekst (sprawdzone),
- złośliwy plik kopii nie może wstrzyknąć kodu przez import,
- nie trzeba pamiętać o ucieczce znaków.

### Teksty w jednym miejscu

Teksty tworzone w JS (komunikaty, etykiety trybów) są w `js/strings.js`. Zmiana sformułowania albo odmiany nie
wymaga szukania po modułach, a dodanie drugiego języka byłoby osobnym, jednoznacznym zadaniem. Teksty statyczne
leżą w `index.html`.

### Motywy

- Osiem motywów: cztery pory roku × jasny/ciemny. Każdy to zestaw zmiennych CSS w `css/tokens.css`, przełączany
  atrybutem `data-theme` na `<html>`.
- **Kolory występują w CSS tylko jako zmienne motywu.** Jedyny wyjątek to pięć stałych kolorów żarówek girlandy
  (mają wyglądać jak prawdziwe, kolorowe lampki).
- Wybrany motyw zapamiętuje `localStorage`. Domyślny: jesień jasny.
- Emoji pór roku mają jedno źródło prawdy (`SEASON_EMOJI` w `themes.js`): 🍂 ❄️ 🌿 🌊. Cztery pory, cztery różne
  emoji, wspólne dla wariantu jasnego i ciemnego. **Stan:** lista wyboru motywu i karty historii jeszcze używają
  starych emoji (🌸 ☀️ 🍁); poprawia to punkt 16.
- **Kontrast:** zmierzono kilka kombinacji poniżej 4,5:1 (np. `--muted` w zima jasny to 3,24:1). Poprawka to nowy
  token `--on-accent` i delikatne przyciemnienie `--muted`, ale **tylko po akceptacji autorki** (punkt 15).

### Girlanda światełek (motywy zimowe)

Girlanda to SVG budowane w `garland.js`, widoczne tylko w motywach zimowych (steruje tym CSS). Powstaje nad
nagłówkiem, cytatem, kartami i historią, a każda instancja ma inne ziarno (faza fali, kolory), żeby nie były
identyczne.

**Znany problem (priorytet wysoki, punkt 11):** `viewBox` ma stałe 640 jednostek z `preserveAspectRatio="none"`,
więc na wąskim telefonie żarówki rozciągają się w owale, a sznurek jest łamaną linią. Plan naprawy: viewBox równy
szerokości w pikselach, zwisające łuki Béziera, liczba żarówek zależna od szerokości, migotanie samą `opacity`
(bez filtrów SVG, które są ciężkie na iOS), pauza poza ekranem i przy `prefers-reduced-motion`.

### Kalendarz wyboru daty

**Status:** zrobione (punkt 8). Specyfikacja, testy i kod są w repozytorium, interfejs sprawdzono w
podglądzie 390×844 w ośmiu motywach, a autorka potwierdziła działanie w przeglądarce Brave na komputerze (07.10.2026).

#### Dlaczego piszemy go od zera, a nie łatamy

- `setMonth(±1)` na 29.–31. dniu miesiąca przeskakuje o dwa miesiące (31 stycznia + 1 miesiąc = 3 marca).
- Stanem jest obiekt `Date`, a razem z nim ukryty „dzień”, który powoduje takie błędy.
- Komórki to `div`, a powinny być `button` (dostępność, cele dotykowe ≥ 44 pt).
- Popover pływa nad formularzem, zamiast rozwijać się w karcie.
- Komponent sam czyta `localStorage` w trakcie renderowania, więc nie da się go sprawdzić bez przeglądarki.

Własny kod, bez biblioteki: jedna aplikacja, jeden wybór daty, praca offline, osiem motywów i znane wymagania.
Biblioteka dodałaby zależność i walkę z jej stylami w każdym z ośmiu motywów.

#### Budowa: model w czystych funkcjach, interfejs cienki

| Plik                   | Rola                                                                                                                                                                   |
| ---------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `js/calendar-model.js` | **Czysta logika, w całości testowana w Node:** siatka miesiąca, przesuwanie miesiąca, opis komórki, reguły „przyszłość” i reduktor stanu. Bez DOM, bez `localStorage`. |
| `js/calendar.js`       | Cienka warstwa: rysuje stan z reduktora, podpina zdarzenia i przekazuje wybór do `app.js`. Nie ma własnych reguł.                                                      |
| `js/app.js`            | Trzyma wybrany dzień, daje kalendarzowi wpisy (`setEntries`) i ma jedną funkcję `goToToday()`, której użyje też automatyczny powrót do dziś (punkt 9).                 |

Powód podziału: błędy kalendarza są błędami **reguł** (który dzień, który miesiąc, co wolno kliknąć), a nie rysowania.
Reguły w czystych funkcjach da się sprawdzić w kilku strefach czasowych w ułamku sekundy. Kod DOM, który zostaje,
jest tak krótki, że sprawdzamy go w prawdziwej przeglądarce (lista M poniżej).

#### Model (`js/calendar-model.js`)

Miesiące liczymy od 1 (jak w całym `dates.js`). Klucze to `YYYY-MM-DD`, więc porównanie „czy dzień jest po dzisiejszym”
to zwykłe porównanie tekstów.

| Funkcja                                          | Działanie                                                                                                                                |
| ------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------- |
| `monthGrid(year, month)`                         | Zawsze **42 komórki** `{key, day, inMonth}`, tydzień od poniedziałku. Rzuca `RangeError` dla miesiąca spoza 1–12.                        |
| `shiftMonth({year, month}, delta)`               | Nowy miesiąc widoku. Liczy na jednej liczbie `rok·12 + miesiąc`, więc przechodzi granicę roku i nie ma „dnia”, który mógłby przeskoczyć. |
| `isFuture(key, today)`                           | Prawda dla dnia **po** dzisiejszym. Dziś nie jest przyszłością.                                                                          |
| `canGoNext(view, today)`                         | Fałsz, gdy widok jest w miesiącu dzisiejszym lub późniejszym.                                                                            |
| `describeCell(cell, {today, selected, entries})` | Cechy komórki: `isToday`, `isSelected`, `isFuture`, `hasEntry`, `inMonth` i `label` dla czytnika ekranu.                                 |
| `createCalendarState(selected)`                  | Stan początkowy: `{open: false, viewYear, viewMonth, selected}`.                                                                         |
| `calendarReducer(state, action, {today})`        | Następny stan. Czysta funkcja: nie zmienia stanu wejściowego.                                                                            |

Akcje reduktora: `toggle`, `close` (dotknięcie poza panelem i Escape), `prev`, `next`, `pickDay(key)`, `goToToday`
i `select(key)` (zewnętrzna zmiana dnia, np. „edytuj” w historii).

Stan **nie zawiera dnia widoku**, tylko rok i miesiąc jako liczby. To jest sedno naprawy `setMonth`.

#### Zachowania, które musi spełniać kalendarz

Numery K są używane w testach (`tests/calendar-model.test.js`), więc każde zachowanie ma pokrycie.

**Siatka**

- **K1.** Siatka ma zawsze 6 wierszy po 7 komórek (42), także gdy miesiąc mieści się w 5. Wysokość panelu nie skacze.
- **K2.** Tydzień zaczyna się od poniedziałku: pierwsza komórka to zawsze poniedziałek.
- **K3.** Pierwszy dzień miesiąca leży w kolumnie swojego dnia tygodnia (w tym przesunięcia skrajne 0 i 6).
- **K4.** Komórki to kolejne dni bez dziur i powtórzeń. Dni „w miesiącu” to dokładnie 1…N, gdzie N to 28, 29 (rok
  przestępny), 30 lub 31.
- **K5.** Dni sąsiednich miesięcy uzupełniają siatkę, także przez granicę roku (grudzień ↔ styczeń).
- **K19.** Niepoprawny miesiąc (spoza 1–12 lub nie liczba całkowita) kończy się błędem, a nie cichą złą siatką.

**Nawigacja**

- **K6.** Przesunięcie miesiąca działa z każdego miesiąca w obie strony i przechodzi granicę roku. Przesunięcie o +1
  i potem o −1 wraca dokładnie na miejsce.
- **K8.** Strzałka „dalej” jest wyłączona w bieżącym miesiącu i włączona we wcześniejszych. Kliknięcie wyłączonej nic nie
  zmienia. Wstecz można iść bez ograniczeń.
- **K18.** Przesuwanie miesięcy nie zmienia wybranego dnia.

**Dni i ich cechy**

- **K7.** „Dziś” to dzień lokalny (o 00:30 lokalnie jest już nowy dzień). Dziś nie jest przyszłością, jutro jest.
- **K9.** Cechy komórki są przypisane dokładnie do jej dnia: tylko jedna komórka jest „dziś”, tylko jedna „wybrana”,
  kropkę mają tylko dni z wpisem, bez przesunięć o dzień. Dni sąsiednich miesięcy są oznaczone jako nienależące do widoku.
- **K10.** Opis dla czytnika ekranu ma postać „Piątek, 25 września 2026” albo „Piątek, 25 września 2026, wpis zapisany”.

**Otwieranie, zamykanie i wybór**

- **K11.** Otwarcie panelu zawsze pokazuje miesiąc **wybranego dnia**, także po wcześniejszym przewijaniu miesięcy.
- **K12.** Panel zamyka się po ponownym dotknięciu przycisku daty, po dotknięciu poza panelem i po Escape. Zamknięcie
  nie zmienia wybranego dnia ani widoku.
- **K13.** Wybór dnia ustawia go jako wybrany i zamyka panel. Dla dnia z sąsiedniego miesiąca przełącza też widok na jego
  miesiąc.
- **K14.** Wybór dnia z przyszłości albo niepoprawnego klucza jest ignorowany (stan bez zmian).
- **K15.** „Dziś” z dowolnego miejsca (przeszły miesiąc, otwarty lub zamknięty panel) wybiera dzisiejszy dzień, ustawia
  widok na bieżący miesiąc i zamyka panel.
- **K16.** Zewnętrzna zmiana dnia (np. „edytuj” w historii) synchronizuje wybrany dzień i widok, ale nie otwiera ani nie
  zamyka panelu. Z dniem z przyszłości jest ignorowana.
- **K17.** Reduktor nie zmienia obiektu stanu, który dostaje.
- **K20.** Nieznana akcja reduktora jest błędem programisty (rzuca wyjątek), a nie cicho pomijanym brakiem reakcji. Literówka
  w nazwie akcji nie może udawać, że wszystko działa.

**Sprawdzane ręcznie w przeglądarce (390×844)**

- **M1.** Komórki i strzałki są prawdziwymi `<button>` o rozmiarze co najmniej 44×44 pt (mierzone).
- **M2.** Przycisk daty ma `aria-expanded` i `aria-controls`. Komórki mają `aria-label`, `aria-current="date"` dla dziś,
  `aria-pressed` dla wybranego i `disabled` dla przyszłości.
- **M3.** Panel rozwija się w karcie (nie pływa), formularz zjeżdża w dół i wraca po zamknięciu.
- **M4.** Po zapisie, usunięciu i imporcie kropki odświeżają się także przy otwartym panelu.
- **M5.** Wygląd w ośmiu motywach: czytelność cyfr, „dziś” obrysowane, wybrany dzień wyraźny, dni sąsiednich miesięcy
  i przyszłości przygaszone. Szczególnie oba zimowe.
- **M6.** Cyfry w czcionce systemowej z `tabular-nums`, bez nierównych cyfr Georgii.
- **M7.** Brak błędów w konsoli, brak przewijania poziomego, panel mieści się na szerokości 390 px.
- **M8.** Wybór dnia, który ma zapisany wpis, wczytuje go do formularza (pola wypełnione, wskaźnik „Edytujesz istniejący
  wpis z tego dnia”, przycisk „Zapisz zmiany”). Wybór dnia bez wpisu daje pusty formularz i „Nowy wpis”.
- **M9.** Dni z wpisem są wyraźnie widoczne w kalendarzu: kafelek w kolorze `--accent-soft` i kropka w `--accent`, także dla
  dni sąsiednich miesięcy, a wybrany dzień z wpisem ma białą kropkę na tle akcentu.

#### Wynik weryfikacji (stan na 07.10.2026)

- **Testy:** 54 testy kalendarza i w sumie 108 w projekcie przechodzą w czterech strefach czasowych. Zachowania K1–K20
  mają pokrycie.
- **Kontrola testów przez psucie kodu** (`tools/mutation-check.py`): 31 celowych usterek, m.in. stare `toISOString`,
  tydzień od niedzieli, 35 komórek, brak blokady przyszłości, brak przeniesienia roku, „dziś” po samym numerze dnia
  i kropka o dzień obok. **Wszystkie wykryte** w co najmniej jednej strefie. Pierwsze podejście wykazało trzy
  usterki, które przeżyły, i wyjaśniło dwie rzeczy: test sprawdzający, że stan nie zawiera dnia widoku, nie istniał
  (dopisany), a testy niepoprawnego miesiąca przechodziły z innego powodu niż zamierzony (teraz sprawdzają także
  komunikat błędu).
- **Sprawdzone przez autorkę** (Brave, komputer, 07.10.2026): kalendarz otwiera się, pokazuje wrzesień z wybranym dniem
  i obrysowanym „dziś”, a dni z wpisem pojawiły się po zaimportowaniu kopii. Bez kopii kalendarz słusznie nie pokazuje
  żadnych oznaczeń, bo `localhost:8000` ma własny, pusty magazyn (patrz sekcja „Adres decyduje o danych”).
- **Ręcznie w przeglądarce (390×844), lista M:**
  - M1 ✅ komórki i strzałki mają dokładnie 44×44 pt (zmierzone), a `button` i `touch-action: manipulation` są ustawione.
  - M3 ✅ panel rozwija się w karcie, formularz zjeżdża w dół i wraca po zamknięciu.
  - M4 ✅ kropka pojawia się po zapisie (panel zamyka się przy dotknięciu przycisku zapisu, więc kropka jest widoczna
    po ponownym otwarciu), a „edytuj” w historii przestawia dzień.
  - M5 ✅ wszystkie 8 motywów obejrzane z otwartym panelem: czytelne cyfry, wybrany dzień wyraźny, dni sąsiednich
    miesięcy i przyszłości przygaszone.
  - M6 ✅ cyfry w czcionce systemowej z `tabular-nums` (sprawdzone w stylach obliczonych).
  - M7 ✅ brak błędów w konsoli, panel ma szerokość 308 pt, czyli dokładnie wnętrze karty.
  - M2 ⚠️ atrybuty `aria-*` są ustawione w kodzie (widać `aria-label` z „wpis zapisany” w drzewie dostępności), ale
    nie sprawdzono ich czytnikiem ekranu (VoiceOver).
  - M8 ✅ sprawdzone na wpisach testowych (3 i 5 października): wpis ładuje się po wyborze dnia, także po przejściu przez
    dzień bez wpisu i z powrotem.
  - M9 ✅ sprawdzone w jesień jasny, zima jasny i zima ciemny (kafelek i kropka widoczne, wybrany dzień czytelny).
  - Escape nie został sprawdzony w przeglądarce (brak narzędzia do klawiatury), a reguła `close` jest w testach.
  - Nie sprawdzono na prawdziwym iPhonie.
- **Oznaczenie dni z wpisem** zmienione 07.10.2026 na prośbę autorki (D31): wcześniejsza kropka w `--gold` o średnicy 4 px
  była słabo widoczna, zwłaszcza w jasnych motywach i przy dniach sąsiednich miesięcy (całą komórkę przygaszała
  przezroczystość). Teraz dzień z wpisem ma kafelek `--accent-soft` i kropkę `--accent` (5 px), a przygaszenie dni
  sąsiednich miesięcy jest łagodniejsze (0,8), gdy mają wpis. Kolory palet nie zostały zmienione, użyto istniejących tokenów.
- **Poprawka przy okazji:** reguła `:hover` nie dotyczy już wybranego dnia. Na telefonie stan `:hover` zostaje po dotknięciu,
  a wybrany dzień przy `:hover` dostawał jasne tło i biały tekst, czyli był nieczytelny.

#### Znane ograniczenia

- **Import przy otwartym formularzu:** jeśli wgrasz kopię zawierającą wpis z aktualnie wybranego dnia, formularz nie
  przeładuje się sam (kropki i historia tak). Wpis pojawi się po ponownym wybraniu dnia. Naprawa w punkcie 14.
- **Wpis z datą z przyszłości** (np. z pliku kopii z błędną datą zegara) pokazuje się w historii, można go usunąć, ale
  przycisk „edytuj” nic nie robi, bo kalendarz nie pozwala wybrać dnia z przyszłości (K16). Wpisy tworzone w aplikacji
  nigdy nie mają przyszłej daty.
- **Północ przy otwartym panelu:** pierścień „dziś” przesunie się dopiero przy następnym rysowaniu. Automatyczne
  odświeżanie po zmianie dnia jest w punkcie 9.

#### Decyzje projektowe

- **Dni z przyszłości są nieaktywne** (zatwierdzone przez autorkę: dziennik pisze się o tym, co było, więc planowanie
  z wyprzedzeniem nie ma sensu). To jedna reguła w `isFuture`.
- **Panel jest rozwijany w karcie**, a nie pływający: bez `z-index`, przycinania i kłopotów z klawiaturą ekranową.
- **Oznaczenie dnia z wpisem:** kafelek `--accent-soft` plus kropka `--accent`, a nie sama kropka `--gold`. Pierwotny `--gold`
  miał słaby kontrast w jasnych motywach (np. 1,96:1 w zima jasny). Użyto istniejących tokenów, palet nie zmieniano (D31).
  Pełny przegląd kontrastu, w tym kafelka w ciemnych motywach, jest w punkcie 15 razem z `--on-accent`.
- **Dzień z szkicem** (pusta kropka) pojawi się dopiero z punktem 10.
- **Nawigacja strzałkami klawiatury po siatce** nie jest planowana: aplikacja jest na telefon, a Tab przechodzi po
  przyciskach.

### Cytaty

Pula krótkich, **oryginalnych sentencji bez przypisania do autorów** (`js/quotes.js`). Powód: nie przypisujemy
prawdziwym osobom słów, których nie powiedziały. Nowy cytat to jedna linijka w tablicy.

### Seria dni (streak)

Liczymy dni z rzędu z wpisem, cofając się od dziś. **Jeśli dziś nie ma jeszcze wpisu, liczymy od wczoraj**, żeby seria
nie spadała do zera o poranku, zanim zdążysz napisać. Liczenie idzie po kluczach dni (`addDaysKey`), nie po
milisekundach, więc zmiana czasu jej nie psuje.

### Podsumowanie miesiąca

Liczba wpisów, najdłuższa seria w miesiącu, do trzech najczęściej doceniających osób i trzy losowe chwile
wdzięczności. Osoby liczymy w `Map`, nie w zwykłym obiekcie, bo osoba o imieniu `constructor` albo `toString`
zepsułaby liczenie w obiekcie (jest na to test).

## 7. Testy i narzędzia

- **Uruchamianie:** `npm start` (serwer `tools/dev-server.py` wysyłający `Cache-Control: no-store`; moduły ES nie ładują się z `file://`, a zwykły `http.server` pozwalał przeglądarce trzymać stare CSS i JS, przez co zmiany bywały niewidoczne),
  `npm test` (wbudowany runner Node, `node --test`, bez zależności).
- **Testy logiki są uruchamiane w kilku strefach czasowych:** `Europe/Warsaw`, `America/Los_Angeles`,
  `Pacific/Kiritimati` (UTC+14), `UTC`. Błędy dat ujawniają się tylko w niektórych strefach, więc jedna strefa
  nie wystarczy. Testy tworzą czas przez `new Date(rok, miesiąc, dzień, godzina)` (lokalnie), nie przez tekst z `Z`.
- **Jak piszemy testy, żeby naprawdę coś sprawdzały** (zasady przyjęte przy kalendarzu, obowiązują dalej):
  1. **Oczekiwane wartości pochodzą z zewnątrz, nie z testowanego kodu.** Daty i układy siatek wpisujemy ręcznie
     po sprawdzeniu w niezależnym źródle (np. moduł `calendar` w Pythonie), a nie liczymy tym samym algorytmem.
  2. **Własności sprawdzamy pętlą po wielu miesiącach i latach** (zawsze 42 komórki, pierwsza to poniedziałek,
     kolejne dni różnią się o jeden), z niezależnym wyliczeniem dnia tygodnia przez `Date.UTC`.
  3. **Każdy znany błąd ma test regresyjny**, który przy starym kodzie by nie przeszedł.
  4. **Testujemy granice, nie tylko środek**: dziś kontra jutro, bieżący miesiąc kontra poprzedni.
  5. **Test musi dać się oblać.** Po napisaniu kodu psujemy go celowo (skrypt `tools/mutation-check.py`) (`toISOString`, `setMonth`, tydzień od niedzieli,
     35 zamiast 42 komórek, brak blokady przyszłości itd.) na kopii poza repozytorium i sprawdzamy, że testy to
     wykrywają. Test, który przy zepsutym kodzie przechodzi, jest do poprawy.
  6. Każdy test kalendarza wskazuje numer zachowania K z tej dokumentacji.
- **Przypadki brzegowe dat w testach:** 00:30 i 23:30 lokalnie, 31 stycznia, 29 lutego 2028, zmiana czasu 29.03.2026
  i 25.10.2026, granica roku.
- **Interfejs sprawdzamy ręcznie** w podglądzie 390×844 (iPhone 14), w kilku motywach (zawsze także w obu
  zimowych). Przeglądarkowe okna (wybór pliku, `confirm()`) nie są objęte automatyczną kontrolą.
- **Formatowanie:** Prettier (`.prettierrc.json`, pojedyncze cudzysłowy, szerokość 100) i `.editorconfig`. To tylko
  narzędzia deweloperskie; aplikacja nie ma zależności uruchomieniowych.
- **Obraz referencyjny:** `legacy/` zawiera prototyp w jednym pliku. Służy do porównania wyglądu i zachowania
  (zrobiliśmy to przy refaktorze) i **nie jest częścią aplikacji**.

## 8. Rejestr decyzji

Każda decyzja ma powód i odrzucone alternatywy. Status: ✅ wdrożone, 🔜 zaplanowane, 🔧 robocza (do zmiany).

| #   | Decyzja                                                                                                                                   | Powód                                                                                                                                                           | Odrzucone alternatywy                                     | Status                                                                          |
| --- | ----------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------- | ------------------------------------------------------------------------------- |
| D1  | **PWA**, nie aplikacja natywna                                                                                                            | Darmowa, prototyp już istnieje, brak konta deweloperskiego (to płatne)                                                                                          | Aplikacja natywna (koszt, App Store)                      | 🔜                                                                              |
| D2  | Bez frameworka, bundlera i TypeScriptu: moduły ES, zwykły CSS                                                                             | Mała aplikacja; mniej narzędzi = mniej do utrzymania; hosting statyczny działa bez budowania                                                                    | React/Vite/TS                                             | ✅                                                                              |
| D3  | Własny kalendarz, bez biblioteki                                                                                                          | Jeden plik wyboru daty, 8 motywów, praca offline, pełna kontrola nad dostępnością                                                                               | Gotowa biblioteka kalendarza                              | ✅                                                                              |
| D4  | Dzień jako tekst `YYYY-MM-DD` w czasie **lokalnym**, wszędzie, także w JSON                                                               | Zgodność z istniejącą kopią; koniec błędu UTC; tekst łatwo sortować i porównywać                                                                                | Znacznik czasu, ISO z `Z`, obiekty `Date` jako stan       | ✅                                                                              |
| D5  | Rachunek na dniach przez `Date.UTC`                                                                                                       | Odporność na zmianę czasu (doby 23 h i 25 h)                                                                                                                    | `setDate` na lokalnym `Date`, dodawanie milisekund        | ✅                                                                              |
| D6  | Miesiące od 1 w API dat                                                                                                                   | Zgodność z zapisem w kluczu; mniej pomyłek o jeden                                                                                                              | Miesiące od 0 jak w JS                                    | ✅                                                                              |
| D7  | Format dat przez `Intl` (`pl-PL`, UTC), zawsze wielką literą                                                                              | Poprawna odmiana bez własnych tabel; spójny wygląd                                                                                                              | Własne tablice nazw, język z urządzenia                   | ✅                                                                              |
| D8  | Format kopii zostaje **JSON**, ten sam co w `localStorage`                                                                                | Prostota, zgodność ze starymi kopiami, jeden format do utrzymania                                                                                               | CSV, własny format, backend                               | ✅                                                                              |
| D9  | Import zawsze **pomija** niepoprawne wpisy zamiast przerywać                                                                              | Jeden zły wpis nie blokuje odzyskania reszty                                                                                                                    | Odrzucenie całego pliku                                   | ✅                                                                              |
| D10 | Przy imporcie wygrywa **nowszy** wpis (większy `savedAt`)                                                                                 | Stara kopia nie nadpisze świeżej pracy                                                                                                                          | Zawsze wygrywa plik, zawsze wygrywa obecny                | 🔜 (pkt 14)                                                                     |
| D11 | Usunięcia nie są synchronizowane                                                                                                          | Prostota formatu; nagrobki skomplikowałyby kopię                                                                                                                | Znaczniki usunięcia, historia zmian                       | ✅ (do opisania w aplikacji)                                                    |
| D12 | Niezapisane dane zapisywane jako **szkic** w osobnym kluczu                                                                               | Nic nie ma zniknąć przy zmianie dnia, przełączeniu aplikacji ani zabiciu jej przez iOS; szkic nie psuje serii ani eksportu                                      | Zapis jako zwykły wpis, brak zapisu                       | 🔜 (pkt 10)                                                                     |
| D13 | Zimny start zawsze pokazuje dziś; z tła wracamy do dziś po ≥ 10 min albo zmianie dnia; północ przy pisaniu **nie przerywa** pisania       | PWA na iPhonie miesiącami żyje w tle; nowy wpis nie może wylądować pod wczorajszą datą. Krótkie przełączenie aplikacji nie może kasować tego, co się pisze      | Zawsze resetować; nigdy nie resetować                     | 🔜 (pkt 9)                                                                      |
| D14 | Dni z przyszłości w kalendarzu są nieaktywne                                                                                              | Dziennik opisuje to, co było. Planowanie z wyprzedzeniem nie ma sensu i tylko zwiększa ryzyko pomyłki (zatwierdzone przez autorkę)                              | Dozwolone                                                 | ✅                                                                              |
| D15 | Ikona to prawdziwe PNG z pełnym, kwadratowym tłem, w kilku zabezpieczeniach naraz                                                         | iOS czyta ikonę raz przy instalacji, ignoruje SVG, a przezroczystość wypełnia czernią                                                                           | SVG, przezroczyste rogi                                   | 🔜 (pkt 3)                                                                      |
| D16 | Ekran startowy w dwóch warstwach: statyczny `apple-touch-startup-image` + animowany ekran w aplikacji                                     | iOS pozwala tylko na statyczny obraz systemowy; animację robimy sami, płynnie przejmując ten sam kolor                                                          | Sam obraz statyczny; brak ekranu                          | 🔜 (pkt 21, niski priorytet)                                                    |
| D17 | Animujemy tylko `transform` i `opacity`                                                                                                   | Przemalowywanie gradientów i filtry SVG są kosztowne na iOS                                                                                                     | Animacja gradientu, `feGaussianBlur`                      | 🔜 (pkt 11, 21)                                                                 |
| D18 | `prefers-reduced-motion`: bez migotania i ruchu                                                                                           | Dostępność, oszczędność baterii                                                                                                                                 | Zawsze animować                                           | 🔜                                                                              |
| D19 | Emoji pór roku: 🍂 ❄️ 🌿 🌊, jedno źródło prawdy                                                                                          | Wybór autorki (🌸 i ☀️ uznane za zbyt oczywiste)                                                                                                                | Dwie wersje emoji w różnych miejscach                     | 🔜 (pkt 16)                                                                     |
| D20 | Zmiany palet tylko po akceptacji autorki; kontrast pokazujemy przed/po                                                                    | Palety są jej decyzją estetyczną                                                                                                                                | Samodzielne poprawki                                      | 🔜 (pkt 15)                                                                     |
| D21 | Service worker ma niski priorytet; strategia **sieć najpierw**, potem cache                                                               | Wpisy i tak są lokalne; cache-first mógłby długo pokazywać starą wersję                                                                                         | Cache-first                                               | 🔜 (pkt 19)                                                                     |
| D22 | Eksport przez Share Sheet (`navigator.share` z plikiem), a pobranie linkiem tylko jako zapasowe                                           | Na iOS zwykłe pobieranie zachowuje się inaczej niż na komputerze                                                                                                | Tylko pobieranie linkiem                                  | 🔜 (pkt 14)                                                                     |
| D23 | Prywatne kopie poza repozytorium (`.gitignore`)                                                                                           | Wpisy są prywatne, a repozytorium może być publiczne                                                                                                            | Trzymanie kopii w repo                                    | ✅                                                                              |
| D24 | Teksty interfejsu w `strings.js`, logika bez DOM, jeden dostęp do danych                                                                  | Czytelność, testowalność, jeden punkt zmiany                                                                                                                    | Teksty i logika rozproszone po modułach                   | ✅                                                                              |
| D25 | Bez `innerHTML` z tekstem użytkownika                                                                                                     | Bezpieczeństwo importu, brak ucieczek znaków                                                                                                                    | Sklejanie HTML                                            | ✅                                                                              |
| D26 | Osoby w podsumowaniu liczone w `Map`                                                                                                      | Imię `constructor` w zwykłym obiekcie psuło liczenie                                                                                                            | Zwykły obiekt                                             | ✅                                                                              |
| D27 | Cytaty bez autorów                                                                                                                        | Nie przypisujemy realnym osobom nie ich słów                                                                                                                    | Cytaty „celebrytów”                                       | ✅                                                                              |
| D28 | Stan kalendarza to liczby `rok` i `miesiąc`, bez obiektu `Date` i bez dnia                                                                | `setMonth` na 29.–31. przeskakuje o dwa miesiące; „dzień widoku” nie jest do niczego potrzebny                                                                  | Trzymanie `Date` i poprawianie dnia przed `setMonth`      | ✅                                                                              |
| D29 | Reguły kalendarza w czystym module (`calendar-model.js`) z reduktorem stanu, a DOM tylko rysuje                                           | Reguły da się sprawdzić w Node w kilku strefach, a nie ręcznie w przeglądarce; DOM zostaje zbyt krótki, żeby się psuć                                           | Logika wymieszana z DOM, atrapa DOM w testach             | ✅                                                                              |
| D30 | Panel kalendarza rozwija się w karcie, a nie pływa                                                                                        | Bez `z-index` i przycinania, lepiej z klawiaturą ekranową i safe area                                                                                           | Popover                                                   | ✅                                                                              |
| D31 | Dni z wpisem w kalendarzu: kafelek `--accent-soft` i kropka `--accent` zamiast słabej kropki `--gold`; kontrast reszty palet w punkcie 15 | Kropka `--gold` była słabo widoczna (autorka zgłosiła potrzebę lepszego oznaczenia). Użyto istniejących tokenów, bez zmiany palet. Wygląd do akceptacji autorki | Sama większa kropka, podkreślenie, pogrubienie cyfry      | 🔧 (działanie potwierdzone, wygląd kafelka czeka na wprost wyrażoną akceptację) |
| D32 | Bez automatycznych testów przeglądarkowych (Playwright) na razie                                                                          | Ciężkie narzędzie (kilkaset MB) jak na tę skalę; reguły są w czystych funkcjach. Do ponownej oceny, gdy interfejs urośnie (punkty 9, 10)                        | Playwright od razu, atrapa DOM (jsdom)                    | ✅                                                                              |
| D33 | Lokalny serwer deweloperski z `Cache-Control: no-store` (`tools/dev-server.py`, `npm start`)                                              | Zwykły `http.server` pozwalał przeglądarce trzymać stare CSS i JS, więc zmiany bywały niewidoczne mimo odświeżenia                                              | Zwykły `python3 -m http.server`, ręczne czyszczenie cache | ✅                                                                              |

## 9. Ograniczenia iOS i PWA, o których trzeba pamiętać

Dotyczy zainstalowanej aplikacji na iPhonie. Większość z nich jest dopiero w planie, ale wpływa na decyzje już dziś.

- **Osobny magazyn danych.** Zainstalowana aplikacja nie dzieli `localStorage` z kartą Safari ani z komputerem.
  Dane przenosi się plikiem (punkt 6).
- **Ikona i ekran startowy są czytane raz, przy instalacji.** Zmiana wymaga usunięcia aplikacji z ekranu i dodania
  jej ponownie, a Safari mocno cache’uje (podbijamy wersję w nazwie pliku, `?v=2`).
- **Timery w tle są usypiane.** Dlatego o zmianie dnia decydują zdarzenia powrotu do aplikacji
  (`visibilitychange`, `pageshow`), a timer do północy tylko przypomina o sprawdzeniu.
- **Aplikacja może zostać zamknięta bez ostrzeżenia.** Stąd natychmiastowy zapis szkicu przy `visibilitychange`
  (stan „ukryta”) i `pagehide`.
- **Share Sheet wymaga gestu użytkownika.** `navigator.share` musi być wywołany bezpośrednio w obsłudze kliknięcia,
  bez wcześniejszych `await`, inaczej iOS odrzuca go jako niedozwolony.
- **Pola poniżej 16 px powodują zoom** po dotknięciu. Pola mają mieć 17 px (punkt 12).
- **Safe area i notch.** Wymagają `viewport-fit=cover` i `env(safe-area-inset-*)` (punkt 13).
- **Moduły ES nie działają z `file://`**, więc aplikacji nie otwiera się już dwuklikiem. Lokalnie `npm start`.

## 10. Konwencje

- **Nazwy w kodzie po angielsku, teksty interfejsu po polsku.**
- **Komentarze tylko tam, gdzie kod sam nie tłumaczy powodu:** dziwactwa iOS, decyzje, nieoczywiste reguły.
  Bez komentarzy opisujących oczywiste linijki i bez zakomentowanego kodu.
- **Stałe zamiast magicznych liczb** (limity, progi czasu, liczba komórek siatki).
- **Dostępność jako standard:** `lang="pl"`, prawdziwe `<label>` i `<button>`, widoczny focus, kontrast ≥ 4,5:1.
- **Commity małe i opisane „po co”, nie tylko „co”.** Każdy punkt planu w osobnym commicie.
- **Sposób pracy nad punktem planu** (przyjęty przy kalendarzu): 1) dokumentacja z numerowanymi zachowaniami, 2) testy
  napisane przed kodem (najpierw czerwone, z właściwego powodu), 3) kod, 4) kontrola testów przez psucie kodu
  (`tools/mutation-check.py`), 5) sprawdzenie w przeglądarce 390×844, 6) aktualizacja planu, README i tej dokumentacji.
- **Definition of done dla funkcji:** logika ma testy i przechodzą (w kilku strefach); interfejs sprawdzony w podglądzie
  390×844 w kilku motywach (w tym zimowych) i przy ograniczonym ruchu; brak błędów w konsoli; README i ta
  dokumentacja zaktualizowane, jeśli zmieniła się struktura, format albo ważna decyzja.

## 11. Jak aktualizować dokumentację

- Nowa **decyzja** (wybór między wariantami) trafia do tabeli w sekcji 8 razem z powodem i odrzuconymi
  alternatywami.
- Zmiana **zachowania** albo **formatu danych** zmienia odpowiednią sekcję (3–6) i README.
- Po każdym kroku aktualizujemy `plan.json`: ✅ przy numerze oznacza punkt wykonany w całości, ✅ przy podpunkcie
  oznacza podpunkt wykonany.
- Rzeczy niezrobione opisujemy jako **(planowane, punkt N)**. Po zrobieniu usuwamy to oznaczenie i zmieniamy status
  w tabeli decyzji na ✅.
