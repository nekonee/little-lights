# Little Lights

Codzienny dziennik wdzięczności po polsku (aplikacja nazywa się Little Lights). Aplikacja jest jednoosobowa, lokalna i działa bez konta i backendu:
wpisy zapisują się w `localStorage` przeglądarki, a kopię zapasową robi się plikiem JSON. Docelowo PWA na iPhonie.

- [`docs/dokumentacja.md`](docs/dokumentacja.md): jak to działa i skąd wynikają decyzje (w tym format danych i zasady dat).
- [`docs/dziennik-zmian.md`](docs/dziennik-zmian.md): co i kiedy się zmieniło.
- [`docs/plan.json`](docs/plan.json): plan prac z priorytetami.
- [`docs/specyfikacja.md`](docs/specyfikacja.md): wymagania i wygląd.

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
npm test                # node --test (Node 22+), bez zależności
npm run test:watch      # ponowne uruchomienie po zmianie pliku
npm run test:spec       # czytelna lista zachowań zamiast skrótu
npm run test:tz         # te same testy w czterech strefach czasowych
npm run test:coverage   # pokrycie kodu w js/
npm run build:site      # składa folder _site z samymi plikami aplikacji
```

Testy obejmują logikę bez DOM: daty, serię, podsumowanie, kopię zapasową, kalendarz i szkice. Interfejs sprawdzamy ręcznie
(podgląd 390×844, czyli iPhone 14, kilka motywów). `python3 tools/mutation-check.py` sprawdza, czy testy wykrywają celowo zepsuty kod.

## Struktura

```text
index.html            szkielet strony (bez logiki i bez stylów inline), tagi aplikacji w <head>
manifest.json         manifest PWA: nazwa, kolory, ikony (czytany przy instalacji)
css/
  tokens.css          8 motywów jako zmienne CSS
  base.css            reset, typografia, pola formularza
  components.css      komponenty: karty, kalendarz, historia, girlanda…
js/
  app.js              start aplikacji, stan (wybrana data), łączenie modułów
  dates.js            klucze dni i miesięcy, rachunek na dniach, daty po polsku (czyste)
  streak-summary.js   streak i podsumowanie miesiąca                  (czyste)
  backup.js           serializacja, parsowanie, walidacja, scalanie „nowszy wygrywa” i status kopii (czyste)
  share.js            wybór eksportu: okno udostępniania albo pobranie  (czyste)
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
  backup-panel.js     przyciski eksportu i importu, licznik „Ostatnia kopia”
  header.js           data i licznik serii
  quote.js            cytat dnia
  themes.js           wybór motywu, emoji pory roku
  garland-model.js    geometria girlandy: łuki, żarówki, kolory, migotanie   (czyste)
  garland.js          girlanda światełek w motywach zimowych (rysowanie SVG)
.github/workflows/   publikacja na GitHub Pages: testy, potem tylko pliki aplikacji (pages.yml)
tests/unit/           testy logiki bez DOM (node --test), dane wymyślone
tests/static/         kontrakty plików: manifest, ikony, publikacja, linki w dokumentach
tests/helpers/        wspólne narzędzia testów
scripts/              build-site.js: składa stronę (używa go workflow i test publikacji)
tools/                serwer bez cache'u, kontrola testów przez psucie kodu, scenariusze w przeglądarce
assets/               favicon, ikona aplikacji (źródło SVG i PNG), docelowo ekran startowy
apple-touch-icon.png  ikona 180×180 dla iOS (kopia w katalogu głównym, tak jej szuka Safari)
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
