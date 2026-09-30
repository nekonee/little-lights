<!doctype html><html><head><meta charset=utf8><meta name=viewport content="width=device-width,initial-scale=1,viewport-fit=cover"><style>:root{box-sizing:border-box;padding-top:env(safe-area-inset-top,0px);padding-bottom:env(safe-area-inset-bottom,0px)}html{scroll-padding-top:env(safe-area-inset-top,0px)}</style><style>:root{color-scheme:light dark;--md-bg:#fff;--md-text:rgba(0,0,0,.8);--md-muted:rgba(0,0,0,.6);--md-fill:rgba(0,0,0,.04);--md-fill-strong:rgba(0,0,0,.06);--md-rule:rgba(0,0,0,.1);--md-rule-strong:rgba(0,0,0,.16);--md-link:hsl(210 100% 45%)}@media (prefers-color-scheme:dark){:root:where(:not([data-theme="light"])){--md-bg:#0d0d0d;--md-text:rgba(255,255,255,.85);--md-muted:rgba(255,255,255,.6);--md-fill:rgba(255,255,255,.06);--md-fill-strong:rgba(255,255,255,.09);--md-rule:rgba(255,255,255,.14);--md-rule-strong:rgba(255,255,255,.22);--md-link:hsl(210 100% 72%)}}:root[data-theme="dark"]{color-scheme:dark;--md-bg:#0d0d0d;--md-text:rgba(255,255,255,.85);--md-muted:rgba(255,255,255,.6);--md-fill:rgba(255,255,255,.06);--md-fill-strong:rgba(255,255,255,.09);--md-rule:rgba(255,255,255,.14);--md-rule-strong:rgba(255,255,255,.22);--md-link:hsl(210 100% 72%)}:root[data-theme="light"]{color-scheme:light}@media print{:root,:root[data-theme="dark"]{color-scheme:light;--md-bg:#fff;--md-text:rgba(0,0,0,.8);--md-muted:rgba(0,0,0,.6);--md-fill:rgba(0,0,0,.04);--md-fill-strong:rgba(0,0,0,.06);--md-rule:rgba(0,0,0,.1);--md-rule-strong:rgba(0,0,0,.16);--md-link:hsl(210 100% 45%)}}body{background:var(--md-bg);color:var(--md-text);max-width:720px;margin:0 auto;padding:32px;display:flex;flex-direction:column;gap:10px;font:14px/1.55 -apple-system,BlinkMacSystemFont,'SF Pro','Segoe UI',sans-serif;overflow-wrap:break-word}body>:first-child{margin-top:0}h1,h2,h3,h4,h5,h6{margin:6px 0 0;line-height:1.25;font-weight:600;text-wrap:balance}h1{font-size:1.35em}h2{font-size:1.15em;color:var(--md-muted)}h3,h4,h5,h6{font-size:1em}p,ul,ol,blockquote,table,pre,hr{margin:0}strong{font-weight:600}a{color:var(--md-link);text-decoration:none}a:hover{text-decoration:underline}ul,ol{display:flex;flex-direction:column;gap:6px;padding-left:22px}ul{list-style:disc}ol{list-style:decimal}:is(li,td,th)>*+:is(p,ul,ol,blockquote){margin-top:6px}blockquote{display:flex;flex-direction:column;gap:10px;border-left:2px solid var(--md-rule);padding-left:10px;color:var(--md-muted)}:not(pre)>code{background:var(--md-fill);padding:1px 3px;border-radius:4px;font:.92em 'SF Mono',ui-monospace,Menlo,Consolas,monospace}a>code{background:none;color:inherit}pre{background:var(--md-fill);padding:10px 12px;border-radius:6px;overflow-x:auto;font:12px/1.5 'SF Mono',ui-monospace,Menlo,Consolas,monospace;margin-block:4px}pre code{background:none;padding:0;font:inherit}table{width:100%;border-collapse:separate;border-spacing:2px;font:inherit}th,td{padding:6px 8px;border-radius:3px;text-align:left;vertical-align:top}th{background:var(--md-fill-strong);font-weight:600}td{background:var(--md-fill)}:is(th,td) :not(pre)>code{background:transparent}hr{border:0;border-top:1px solid var(--md-rule-strong);margin-block:10px}img{max-width:100%;height:auto;border-radius:4px}</style>
</head><body>
<h1>Dziennik Wdzięczności — specyfikacja aplikacji mobilnej</h1>
<p>Dokument opisuje istniejący prototyp webowy (jeden plik HTML, localStorage) oraz wymagania do zbudowania natywnej/mobilnej wersji na iPhone. Język interfejsu: <strong>polski</strong>. Aplikacja jest <strong>jednoosobowa, lokalna, offline-first</strong> — bez kont, logowania ani backendu.</p>
<hr>
<h2>1. Cel i charakter aplikacji</h2>
<p>Codzienny dziennik wdzięczności z ustrukturyzowanymi promptami (nie pusta kartka) — użytkowniczka wypełnia kilka konkretnych pól zamiast pisać wolny tekst, co obniża próg wejścia i pogłębia refleksję. Ton: ciepły, spokojny, przytulny (&quot;comfy&quot;) — estetyka i mikro-copy mają dawać poczucie przytulności, nie być korporacyjne ani gamifikowane w nachalny sposób (streak i podsumowania mają motywować subtelnie, nie naciskać). <strong>Warstwa wizualna jest jednym z najważniejszych elementów aplikacji</strong> — użytkowniczka reaguje na nią bardzo emocjonalnie (dosłownie wzruszyła się do łez zimowymi światełkami w prototypie webowym), więc dopracowanie motywów sezonowych i drobnych detali graficznych (sekcja 9) to nie &quot;nice to have&quot;, tylko sedno produktu.</p>
<h2>2. Model danych</h2>
<p>Jeden wpis = jeden dzień, klucz = data w formacie <code>YYYY-MM-DD</code> (strefa czasowa lokalna urządzenia, nie UTC — ważne przy północy). Struktura wpisu:</p>
<pre><code>{
  date: &#34;YYYY-MM-DD&#34;,
  grateful: [string, string, string],   // 1–3 rzeczy, tylko niepuste
  why: string,                           // dlaczego to ważne
  person: string,                        // kogo dziś doceniam
  proud: string,                         // z czego jestem dumna
  lesson: string,                        // wyzwanie i lekcja
  savedAt: timestamp                     // czas ostatniego zapisu, do sortowania/debugu
}
</code></pre>
<p>Jeden wpis na dzień (nadpisywalny — edycja = zapis pod tym samym kluczem daty). W prototypie webowym dane leżały jako pojedynczy JSON w <code>localStorage</code> pod kluczem <code>gratitude_journal_entries_v1</code>. <strong>W wersji natywnej: rekomendacja Core Data lub prosty plik JSON w katalogu Documents aplikacji</strong> (dataset jest mały — setki, nie tysiące rekordów — więc pełna baza danych to over-engineering; wystarczy dict/array trzymany w pliku i wczytywany do pamięci przy starcie). Ważne: model musi być prosty do serializacji do/z JSON, bo na nim opiera się funkcja eksportu/importu (patrz sekcja 6).</p>
<h2>3. Ekran główny — formularz wpisu</h2>
<p>Pola w tej kolejności, każde z etykietą i placeholderem (zachować dokładnie ton i przykłady):</p>
<ol>
<li><strong>Za co jestem wdzięczna? (3 rzeczy)</strong> — 3 osobne pola tekstowe jednowierszowe, numerowane 1/2/3. Podpowiedź pod etykietą: <em>&quot;Im bardziej konkretnie, tym lepiej — zamiast „rodzina&quot;, spróbuj „telefon od mamy dziś rano&quot;.&quot;</em> Placeholdery: „np. poranna kawa w spokoju&quot;, „np. wiadomość od przyjaciółki&quot;, „np. słońce po południu&quot;. Walidacja: wymagane minimum 1 z 3 pól, reszta opcjonalna.</li>
<li><strong>Dlaczego to dla mnie ważne?</strong> — pole wieloliniowe, opcjonalne. Placeholder: „Rozwiń jedną z powyższych rzeczy...&quot;.</li>
<li><strong>Kogo dziś doceniam?</strong> — pole jednowierszowe, opcjonalne. Placeholder: „np. sąsiadka, która pomogła z paczką&quot;.</li>
<li><strong>Z czego jestem dziś dumna?</strong> — pole jednowierszowe, opcjonalne. Placeholder: „np. dokończyłam trudne zadanie&quot;.</li>
<li><strong>Jakie wyzwanie dziś miałam i czego mnie nauczyło?</strong> — pole wieloliniowe, opcjonalne. Placeholder: „Nawet trudny dzień może dać jakąś lekcję...&quot;.</li>
</ol>
<p>Przycisk zapisu na dole, pełna szerokość: „Zapisz wpis&quot; (gdy dzień jeszcze nie ma wpisu) / „Zapisz zmiany&quot; (gdy edytujemy istniejący). Poniżej krótki status po zapisie (&quot;Zapisano ✓&quot; / komunikat o braku minimalnej treści).</p>
<h2>4. Cytat dnia</h2>
<p>Nad formularzem: losowy cytat o wdzięczności z predefiniowanej puli (poniżej), w cudzysłowie, kursywą, na wyróżnionym tle. Przycisk „⟳ inny&quot; losuje kolejny. <strong>Nie są to cytaty przypisane realnym autorom</strong> — to celowo neutralne, oryginalne sentencje (kwestia praw autorskich i pewności co do źródła), więc nie dodawać atrybucji do konkretnych osób.</p>
<p>Pełna lista (do skopiowania 1:1):</p>
<blockquote>
<p>Wdzięczność to pamięć serca.
Zauważanie małych rzeczy zmienia sposób, w jaki widzimy cały dzień.
Nie jesteśmy szczęśliwi, bo mamy dużo — jesteśmy szczęśliwi, gdy potrafimy docenić to, co mamy.
Każdy dzień kryje coś, za co warto podziękować, nawet jeśli trzeba tego poszukać.
Wdzięczność zamienia to, co mamy, w coś wystarczającego.
Spokój zaczyna się od zauważenia dobra, które już jest obecne.
Najprostsze chwile bywają najcenniejsze, jeśli poświęcimy im uwagę.
Uważność na dobro nie wymaga wielkich zmian — wystarczy chwila refleksji.
Dziękowanie za drobiazgi otwiera oczy na to, co ważne.
Trudny dzień też może zostawić po sobie coś wartościowego.
Docenianie innych jest jednym z najprostszych sposobów, by poczuć się bliżej ludzi.
Wdzięczność nie usuwa trudności, ale zmienia sposób, w jaki na nie patrzymy.
Czasem wystarczy zatrzymać się na chwilę, by dostrzec, ile już mamy.
Radość rośnie, gdy dzielimy się wdzięcznością z innymi.
To, na czym skupiamy uwagę, staje się większe w naszym życiu — warto wybierać dobro.
Jesień uczy, że odpuszczanie też może być formą wdzięczności.
Nawet liść, zanim opadnie, zdąży zabłysnąć kolorem — warto zauważać takie chwile.
Ciepła herbata, koc i chwila spokoju też zasługują na podziękowanie.</p>
</blockquote>
<p>Rozszerzalne — dobrze byłoby przewidzieć w kodzie łatwe dodawanie kolejnych cytatów (osobny plik/zasób, nie zahardkodowane w widoku).</p>
<h2>5. Wybór daty wpisu (do przepisania na natywny komponent)</h2>
<p><strong>Kontekst:</strong> w prototypie webowym próbowałam zrobić customowy kalendarzyk (siatka dni budowana ręcznie w JS, z kropką pod dniami, które mają zapisany wpis) — działał, ale miał błędy i był niewart nakładu pracy na wersję webową. <strong>W wersji natywnej to nie jest problem</strong> — iOS ma gotowe komponenty, które robią dokładnie to, czego potrzeba, bez ręcznego liczenia siatki dni:</p>
<ul>
<li><strong>SwiftUI:</strong> <code>DatePicker</code> w stylu <code>.graphical</code> daje pełny kalendarz miesięczny out of the box.</li>
<li><strong>Do zaznaczania dni z wpisem (kropka pod numerem dnia):</strong> <code>UICalendarView</code> (UIKit, dostępny też z poziomu SwiftUI przez <code>UIViewRepresentable</code>) ma wbudowane API dekoracji dni (<code>decorationsFor</code> / <code>UICalendarView.Decoration</code>) — pozwala postawić kropkę/kolor na konkretnych datach bez pisania własnej logiki siatki. To jest dokładnie ten problem, który sprawiał kłopoty w wersji webowej — tu jest rozwiązany natywnie.</li>
</ul>
<p>Zachowanie funkcjonalne do utrzymania (niezależnie od komponentu):</p>
<ul>
<li>Domyślnie wybrana dzisiejsza data.</li>
<li>Kliknięcie/wybór dnia z kropką (ma wpis) → wczytuje ten wpis do formularza do edycji.</li>
<li>Kliknięcie dnia bez wpisu → czyści formularz, gotowy na nowy wpis pod tą datą.</li>
<li>Widoczny wskaźnik nad formularzem: „✏️ Edytujesz istniejący wpis z tego dnia&quot; vs „🆕 Nowy wpis&quot; — użytkowniczka zawsze wie, w co ingeruje.</li>
<li>Szybki przycisk „Dziś&quot; wracający do bieżącej daty bez przewijania kalendarza.</li>
<li>Dozwolone wybieranie dat z przeszłości (uzupełnianie zaległych wpisów) — nie blokować.</li>
</ul>
<h2>6. Historia wpisów</h2>
<p>Lista poprzednich wpisów poniżej formularza, sortowana malejąco (najnowsze na górze). Na każdej karcie wpisu: data, lista rzeczy za które była wdzięczność, oraz zwięzłe podsumowanie pozostałych pól (&quot;Doceniam: X. Duma: Y. Lekcja: Z.&quot;). Przy każdym wpisie dwa przyciski: <strong>edytuj</strong> (ładuje wpis do formularza — patrz sekcja 5) i <strong>usuń</strong> (z potwierdzeniem — natywnie: <code>confirmationDialog</code> albo alert, nie zwykły <code>confirm()</code> z web). Rozważyć limit/paginację lub lazy loading, jeśli lista urośnie do setek wpisów — ale to nie jest priorytet na start.</p>
<h2>7. Licznik serii (streak)</h2>
<p>Nad formularzem, mały odznakowy element: „🔥 X dni z rzędu&quot; (liczba pojedyncza/mnoga poprawnie odmieniona: 1 dzień, 2–4 dni, 5+ dni — polska odmiana). Logika: licz wstecz od dzisiaj (lub od wczoraj, jeśli dzisiaj jeszcze nie ma wpisu — żeby nie zerować serii tylko dlatego, że jeszcze nie napisała dzisiejszego wpisu) tak długo, jak kolejne dni wstecz mają wpis. Jeśli streak = 0: zachęcający komunikat zamiast liczby, np. „🌱 zacznij dziś swoją serię&quot;.</p>
<h2>8. Podsumowanie miesiąca</h2>
<p>Osobna sekcja z wyborem miesiąca (dropdown/picker z miesiącami, w których są jakiekolwiek wpisy + bieżący miesiąc zawsze dostępny). Dla wybranego miesiąca pokazuje:</p>
<ul>
<li>liczbę wpisów w tym miesiącu,</li>
<li>najdłuższą nieprzerwaną serię dni w obrębie tego miesiąca,</li>
<li>do 3 najczęściej wymienianych osób w polu &quot;kogo doceniam&quot; (proste zliczanie identycznych stringów, bez fuzzy matchingu — to celowe uproszczenie),</li>
<li>2–3 losowe cytowane fragmenty z pola &quot;za co jestem wdzięczna&quot; z tego miesiąca, jako &quot;kilka chwil z tego miesiąca&quot; — mały element zaskoczenia/przypomnienia.</li>
</ul>
<h2>9. Motyw graficzny</h2>
<h3>9.1 System motywów sezonowych</h3>
<p>Zamiast prostego jasny/ciemny, aplikacja ma <strong>8 motywów: 4 pory roku × jasny/ciemny</strong>, wybierane z dropdowna w prawym górnym rogu ekranu (nie osobny przełącznik). Wybór jest zapamiętywany między sesjami. Każdy motyw to komplet zmiennych kolorystycznych (odpowiednik design tokenów): <code>bg</code>, <code>card</code>, <code>ink</code> (tekst), <code>muted</code> (tekst przygaszony), <code>accent</code>, <code>accent2</code> (ciemniejszy wariant akcentu), <code>gold</code> (kolor akcentu pomocniczego/ozdobnego), <code>accent-soft</code> (tło wyróżnień typu cytat/odznaka), <code>border</code>, oraz <strong><code>glow1</code>/<code>glow2</code></strong> — osobne kolory do delikatnej poświaty w tle (patrz 9.3), <strong>celowo odseparowane od <code>accent</code>/<code>gold</code></strong>, żeby dobór koloru przycisków nie determinował automatycznie klimatu całego tła (to był błąd w pierwszej wersji: zima i lato w ciemnym wariancie wychodziły &quot;za bardzo jesienne&quot;, bo tło pożyczało kolor z tych samych zmiennych co przyciski).</p>
<p>Typografia: szeryfowa (Georgia/podobna) w każdym motywie — to celowy, stały wybór dla &quot;dziennikowego&quot; charakteru niezależnie od pory roku; w natywnej appce odpowiednikiem może być font w stylu New York (SF Serif) albo inny miękki serif. Karty zaokrąglone (promień ~14–16px), delikatny cień/obramowanie zamiast ostrych linii — też stałe niezależnie od motywu.</p>
<p><strong>Ważne przy projektowaniu kolejnych/alternatywnych palet:</strong> unikać oczywistych, kiczowatych skojarzeń sezonowych (np. pastelowo-wielkanocna żółć na wiosnę) — użytkowniczka wyraźnie i świadomie tego nie chce. Lepiej sprawdzają się bardziej &quot;dorosłe&quot;/nastrojowe interpretacje pory roku (np. wiosna jako wilgotny las i szałwia zamiast kwiatuszków, lato-ciemne jako melancholijny zachód słońca z roadtripu zamiast plażowej neonowej palety).</p>
<h3>9.2 Palety — pełne wartości (design tokens)</h3>
<p><strong>🍂 Jesień jasny</strong>
<code>bg:#fbf0e2 · card:#fffaf3 · ink:#3d2418 · muted:#8f6a54 · accent:#c1592a · accent2:#8a3324 · gold:#c8912b · accent-soft:#f6dcb8 · border:#ecd5b3 · glow1:#c8912b · glow2:#c1592a</code></p>
<p><strong>🍂 Jesień ciemny</strong>
<code>bg:#241611 · card:#2f1e16 · ink:#f3e3d3 · muted:#c39d81 · accent:#e2793f · accent2:#f0a15c · gold:#e0ab52 · accent-soft:#43291b · border:#4a3121 · glow1:#e0ab52 · glow2:#e2793f</code>
Skojarzenia: cynamon, brąz, pomarańcz — klasyczna jesień.</p>
<p><strong>❄️ Zima jasny</strong>
<code>bg:#eef3f6 · card:#ffffff · ink:#1f3b34 · muted:#7893a0 · accent:#2f6e52 · accent2:#1f4d38 · gold:#e3b23c · accent-soft:#dcebf0 · border:#cfe0e6 · glow1:#bcd6e0 · glow2:#2f6e52</code>
Skojarzenia: świeżo spadnięty śnieg w niebieskawym off-white, szron, zieleń sosny kaukaskiej, ciepłe światełka jako mały akcent (nie dominują).</p>
<p><strong>❄️ Zima ciemny</strong>
<code>bg:#0d1420 · card:#151f2f · ink:#e4edf2 · muted:#7f92a3 · accent:#5f9bc7 · accent2:#3d6d92 · gold:#e0a95a · accent-soft:#1c2c40 · border:#233246 · glow1:#3a5f82 · glow2:#1f4d38</code>
Skojarzenia: mroźna noc, ten specyficznie jasny odcień nieba, gdy leży śnieg; blask świecy i lampek choinkowych <strong>jako wąski, ciepły akcent na chłodnym, granatowym tle</strong> — świadomie NIE dominujący, żeby nie wyglądało jak jesień.</p>
<p><strong>🌿 Wiosna jasny</strong>
<code>bg:#f4f2ea · card:#fbfaf5 · ink:#33402e · muted:#7c8a6d · accent:#7c9473 · accent2:#4f6b48 · gold:#c17b62 · accent-soft:#e3e8d6 · border:#dce0d0 · glow1:#c17b62 · glow2:#7c9473</code>
Skojarzenia: świadomie NIE pastelowo-wielkanocna. Szałwiowa zieleń, wilgotna ziemia/las po deszczu, przygaszona terakota/rdzawy róż zamiast różu czy żółci — &quot;comfy botanika&quot; zamiast kiczu. To motyw, który spodobał się najbardziej ze wszystkich nowo dodanych.</p>
<p><strong>🌿 Wiosna ciemny</strong>
<code>bg:#1a2117 · card:#212b1c · ink:#e6e9dd · muted:#93a184 · accent:#8fae7f · accent2:#5f7d54 · gold:#c98a6d · accent-soft:#2c3524 · border:#3a4530 · glow1:#c98a6d · glow2:#8fae7f</code>
Ten sam klimat co wyżej, przeniesiony na mokry las o zmierzchu.</p>
<p><strong>🌊 Lato jasny</strong>
<code>bg:#fbf6ec · card:#ffffff · ink:#163a4a · muted:#5f7f8a · accent:#2f8fd1 · accent2:#145a86 · gold:#e3a856 · accent-soft:#d7eefb · border:#cfe6f2 · glow1:#e3a856 · glow2:#2f8fd1</code>
Skojarzenia: deep sky blue przechodzący w lazur, sosny nad morzem, piasek, lody, wakacje.</p>
<p><strong>🌊 Lato ciemny</strong>
<code>bg:#171833 · card:#20213f · ink:#f3e3cf · muted:#a29fc2 · accent:#c9506b · accent2:#8a5aa8 · gold:#e8934a · accent-soft:#2d2a4d · border:#332f57 · glow1:#3d3a6b · glow2:#c9502a</code>
Skojarzenia: &quot;Hotel California&quot; — koniec roadtripu, granatowo-fioletowy zmierzch, ptaki, pomarańcz zachodzącego słońca <strong>jako wąski pas przy horyzoncie, nie dominujący kolor</strong>. To ulubiony motyw użytkowniczki spośród wszystkich ośmiu — warto zachować ten balans &quot;chłodny fiolet/granat + ciepły akcent na krawędzi&quot;, a nie rozjaśniać go pomarańczem.</p>
<h3>9.3 Ambient glow (poświata w tle)</h3>
<p>Delikatna, rozmyta poświata w dwóch rogach ekranu (radialne gradienty o niskiej opacity, ok. 16–18%), budująca nastrój bez przeszkadzania w czytelności. <strong>Kluczowe:</strong> korzysta z osobnych zmiennych <code>glow1</code>/<code>glow2</code>, nie z <code>accent</code>/<code>gold</code> używanych przez przyciski i elementy interaktywne — inaczej dobór koloru UI (np. bursztynowy przycisk w motywie zimowym, bo pasuje do &quot;świecy&quot;) wymusza też bursztynowe tło, co wizualnie kłóci się z charakterem pory roku. W natywnej appce: dwa nakładające się radialne gradienty (np. <code>RadialGradient</code> w SwiftUI) w rogach ekranu, z kolorami z <code>glow1</code>/<code>glow2</code> danego motywu, blend mode zwykły, niska opacity.</p>
<h3>9.4 Emotka przy nazwie aplikacji</h3>
<p>Emoji obok tytułu &quot;Dziennik Wdzięczności&quot; (w nagłówku i w tytule okna/karty) <strong>zmienia się dynamicznie razem z wybraną porą roku</strong>, niezależnie od jasny/ciemny:</p>
<ul>
<li>Jesień: 🍂 (liść)</li>
<li>Zima: ❄️ (płatek śniegu)</li>
<li>Wiosna: 🌿 (gałązka/ziele) — <strong>celowo nie 🌸 (kwiat wiśni)</strong>, bo to zbyt &quot;kiczowate/wielkanocne&quot; skojarzenie, którego użytkowniczka nie chce; 🌿 pasuje do botanicznego, stonowanego charakteru palety wiosennej.</li>
<li>Lato: 🌊 (fala) — celowo nie zwykłe ☀️, bo lepiej oddaje &quot;sosny nad morzem&quot; niż generyczne słońce.</li>
</ul>
<h3>9.5 Girlanda świątecznych światełek (motywy zimowe) — WAŻNY DETAL</h3>
<p>To pojedynczy najbardziej lubiany szczegół graficzny w całym prototypie — użytkowniczka określiła go jako wzruszający. <strong>Koniecznie przenieść do wersji natywnej i potraktować priorytetowo</strong>, mimo że to &quot;tylko dekoracja&quot;.</p>
<p><strong>Co to jest:</strong> cienki, lekko falujący sznurek z kolorowymi &quot;żarówkami&quot; (małe kropki w 5 kolorach: czerwony <code>#e2483f</code>, zielony <code>#3fae6a</code>, złoty <code>#e8c15a</code>, niebieski <code>#5f9bc7</code>, różowy <code>#e28fc0</code>), z subtelną animacją migotania (każda żarówka pulsuje opacity 1 → 0.45 → 1 w pętli ~2.6s, z przesuniętym opóźnieniem między żarówkami, żeby migotały niesynchronicznie/organicznie, a nie wszystkie naraz).</p>
<p><strong>Gdzie się pojawia:</strong> widoczna <strong>tylko w obu motywach zimowych</strong> (jasny i ciemny), ukryta w pozostałych porach roku. Umieszczona jako cienki poziomy pasek <strong>nad każdą sekcją/kartą ekranu</strong> (nad nagłówkiem, nad cytatem dnia, nad formularzem wpisu, nad podsumowaniem miesiąca, nad historią wpisów, nad sekcją backupu) — czyli powtarza się kilkukrotnie na ekranie, nie tylko raz na górze. To był świadomy, dodatkowy request użytkowniczki po zobaczeniu pierwszej wersji z jedną girlandą na górze — &quot;żeby już na całość pójść&quot;.</p>
<p><strong>Implementacja w prototypie webowym (do przeniesienia na natywne API rysowania, np. SwiftUI <code>Path</code>/<code>Canvas</code> lub <code>Shape</code>):</strong></p>
<ul>
<li>Krzywa sznurka generowana programistycznie jako seria punktów na fali sinusoidalnej (nie ręcznie rysowany kształt) — dla każdej z N żarówek (14 w prototypie) pozycja x równomiernie rozłożona na szerokości, pozycja y = środek + amplituda × sin(indeks × faza), co daje naturalny, &quot;zwisający&quot; efekt sznurka bez potrzeby fizycznej symulacji.</li>
<li>Każda instancja girlandy ma inny &quot;seed&quot; (przesunięcie fazowe i przesunięcie startowego koloru w cyklu), żeby girlandy nad różnymi sekcjami nie wyglądały identycznie/mechanicznie — subtelna wizualna różnorodność.</li>
<li>Linia sznurka: cienka (ok. 1.5pt), kolor = <code>border</code> motywu, niska opacity (~0.6) — ma być tłem dla żarówek, nie konkurować z nimi.</li>
<li>Żarówki: małe kółka (promień ~4.5pt), pełne nasycone kolory z listy wyżej (te kolory są stałe, niezależne od palety motywu — to jedyne miejsce w aplikacji, gdzie kolory nie pochodzą z design tokenów, celowo, żeby wyglądały jak prawdziwe kolorowe lampki).</li>
<li>Animacja migotania: prosta pętla opacity z przesuniętym opóźnieniem per żarówka — w SwiftUI np. <code>.animation(.easeInOut(duration: 2.6).repeatForever().delay(index * 0.18))</code> na każdym elemencie.</li>
</ul>
<p><strong>Do rozważenia na przyszłość (niski priorytet, nie blokuje P0):</strong> analogiczne &quot;podpisowe&quot; detale graficzne dla pozostałych pór roku, w podobnym duchu jednego, emocjonalnie trafionego elementu ozdobnego zamiast wielu drobnych — np. dla lata coś związanego z falami/refleksami słońca na wodzie, dla wiosny coś związanego z kroplami deszczu na liściach. Nie projektować tego z góry — czekać na kierunek/skojarzenia użytkowniczki, tak jak przy kolorach.</p>
<p><strong>Ikona aplikacji:</strong> motyw pumpkin spice latte — kubek do wynoszenia w odcieniach pomarańczu/cynamonu z listkiem na piance, na jasnym tle (na razie stała, niezależna od wybranego motywu sezonowego). (Niski priorytet: docelowo lista kilku ikon jesiennych/sezonowych do wyboru przez użytkowniczkę w ustawieniach — iOS wspiera alternatywne ikony aplikacji przez <code>CFBundleAlternateIcons</code>, ale wymaga to spakowania z góry wszystkich wariantów w binarce; nie da się dodawać własnych ikon w locie ani generować ich dynamicznie.)</p>
<h2>10. Kopia zapasowa (eksport/import)</h2>
<p>Priorytet: <strong>musi działać, forma dowolna.</strong> W prototypie webowym: przycisk „Eksportuj&quot; generuje plik <code>.json</code> z całym obiektem wpisów do pobrania; „Importuj&quot; wczytuje plik i <strong>scala</strong> (merge, nie nadpisuje) z obecnymi danymi po kluczu daty.</p>
<p>W wersji na iPhone naturalnym odpowiednikiem jest natywny <strong>Share Sheet</strong> (<code>UIActivityViewController</code> / SwiftUI <code>ShareLink</code>):</p>
<ul>
<li>Eksport: generujesz plik JSON w tymczasowym katalogu, otwierasz Share Sheet — użytkowniczka może go wysłać mailem do siebie, zapisać w Plikach/iCloud Drive, AirDrop na inne urządzenie itd. Nie trzeba budować własnego mechanizmu wysyłki maila.</li>
<li>Import: <code>UIDocumentPickerViewController</code> (albo integracja z Plikami) do wybrania pliku <code>.json</code>, ten sam merge co w wersji webowej.</li>
</ul>
<p>Nazwa pliku przy eksporcie: <code>kopia-dziennika-wdziecznosci-{data}.json</code>. To jedyny sposób person-to-person/urządzenie-do-urządzenia przenoszenia danych, więc format pliku musi pozostać czytelny/stabilny (nie zmieniać struktury JSON bez zachowania kompatybilności wstecznej przy imporcie).</p>
<h2>11. Priorytety wdrożenia</h2>
<p><strong>Musi działać (P0):</strong></p>
<ul>
<li>Formularz wpisu + zapis lokalny, trwały między sesjami</li>
<li>Wybór daty (edycja dowolnego dnia, nie tylko dzisiaj)</li>
<li>Historia z edycją i usuwaniem</li>
<li>Cytat dnia</li>
<li>Eksport/import jako podstawowy, działający backup</li>
</ul>
<p><strong>Warto mieć (P1):</strong></p>
<ul>
<li>Streak i podsumowanie miesiąca</li>
<li>Pełny system 8 motywów sezonowych (sekcja 9.1–9.4) — <strong>wyżej niż standardowo dałoby się to sklasyfikować</strong>, bo warstwa wizualna jest dla użytkowniczki kluczowa (patrz sekcja 1)</li>
<li>Girlanda światełek w motywach zimowych (sekcja 9.5) — mimo że to &quot;dekoracja&quot;, potraktować priorytetowo, to najbardziej doceniony detal prototypu</li>
<li>Dopracowana animacja/UX przejść</li>
</ul>
<p><strong>Niski priorytet (P2):</strong></p>
<ul>
<li>Wybór ikony aplikacji z gotowej listy (ograniczenie systemowe opisane w sekcji 9)</li>
<li>Analogiczne sygnaturowe detale graficzne dla lata/wiosny (patrz 9.5) — czekać na kierunek użytkowniczki</li>
</ul>
<h2>12. Poza zakresem (świadomie pominięte)</h2>
<p>Brak kont użytkownika, logowania, synchronizacji między urządzeniami przez chmurę/backend, powiadomień push, udostępniania wpisów innym osobom, analityki/trackingu. Jeśli w przyszłości pojawi się potrzeba synchronizacji między urządzeniami — naturalnym kierunkiem byłby iCloud (np. <code>NSUbiquitousKeyValueStore</code> albo CloudKit), ale to świadomie odłożone na później, nie blokuje pierwszej wersji.</p>
<hr>
<p><em>Dokument opisuje stan funkcjonalny prototypu webowego w chwili pisania. Traktować jako specyfikację funkcjonalną i wizualną — wybór konkretnych technologii (SwiftUI vs UIKit, Core Data vs plik JSON) pozostawiony do decyzji zespołu/agenta implementującego, o ile zachowane zostaną zachowania opisane powyżej.</em></p>

</body></html>