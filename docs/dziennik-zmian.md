# Dziennik zmian

Co i kiedy się zmieniło. Najnowsze na górze. Każda zmiana ma wpis; wyniki testów i sprawdzeń zapisujemy tylko tutaj,
a nie w [dokumentacji](dokumentacja.md). Numery „pkt” odnoszą się do [planu](plan.json).

Format wpisu: data, krótki tytuł, potem sekcje (tylko te, które są potrzebne):
**Dodano**, **Zmieniono**, **Naprawiono**, **Sprawdzono**, **Nie sprawdzono**.

---

## 2026-10-11: Przegląd przed publikacją i nazwa „Little Lights” w plikach (pkt 4, część)

**Sprawdzono (przegląd przed upublicznieniem repozytorium)**

- Wszystkie pliki i cała historia (27 commitów) pod kątem e-maili, numerów telefonu, ścieżek lokalnych, nazwiska, kluczy i tokenów: nic nie znaleziono.
  Żaden plik nigdy nie został usunięty z historii, więc nic prywatnego się w niej nie ukrywa. Dane w testach, scenariuszach i dokumentach są wymyślone.
- Wszystkie commity mają autora i committera z adresem noreply GitHuba (historia przepisana wcześniej, zawartość drzew bez zmian).

**Zmieniono**

- Nazwa pliku eksportu: `little-lights-kopia-RRRR-MM-DD.json` (dawniej `kopia-dziennika-wdziecznosci-…`). Wczytywanie nie zależy od nazwy,
  więc starsze kopie nadal działają. `.gitignore` wyklucza oba wzorce.
- `package.json`: nazwa `little-lights` i opis. `docs/specyfikacja-dziennik-wdziecznosci.md` → `docs/specyfikacja.md` (tytuł i wzmianka o tytule aplikacji w treści).
- Zostają bez zmian: klucze `localStorage` `gratitude_journal_*` (zmiana = utrata danych), `docs/dziennik-zmian.md` (changelog), prototyp w `legacy/`.

**Dodano**

- Test linków w dokumentach (`tests/docs.test.js`, L1) i test nazwy pakietu (P10). `tools/mutation-check.py` kopiuje także `docs/` i `README.md`.

**Sprawdzono**

- Testy: 288 w czterech strefach (najpierw trzy czerwone: nazwa pliku, `.gitignore`, nazwa pakietu).
- Pierwsze uruchomienie kontroli przez psucie kodu było nieważne: baza (kod bez usterek) pokazała 1 niepowodzenie, bo skrypt nie kopiował
  `README.md` ani `docs/`, więc wszystko „wykrywało się” trywialnie. Poprawione i uruchomione ponownie: baza 0 niepowodzeń,
  209 usterek (4 nowe: stara nazwa pakietu, obecny wzorzec `.gitignore`, zepsute linki w README i dokumentacji), wszystkie wykryte.
  Jedna usterka była źle wycelowana (zamieniała tekst linku zamiast jego celu); po poprawce sprawdzona osobno.
- Scenariusz kopii w przeglądarce z nową nazwą pliku: bez niepowodzeń.

---

## 2026-10-11: Workflow publikacji na GitHub Pages (pkt 4, część)

**Dodano**

- `.github/workflows/pages.yml`: po wypchnięciu na `main` zadanie `test` (`npm test`, Node 22), a po nim `deploy`: zbiera tylko pliki
  aplikacji do `_site/` i publikuje je (`configure-pages`, `upload-pages-artifact`, `deploy-pages`). Wersje główne akcji sprawdzone
  w repozytoriach akcji (checkout v7, setup-node v7, configure-pages v6, upload-pages-artifact v5, deploy-pages v5).
- 7 testów (`tests/deploy.test.js`, W1–W6): na stronę nie trafia nic prywatnego ani wzorce, trafia wszystko, czego aplikacja potrzebuje,
  opublikowane katalogi zawierają tylko kod i obrazy, testy poprzedzają publikację, uprawnienia są minimalne, `.gitignore` chroni kopie.

**Zmieniono**

- `tools/mutation-check.py` kopiuje także `.github` i `.gitignore`.

**Sprawdzono**

- Testy: 286 w czterech strefach (7 nowych, najpierw czerwone: brak pliku workflow).
- Kontrola przez psucie kodu: 205 usterek (31 nowych: docs, tests, legacy, backups, wzorce, brakujące pliki, brak `needs`, szerokie
  uprawnienia, cudza akcja, sekret), wszystkie wykryte. Jedna przeżyła za pierwszym razem (brak uprawnień na najwyższym poziomie
  ukryty przez to samo uprawnienie w zadaniu `deploy`); test W5 wzmocniony.
- Symulacja publikacji: dokładnie polecenia z workflow wykonane na kopii repozytorium, wynik uruchomiony pod `/little-lights/`
  (adres z podkatalogiem). Aplikacja, manifest, ikony i skrypty odpowiadają (200), a `docs/`, `legacy/`, `tools/`, `README.md`,
  `backups/` i `package.json` dają 404. Zapis próbnego wpisu działa z podkatalogu.
- Składnia YAML sprawdzona parserem Prettiera.

**Nie sprawdzono**

- Prawdziwego przebiegu workflow na GitHubie (repozytorium jeszcze nie istnieje): uprawnienia środowiska `github-pages`,
  ustawienie źródła publikacji „GitHub Actions” i zielone zadania zobaczymy po pierwszym pushu.

---

## 2026-10-11: Manifest i tagi aplikacji, nazwa „Little Lights” (pkt 2, początek pkt 13)

**Dodano**

- `manifest.json`: nazwa i `short_name` „Little Lights”, `lang` pl, `display` standalone, `start_url` i `scope` `./`,
  kolory `#fbf0e2`, ikony 192 i 512 px.
- Statyczne tagi w `<head>`: link do manifestu, tryb aplikacji Apple, tytuł pod ikoną, pasek statusu `black-translucent`,
  `format-detection telephone=no`, `apple-touch-icon` 180 px z `?v=1`.
- `viewport-fit=cover` i odstępy `env(safe-area-inset-top/bottom)` na kontenerze (z odstępem zapasowym dla starszych przeglądarek).
  To pierwszy kawałek punktu 13, potrzebny, bo `black-translucent` wciąga treść pod zegar i notch.
- 10 testów (`tests/pwa.test.js`, P1–P9) czytających prawdziwe pliki: manifest, nagłówek, wymiary i typ PNG z nagłówka pliku, CSS.

**Zmieniono**

- Nazwa aplikacji na „Little Lights” w `APP_TITLE`, `<title>`, nagłówku h1, manifeście i tytule pod ikoną (decyzja autorki, D52).
  Dokumenty projektu i `legacy/` zachowują starą nazwę.
- `tools/mutation-check.py` kopiuje teraz także `index.html`, `manifest.json`, `css/`, `assets/` i ikonę, bo nowe testy czytają te pliki.

**Sprawdzono**

- Testy: 280 w czterech strefach (10 nowych, najpierw czerwone: brak `manifest.json`).
- Kontrola przez psucie kodu: 174 usterki (34 nowe: manifest, tagi, ścieżki absolutne, wymiary ikon, odstępy), wszystkie wykryte.
  Ikona z kanałem alfa (czego skrypt tekstowy nie wywoła) sprawdzona ręcznie na kopii: test P5 pada.
- Przeglądarka 390×844: aplikacja ładuje się z nową nazwą, manifest i ikony odpowiadają (200, `application/json` i `image/png`),
  odstępy bez zmian (na komputerze wcięcia wynoszą 0).

**Nie sprawdzono**

- Zachowania na prawdziwym iPhonie: pełny ekran, ikona, nazwa pod ikoną, odstępy pod notchem i paskiem home.
  Wymaga adresu w internecie (pkt 4). Nazwa „Little Lights” może okazać się za długa pod ikoną; wtedy skrócić `apple-mobile-web-app-title`.
- Poziome wcięcia (boki) w układzie poziomym; girlanda ma ujemne marginesy 20 px i w poziomie nie dosięgnie krawędzi.

---

## 2026-10-11: Ikona aplikacji (pkt 3, część)

**Dodano**

- Ikona „Little Lights”: rudy kotek śpiący pod girlandą na żurawinowym tle. Autorka wybrała ją spośród czterech projektów
  (girlanda, kubek z sercem, słoik ze świetlikami, kotek), potem z dwóch odcieni czerwieni (żurawina wygrała z jaśniejszą czerwienią). Źródło: `assets/icon-source.svg`.
- Pliki PNG 120, 152, 167, 180, 192 i 512 px w `assets/icons/` oraz `apple-touch-icon.png` (180 px) w katalogu głównym.
  Każdy rozmiar renderowany osobno z SVG (Inkscape), bez kanału przezroczystości (RGB).

**Zmieniono**

- Czerwona żarówka w girlandzie jest na ikonie kremowa, bo na czerwonym tle by znikała.

**Sprawdzono**

- Wymiary i format każdego pliku, brak kanału alfa, kolor rogów (żurawina, nie czerń), środek obrazu.
- Podgląd w 60 pt z zaokrągleniem iOS na jasnej i ciemnej tapecie oraz plansza kontrolna 512/180/120 px.

**Nie sprawdzono**

- Ikony na prawdziwym iPhonie. Nie jest jeszcze podpięta w `index.html` ani w manifeście (reszta punktów 2–4).

---

## 2026-10-11: Eksport i import kopii, „nowszy wygrywa” (pkt 14)

**Naprawiono**

- Import zawsze zastępował wpis z tej samej daty wpisem z pliku, więc starsza kopia po cichu kasowała świeższą pracę, a komunikat
  mówił tylko „Wczytano ✓”.

**Dodano**

- Scalanie `mergeEntries`: zostaje wpis z większym `savedAt` (remis i ta sama treść: wpis obecny), z raportem
  „Dodano / zaktualizowano / bez zmian” i liczbą pominiętych wpisów.
- Eksport przez okno udostępniania (`share.js`, `pickExportMethod`), z awaryjnym pobraniem linkiem. Zamknięcie okna nie jest błędem.
- Licznik „Ostatnia kopia: dziś / wczoraj / X dni temu” i „Jeszcze nie robiłaś kopii zapasowej”, klucz `gratitude_journal_last_backup`
  (poza plikiem kopii). Funkcja `daysBetween` w `dates.js`.
- Ciche `navigator.storage.persist()`.
- Scenariusz w przeglądarce `tools/scenarios/kopia-zapasowa.html` (atrapa okna udostępniania, przechwycone pobranie, wymyślone dane).

**Zmieniono**

- Wybór pliku akceptuje `.json,application/json` (węższe `accept` bywa na iOS wyszarzone).
- Podpowiedź w karcie kopii mówi, że zostaje nowsza wersja wpisu i że usunięty wpis może wrócić.
- Bez cofania importu (decyzja autorki, D48) i bez osobnej liczby remisów (D49).

**Sprawdzono**

- 36 nowych testów (najpierw czerwone: trzy pliki nie ładowały się bez brakującego kodu), razem 270 w czterech strefach.
- Kontrola przez psucie kodu: 144 usterki (41 nowych), 143 wykryte. Pierwsze podejście wykryło 3 luki w testach, wszystkie poprawione:
  brak przypadku „obecny wpis ma mniej wdzięczności niż plik”, brak ujemnego `savedAt` i brak dnia, którego w strefie nie było
  (Kiritimati, 31.12.1994; samo `Math.round` ukrywało różnicę lokalnej północy i UTC). Czwarta usterka (brak kontroli `canShare`)
  jest równoważna, bo `try/catch` daje ten sam wynik, więc usunięta z listy.
- Scenariusz w przeglądarce: 40 sprawdzeń, 0 niepowodzeń. Obejmuje import starszej, nowszej i mieszanej kopii, ponowny import
  (same „bez zmian”), pusty i zepsuty plik, formularz otwarty na zaimportowanym dniu (odświeżony albo z ostrzeżeniem),
  eksport (synchroniczne `share`, nazwa z lokalną datą, zawartość, licznik), anulowanie, błąd okna i brak obsługi plików, licznik po dwóch dniach.
- Karta kopii obejrzana w 390×844, bez przycinania i przewijania poziomego.

**Nie sprawdzono**

- Okna udostępniania w Safari na iPhonie ani wyboru pliku w aplikacji Pliki (w przeglądarce działa atrapa). Do zrobienia po wdrożeniu PWA.
- Notka pod kartą kopii („Otwieraj ten sam plik…”) jest nieaktualna dla PWA; do poprawy przy wdrożeniu (pkt 2–6).

---

## 2026-10-10: Girlanda światełek (pkt 11)

**Naprawiono**

- Żarówki były rozciągane w owale na telefonie (`viewBox` 640 + `preserveAspectRatio="none"`). Teraz `viewBox` równa się
  zmierzonej szerokości w pikselach, więc żarówki są kółkami.
- Sznurek był łamaną linią i prawie niewidocznym kolorem `--border` w zima jasny.
- Opóźnienia migotania powtarzały się co 8 żarówek (mechaniczny rytm).

**Dodano**

- Zwisające łuki sznurka (krzywe Béziera) od krawędzi do krawędzi, 2–6 zawieszeń zależnie od szerokości, zwis 10–14 px.
- Okrągłe żarówki na oprawkach, z miękką poświatą (gradient, bez filtrów SVG). Liczba żarówek zależy od szerokości
  (ok. jedna na 30 px, 13 na iPhonie 14). Sąsiednie żarówki nigdy nie mają tego samego koloru.
- Migotanie z ujemnymi opóźnieniami z generatora z ziarnem (2,2–3,0 s na żarówkę), tylko `opacity`.
- Pauza animacji poza ekranem, wyłączone migotanie przy `prefers-reduced-motion`.
- Przebudowa przy obrocie ekranu, zmianie okna i przełączeniu motywu (w motywach niezimowych girlandy nie zajmują DOM).
- `garland-model.js` (czysta geometria) i scenariusz w przeglądarce `tools/scenarios/girlanda.html`.

**Zmieniono**

- Kolor sznurka z `--border` na `--muted` (krycie 0,5). Istniejący token, palety bez zmian. Autorka porównała zrzuty obu wariantów (390 px, zima jasny) i zaakceptowała `--muted` (D46).
- Wysokość girlandy stała, 40 px (było 34 px plus margines), więc układ nie skacze.

**Sprawdzono**

- 29 nowych testów (najpierw czerwone), razem 234 w czterech strefach. Wartości kontrolne generatora policzone niezależnie w Pythonie.
- Kontrola przez psucie kodu: 103 usterki (23 nowe), wszystkie wykryte. Wykryła dwie słabości testów: testy importowały wymiary
  z testowanego modułu (zepsucie stałej psuło też oczekiwanie) i miały za małą precyzję wartości generatora. Obie poprawione.
  Trzy testy miały też zbyt ostrą tolerancję względem celowego zaokrąglania współrzędnych do 0,1 (poprawione w testach, nie w kodzie).
- Scenariusz w przeglądarce: kształt i skala na 390 px (kółka 9×9, `viewBox` 390×40, 4 łuki, 13 żarówek), pełna szerokość ekranu,
  brak przewijania poziomego od girland, ziarna, migotanie tylko `opacity`, reguła `prefers-reduced-motion`, kolor i krycie sznurka,
  pauza poza ekranem i wznowienie, przebudowa po zmianie szerokości (320, 390, 640 px, bez duplikatów), przełączanie motywów
  w obie strony (po zimie girlandy rysują się od nowa, w jesieni nie zostawiają elementów), zimny start w jesieni z późniejszym przełączeniem na zimę.
- Wygląd na 390 px w zima ciemny i zima jasny.

**Nie sprawdzono**

- Prawdziwego iPhone'a: płynności animacji, zużycia baterii i działania przy zmianie orientacji. Pomiar baterii wymaga urządzenia.
- Reguły `prefers-reduced-motion` w działaniu (sprawdzono tylko jej obecność w CSS).
- Pełnego, nieprzerwanego przebiegu scenariusza w jednym uruchomieniu: karta sterowana narzędziem bywa „ukryta” i obserwatory
  nie działają, więc fragmenty uruchamiano kilkakrotnie. Każde sprawdzenie przeszło przynajmniej raz.

**Znalezione przy okazji**

- Na ekranie 320 px (iPhone SE) lista motywów w nagłówku wystaje poza ekran (prawa krawędź ok. 373 px) i powoduje przewijanie
  poziome. To starszy problem układu, nie girlandy; zapisany w punkcie 12.

## 2026-10-10: Powrót do dzisiejszej daty (pkt 9)

**Wyjaśnienie.** Zimny start (odświeżenie strony) już wcześniej zawsze otwierał „dziś”. Brakowało powrotu do aplikacji, która
żyje w tle, i obsługi północy.

**Dodano**

- Powrót z tła (`visibilitychange`, `pageshow` po bfcache): po co najmniej 10 minutach albo po zmianie dnia aplikacja przechodzi
  na dziś, także przy rozgrzebanym formularzu (szkic zapisuje się przy ukryciu).
- Timer do północy: nietknięty formularz przechodzi po cichu na nowy dzień, a przy pisaniu pojawia się baner
  „🌅 Jest już nowy dzień. [Przejdź do dziś]” (zamiast przerywać).
- Baner „📝 Masz niezapisany szkic z dnia … [Otwórz]” przy starcie i po powrocie na dziś.
- Po zmianie dnia odświeżają się: data w nagłówku, wskaźnik „Nowy wpis na dziś”, pierścień „dziś” w kalendarzu, seria, podsumowanie.
- Moduły `today-sync.js` (czysta logika), `notice.js` (baner), `calendar.refresh()`.
- Scenariusz w przeglądarce `tools/scenarios/powrot-do-dzis.html` (zachowuje i przywraca `localStorage`).

**Zmieniono**

- Baner o nowym dniu pojawia się od razu, a nie po zapisie, jak było w planie (D43).

**Sprawdzono**

- 24 nowe testy (najpierw czerwone), razem 205 w czterech strefach, w tym czas do północy w dniach zmiany czasu.
- Kontrola przez psucie kodu: 80 usterek (18 nowych), wszystkie wykryte. Wykryła lukę w teście (`Infinity` jako czas w tle)
  i zbędny `Math.max` w kodzie, który usunięto.
- Scenariusz w przeglądarce, 39 sprawdzeń: zimny start, baner, powrót po 5 i 11 minutach, powrót po zmianie dnia, północ przy
  nietkniętym i rozgrzebanym formularzu, północ przy wybranym innym dniu, `pageshow`, przycisk „Dziś”. Wykrył lukę: po
  „Przejdź do dziś” nie było propozycji szkicu ze starego dnia (naprawione).
- Wygląd baneru w jesień jasny i zima ciemny.

**Nie sprawdzono**

- Prawdziwego iPhone'a, prawdziwego powrotu z tła ani północy (zegar i timery były podmienione w ramce testowej),
  pozostałych 6 motywów dla baneru.

## 2026-10-10: Przepisana dokumentacja i dziennik zmian

**Zmieniono**

- `docs/dokumentacja.md` przepisana od zera: 799 → ok. 300 linii. Opisuje tylko stan obecny i powody decyzji.
  Usunięte: wyniki weryfikacji, statusy, tabele kontrastów, listy kontrolne M1–M10 i MS1–MS8 (zastąpione jednym akapitem).
  Zostały: założenia, architektura, dane, daty, import, kalendarz (zasady, kolory), szkice (zasady), interfejs,
  testy, iOS, znane ograniczenia, decyzje D1–D42, konwencje.
- Decyzje zapisane jako krótka lista (decyzja + powód) zamiast tabeli z odrzuconymi alternatywami i statusami.
- `README.md` skrócony: bez powtórzonych sekcji o formacie danych i datach (są w dokumentacji), bez listy znanych problemów.
- `plan.json`: poprawione odwołania do dokumentacji, dodany punkt 24.

**Przeniesiono**

- Pełne listy zachowań K1–K23 i S1–S23 z dokumentacji na początek `tests/calendar-model.test.js` i `tests/drafts.test.js`
  (tam są używane, a numer stoi na początku nazwy testu). W dokumentacji zostały krótkie opisy zasad i odesłania.
  Dokumentacja: ok. 340 → ok. 300 linii. Komentarze w `calendar-model.js` i `drafts.js` wskazują teraz na pliki testowe.

**Dodano**

- Ten dziennik (`docs/dziennik-zmian.md`).
- Decyzja D42: dokumentacja opisuje stan obecny, historia jest tutaj.

**Bez zmian w logice kodu** (zmieniły się tylko komentarze). Numery K i S zostały bez zmian, bo są w nazwach testów.

---

## 2026-10-07: Szkice niezapisanych wpisów (pkt 10)

**Dodano**

- Szkice: formularz różniący się od zapisanego wpisu zapisuje się jako szkic (osobny klucz `gratitude_journal_drafts_v1`),
  500 ms po ostatnim znaku oraz od razu przy zmianie dnia, ukryciu aplikacji i `pagehide`.
- Wskaźnik „📝 Szkic — jeszcze niezapisany” / „📝 Szkic zmian…” i przycisk „Odrzuć szkic” (z potwierdzeniem).
- Reguła po imporcie: nietknięty formularz odświeża się, a z wpisanym tekstem zostaje z ostrzeżeniem.
- Moduły `drafts.js` (logika), `draft-sync.js` (czas), `loadDrafts`/`saveDrafts` w `store.js`.
- Pusta kropka w kalendarzu przy dniu ze szkicem bez wpisu (wpis wygrywa, gdy są oba).

**Naprawiono**

- Przejście na inny dzień, odświeżenie strony i zamknięcie aplikacji nie kasują już wpisanego tekstu.
- Po usunięciu wpisu z wybranego dnia formularz się odświeża.

**Sprawdzono**

- 66 testów szkiców (najpierw czerwone), razem 181 w czterech strefach czasowych.
- Kontrola przez psucie kodu: 62 usterki, wszystkie wykryte. Wykryła lukę: ujemne `updatedAt` przechodziło przez czyszczenie danych.
- Scenariusz w prawdziwej przeglądarce (47 sprawdzeń, wszystkie przeszły): opóźniony zapis, zmiana dnia i powrót, odświeżenie,
  `visibilitychange`, `pagehide`, zapis i usunięcie wpisu, „Odrzuć szkic”, import, uszkodzone dane, awaria zapisu.
- Wygląd wskaźnika: jesień jasny i zima ciemny.

**Nie sprawdzono**

- Prawdziwego iPhone'a i zabicia aplikacji przez iOS, pozostałych 6 motywów dla wskaźnika, dwóch kart naraz.
- Skrypt przeglądarkowy (47 sprawdzeń) nie został zachowany w repozytorium.

## 2026-10-07: Oznaczenia w kalendarzu

**Zmieniono**

- Dzień z wpisem: kafelek `--accent-soft` i kropka `--accent` 5 px zamiast kropki `--gold` 4 px, która była słabo widoczna
  w jasnych motywach (D31). Wygląd zaakceptowany przez autorkę. Palet nie zmieniono.
- Dni sąsiednich miesięcy z wpisem są mniej przygaszone (krycie 0,8).

**Naprawiono**

- `:hover` nie dotyczy już wybranego dnia. Na telefonie stan `:hover` zostaje po dotknięciu i robił z wybranego dnia biały
  tekst na jasnym tle.

**Sprawdzono**

- Dzień ze szkicem: 62 testy kalendarza, 37 usterek wykrytych, wygląd w jesień jasny, wiosna jasny, zima ciemny i lato jasny.
  Kontrast obrysu szkicu co najmniej 3,17:1 we wszystkich motywach.

## 2026-10-07: Kalendarz od zera (pkt 8)

**Dodano**

- `calendar-model.js`: czysta logika (siatka 6×7 od poniedziałku, przesuwanie miesięcy na liczbach, dni z przyszłości
  nieaktywne, reduktor stanu). `calendar.js` tylko rysuje.
- Panel rozwijany w karcie; komórki i strzałki to `<button>` 44×44 pt z `aria-label`, `aria-pressed`, `aria-current`.
- Cyfry w czcionce systemowej z `tabular-nums`; `touch-action: manipulation`.
- `tools/dev-server.py` (serwer bez cache'u, `npm start`) i `tools/mutation-check.py` (kontrola testów przez psucie kodu).

**Naprawiono**

- `setMonth` przeskakujący o dwa miesiące, gdy dziś jest 29.–31.
- Kalendarz nie czyta już `localStorage` w trakcie renderowania; kropki odświeżają się po zapisie, usunięciu i imporcie.
- „Dziś” przy już wybranym dniu nie przeładowuje formularza i nie kasuje wpisywanego tekstu.

**Sprawdzono**

- 54 testy kalendarza (razem 108), napisane przed kodem. Wartości siatek z niezależnego źródła (moduł `calendar` z Pythona).
- 31 usterek wprowadzonych celowo, wszystkie wykryte. Wykryły dwie luki w testach (brak testu, że stan nie ma dnia widoku;
  test niepoprawnego miesiąca przechodził z niewłaściwego powodu).
- Podgląd 390×844 we wszystkich 8 motywach, pomiar komórek (dokładnie 44×44 pt), brak błędów w konsoli.
- Autorka potwierdziła działanie w przeglądarce Brave.

**Nie sprawdzono**

- Czytnika ekranu (VoiceOver), klawisza Escape w przeglądarce (reguła jest w testach), prawdziwego iPhone'a.

## 2026-10-07: Daty w czasie lokalnym, walidacja importu (pkt 7)

**Naprawiono**

- Klucze dni liczone przez `toISOString()` (UTC) przesuwały dzień o jeden między 0:00 a 2:00 w Polsce. Teraz klucz powstaje
  z lokalnych składników daty, a rachunek na dniach idzie przez `Date.UTC` (odporny na zmianę czasu).

**Zmieniono**

- Jeden format wyświetlania wszędzie, wielką literą: „Piątek, 25 września 2026”, „Wrzesień 2026” (także w historii).
- Import sprawdza wpisy (`sanitizeEntries`): prawdziwy dzień w kluczu, `date` równe kluczowi, `savedAt` liczba, 1–3 niepuste
  wdzięczności. Niepoprawne są pomijane z podaniem liczby.

**Sprawdzono**

- 53 testy w czterech strefach (00:30 lokalnie, 31 stycznia, 29 lutego 2028, zmiana czasu 29.03 i 25.10, granica roku).
- Prawdziwa kopia autorki (3 wpisy z 25–27.09) przechodzi walidację bez zmian; żaden wpis nie powstał w oknie błędu UTC.

## 2026-10-07: Dokumentacja i plan

**Dodano**

- `docs/dokumentacja.md` (architektura, dane, daty, import, decyzje) i oznaczenia ✅ w `plan.json`.
- Punkty 22 (krok 0) i 23 (dokumentacja) w planie.

## 2026-09-30: Krok 0, repozytorium i moduły (pkt 1)

**Dodano**

- Repozytorium git, `.gitignore` (prywatne kopie `backups/` i `kopia-dziennika-*.json` nigdy do repozytorium),
  `.editorconfig`, Prettier, `package.json` (`npm start`, `npm test`).
- Podział prototypu w jednym pliku HTML na moduły ES, osobne CSS (`tokens`, `base`, `components`) i szkielet `index.html`.
- Czysta logika w modułach z testami (daty, seria i podsumowanie, kopia zapasowa), `store.js` jako jedyny dostęp do `localStorage`.
- `README.md`.

**Zmieniono**

- Elementy budowane przez `h()` i `textContent` zamiast sklejania HTML z tekstu (tekst `<b>` w polu wyświetla się jako zwykły tekst).
- Plan i specyfikacja w `docs/`, prototypy w `legacy/`, kopia autorki w `backups/` (poza repozytorium).

**Zachowano celowo** znane błędy prototypu (daty w UTC, kalendarz, import nadpisujący wpisy), żeby naprawiać je osobno.

**Sprawdzono**

- 28 testów w czterech strefach. Ten sam wygląd co prototyp w Zima ciemny (390×844), zgodne dane i format kopii.

**Nie sprawdzono**

- Eksportu, importu i usuwania wpisu w przeglądarce (okno wyboru pliku i `confirm()`); ich logika jest w testach.
