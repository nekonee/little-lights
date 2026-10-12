/**
 * Głęboko zamraża obiekt. W modułach ES zapis do zamrożonego obiektu rzuca błąd,
 * więc funkcja, która zmienia swoje argumenty, oblewa test od razu, a nie po cichu.
 */
export function deepFreeze(value) {
  if (typeof value === 'object' && value !== null) {
    Object.values(value).forEach(deepFreeze);
    Object.freeze(value);
  }
  return value;
}
