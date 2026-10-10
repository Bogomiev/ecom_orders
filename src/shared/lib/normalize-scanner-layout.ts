const RUSSIAN_KEYBOARD_CHARS =
  "ёйцукенгшщзхъфывапролджэячсмитьбюЁЙЦУКЕНГШЩЗХЪФЫВАПРОЛДЖЭЯЧСМИТЬБЮ";
const ENGLISH_KEYBOARD_CHARS =
  "`qwertyuiop[]asdfghjkl;'zxcvbnm,.~QWERTYUIOP{}ASDFGHJKL:\"ZXCVBNM<>";

const englishCharByRussianChar = new Map(
  Array.from(RUSSIAN_KEYBOARD_CHARS, (char, index) => [
    char,
    ENGLISH_KEYBOARD_CHARS[index]
  ])
);

// Исправляем только русские буквы; спецсимволы и разделители сканера сохраняем.
export function normalizeScannerLayout(value: string) {
  return Array.from(value, (char) => englishCharByRussianChar.get(char) ?? char).join("");
}
