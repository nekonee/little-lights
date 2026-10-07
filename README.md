# Dziennik Wdzięczności

Codzienny dziennik wdzięczności po polsku. Aplikacja jest jednoosobowa, lokalna i działa bez konta i backendu:
wpisy zapisują się w `localStorage` przeglądarki, a kopię zapasową robi się plikiem JSON. Docelowo PWA na iPhonie.

Specyfikacja funkcjonalna i wizualna: [`docs/specyfikacja-dziennik-wdziecznosci.md`](docs/specyfikacja-dziennik-wdziecznosci.md).
Plan prac z priorytetami: [`docs/plan.json`](docs/plan.json).

## Uruchamianie lokalnie

Aplikacja używa modułów ES, które nie ładują się z `file://`, więc nie da się jej otworzyć dwuklikiem na `index.html`.
Potrzebny jest prosty serwer:

```sh
npm start        # python3 -m http.server 8000
```

Potem otwórz <http://localhost:8000>. Dane w `localStorage` są przypisane do adresu, więc `localhost:8000` ma osobny
magazyn od strony opublikowanej w internecie i od zainstalowanej aplikacji na telefonie.

## Testy

```sh
npm test         # node --test (Node 20+), bez zależności
TZ=America/Los_Angeles npm test   # to samo w innej strefie czasowej
```

Testy obejmują logikę bez DOM: daty, streak, podsumowanie miesiąca, kopię zapasową. Interfejs sprawdzamy ręcznie
(podgląd 390×844, czyli iPhone 14, kilka motywów).

## Struktura

```text
index.html            szkielet strony (bez logiki i bez stylów inline)
css/
  tokens.css          8 motywów jako zmienne CSS
  base.css            reset, typografia, pola formularza
  components.css      komponenty: karty, kalendarz, historia, girlanda…
js/
  app.js              start aplikacji, stan (wybrana data), łączenie modułów
  dates.js            klucze dni i miesięcy, rachunek na dniach, daty po polsku (czyste)
  streak-summary.js   streak i podsumowanie miesiąca                  (czyste)
  backup.js           serializacja, parsowanie, walidacja i scalanie kopii (czyste)
  quotes.js           pula cytatów                                    (dane)
  strings.js          teksty interfejsu tworzone w JS
  store.js            jedyne miejsce dotykające localStorage
  dom.js              pomocniki: byId, h() do budowania elementów
  form.js             formularz wpisu
  calendar.js         wybór daty i kalendarz miesięczny
  history.js          lista poprzednich wpisów
  summary.js          karta podsumowania miesiąca
  backup-panel.js     przyciski eksportu i importu
  header.js           data i licznik serii
  quote.js            cytat dnia
  themes.js           wybór motywu, emoji pory roku
  garland.js          girlanda światełek w motywach zimowych
tests/                testy logiki (node --test), dane wymyślone
assets/               favicon (docelowo ikony i ekran startowy)
docs/                 specyfikacja i plan prac
legacy/               prototyp w jednym pliku HTML — punkt odniesienia
backups/              prywatne kopie wpisów, poza repozytorium (.gitignore)
```

Zasady: logika w czystych funkcjach bez DOM i `localStorage`, warstwa interfejsu tylko renderuje i podpina zdarzenia,
elementy powstają przez `h()` / `textContent` (nigdy przez sklejanie HTML z tekstu), kolory tylko przez zmienne motywu.

## Format danych

Wpisy leżą w jednym obiekcie pod kluczem `gratitude_journal_entries_v1` i mają ten sam kształt w pliku kopii zapasowej.
Kluczem jest dzień `YYYY-MM-DD`:

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

`grateful` ma od 1 do 3 niepustych tekstów, `savedAt` to czas ostatniego zapisu w milisekundach (epoch). Format nie
zmienia się bez zachowania zgodności wstecz przy imporcie.

### Daty

- **Dzień** to tekst `YYYY-MM-DD` w czasie lokalnym urządzenia, **miesiąc** to `YYYY-MM`. Miesiące w kluczach i w
  `js/dates.js` liczymy od 1 (styczeń = 1).
- Nie używamy `toISOString()` do dat, bo zamienia czas lokalny na UTC i przesuwa dzień (w Polsce między 0:00 a 2:00).
  Rachunek na dniach (`addDaysKey`) idzie przez `Date.UTC`, więc nie psuje go zmiana czasu ani doba 25-godzinna.
- Wyświetlanie: `formatDatePL` daje „Piątek, 25 września 2026”, `formatMonthPL` daje „Wrzesień 2026”. Zawsze wielka litera.
- **Import** sprawdza wpisy (`sanitizeEntries`): klucz musi być prawdziwym dniem (`2026-02-31` odpada) i wygrywa z polem
  `date`, `grateful` ma 1–3 niepuste teksty, `savedAt` to liczba (inaczej 0). Reszta jest pomijana, a aplikacja podaje ich
  liczbę.

Kopie zapasowe (`kopia-dziennika-*.json`) zawierają prywatne wpisy i są wyłączone z repozytorium. Do testów używamy
wyłącznie wymyślonych danych.

## Jak dodać…

- **Cytat:** dopisz tekst w `js/quotes.js`. Bez autora, bo to oryginalne sentencje.
- **Motyw:** dodaj zestaw zmiennych w `css/tokens.css`, opcję w `#themeSelect` w `index.html` i emoji pory roku w
  `js/themes.js`.

## Znane problemy (do naprawy zgodnie z planem)

Refaktoryzacja do modułów (krok 0 z punktu 1 planu) zachowała działanie prototypu, także jego znane błędy. Błąd dat w UTC
jest już naprawiony (punkt 7), a pozostałe mają swoje punkty w `docs/plan.json`:

- w kalendarzu `setMonth` przeskakuje miesiące, gdy dziś jest 29.–31. (punkt 8),
- komunikat „Zapisano ✓” jest od razu zamazywany, po usunięciu wpisu formularz nie odświeża się, a lista miesięcy w
  podsumowaniu wraca na bieżący miesiąc (punkt 17),
- import nadpisuje wpisy bez sprawdzania, który jest nowszy (punkt 14),
- w liście motywów wiosna ma 🌸, a lato ☀️, zamiast 🌿 i 🌊 (punkt 16).
