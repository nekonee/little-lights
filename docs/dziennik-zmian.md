# Dziennik zmian

Co i kiedy się zmieniło. Najnowsze na górze. Każda zmiana ma wpis; wyniki testów i sprawdzeń zapisujemy tylko tutaj,
a nie w [dokumentacji](dokumentacja.md). Numery „pkt” odnoszą się do [planu](plan.json).

Format wpisu: data, krótki tytuł, potem sekcje (tylko te, które są potrzebne):
**Dodano**, **Zmieniono**, **Naprawiono**, **Sprawdzono**, **Nie sprawdzono**.

---

## 2026-10-10: Przepisana dokumentacja i dziennik zmian

**Zmieniono**

- `docs/dokumentacja.md` przepisana od zera: 799 → ok. 340 linii. Opisuje tylko stan obecny i powody decyzji.
  Usunięte: wyniki weryfikacji, statusy, tabele kontrastów, listy kontrolne M1–M10 i MS1–MS8 (zastąpione jednym akapitem).
  Zostały: założenia, architektura, dane, daty, import, kalendarz (zachowania K1–K23, kolory), szkice (S1–S23), interfejs,
  testy, iOS, znane ograniczenia, decyzje D1–D42, konwencje.
- Decyzje zapisane jako krótka lista (decyzja + powód) zamiast tabeli z odrzuconymi alternatywami i statusami.
- `README.md` skrócony: bez powtórzonych sekcji o formacie danych i datach (są w dokumentacji), bez listy znanych problemów.
- `plan.json`: poprawione odwołania do dokumentacji, dodany punkt 24.

**Dodano**

- Ten dziennik (`docs/dziennik-zmian.md`).
- Decyzja D42: dokumentacja opisuje stan obecny, historia jest tutaj.

**Bez zmian w kodzie.** Nazwy sekcji „Kalendarz wyboru daty” i „Szkice niezapisanych wpisów” oraz numery K i S zostały,
bo odwołują się do nich komentarze i nazwy testów.

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
