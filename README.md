# Dziennik Wdzięczności

Codzienny dziennik wdzięczności po polsku. Aplikacja jest jednoosobowa, lokalna i działa bez konta i backendu:
wpisy zapisują się w `localStorage` przeglądarki, a kopię zapasową robi się plikiem JSON. Docelowo PWA na iPhonie.

- [`docs/dokumentacja.md`](docs/dokumentacja.md): jak to działa i skąd wynikają decyzje (w tym format danych i zasady dat).
- [`docs/dziennik-zmian.md`](docs/dziennik-zmian.md): co i kiedy się zmieniło.
- [`docs/plan.json`](docs/plan.json): plan prac z priorytetami.
- [`docs/specyfikacja-dziennik-wdziecznosci.md`](docs/specyfikacja-dziennik-wdziecznosci.md): wymagania i wygląd.

## Uruchamianie lokalnie

Aplikacja używa modułów ES, które nie ładują się z `file://`, więc nie da się jej otworzyć dwuklikiem na `index.html`.
Potrzebny jest prosty serwer:

```sh
npm start        # python3 tools/dev-server.py (port 8000, bez cache'owania)
```

Potem otwórz <http://localhost:8000>. Dane w `localStorage` są przypisane do adresu, więc `localhost:8000` ma osobny
magazyn od strony opublikowanej w internecie i od zainstalowanej aplikacji na telefonie.
Przy pierwszym uruchomieniu (i w każdej nowej przeglądarce) magazyn jest pusty: kalendarz nie pokaże żadnych wpisów,
dopóki nie zaimportujesz kopii przyciskiem „Importuj kopię zapasową” na dole strony (plik `backups/kopia-…json`).

## Testy

```sh
npm test         # node --test (Node 20+), bez zależności
TZ=America/Los_Angeles npm test   # to samo w innej strefie czasowej
```

Testy obejmują logikę bez DOM: daty, serię, podsumowanie, kopię zapasową, kalendarz i szkice. Interfejs sprawdzamy ręcznie
(podgląd 390×844, czyli iPhone 14, kilka motywów). `python3 tools/mutation-check.py` sprawdza, czy testy wykrywają celowo zepsuty kod.

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
  calendar-model.js   reguły kalendarza: siatka, miesiące, przyszłość, reduktor (czyste)
  drafts.js           szkice niezapisanych formularzy: porównanie, wybór, import (czyste)
  draft-sync.js       opóźniony i wymuszony zapis szkicu (czas, bez reguł)
  today-sync.js       powrót do dziś: decyzje po powrocie z tła i o północy  (czyste)
  notice.js           baner nad formularzem
  calendar.js         wybór daty: rysowanie panelu i zdarzenia (cienka warstwa)
  history.js          lista poprzednich wpisów
  summary.js          karta podsumowania miesiąca
  backup-panel.js     przyciski eksportu i importu
  header.js           data i licznik serii
  quote.js            cytat dnia
  themes.js           wybór motywu, emoji pory roku
  garland.js          girlanda światełek w motywach zimowych
tests/                testy logiki (node --test), dane wymyślone
tools/                serwer bez cache'u, kontrola testów przez psucie kodu, scenariusze w przeglądarce
assets/               favicon (docelowo ikony i ekran startowy)
docs/                 dokumentacja, dziennik zmian, plan, specyfikacja
legacy/               prototyp w jednym pliku HTML — punkt odniesienia
backups/              prywatne kopie wpisów, poza repozytorium (.gitignore)
```

Zasady: logika w czystych funkcjach bez DOM i `localStorage`, warstwa interfejsu tylko renderuje i podpina zdarzenia,
elementy powstają przez `h()` / `textContent` (nigdy przez sklejanie HTML z tekstu), kolory tylko przez zmienne motywu.

## Jak dodać…

- **Cytat:** dopisz tekst w `js/quotes.js`. Bez autora, bo to oryginalne sentencje.
- **Motyw:** dodaj zestaw zmiennych w `css/tokens.css`, opcję w `#themeSelect` w `index.html` i emoji pory roku w
  `js/themes.js`.
