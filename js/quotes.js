// Neutralne, oryginalne sentencje — celowo bez przypisania do realnych autorów.
export const QUOTES = [
  'Wdzięczność to pamięć serca.',
  'Zauważanie małych rzeczy zmienia sposób, w jaki widzimy cały dzień.',
  'Nie jesteśmy szczęśliwi, bo mamy dużo — jesteśmy szczęśliwi, gdy potrafimy docenić to, co mamy.',
  'Każdy dzień kryje coś, za co warto podziękować, nawet jeśli trzeba tego poszukać.',
  'Wdzięczność zamienia to, co mamy, w coś wystarczającego.',
  'Spokój zaczyna się od zauważenia dobra, które już jest obecne.',
  'Najprostsze chwile bywają najcenniejsze, jeśli poświęcimy im uwagę.',
  'Uważność na dobro nie wymaga wielkich zmian — wystarczy chwila refleksji.',
  'Dziękowanie za drobiazgi otwiera oczy na to, co ważne.',
  'Trudny dzień też może zostawić po sobie coś wartościowego.',
  'Docenianie innych jest jednym z najprostszych sposobów, by poczuć się bliżej ludzi.',
  'Wdzięczność nie usuwa trudności, ale zmienia sposób, w jaki na nie patrzymy.',
  'Czasem wystarczy zatrzymać się na chwilę, by dostrzec, ile już mamy.',
  'Radość rośnie, gdy dzielimy się wdzięcznością z innymi.',
  'To, na czym skupiamy uwagę, staje się większe w naszym życiu — warto wybierać dobro.',
  'Jesień uczy, że odpuszczanie też może być formą wdzięczności.',
  'Nawet liść, zanim opadnie, zdąży zabłysnąć kolorem — warto zauważać takie chwile.',
  'Ciepła herbata, koc i chwila spokoju też zasługują na podziękowanie.',
];

export function pickQuote(random = Math.random) {
  return QUOTES[Math.floor(random() * QUOTES.length)];
}
