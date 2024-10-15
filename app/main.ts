// Examples:
// - decodeBencode("5:hello") -> "hello"
// - decodeBencode("10:hello12345") -> "hello12345"
// - decodeBencode("i123e") -> 123
// - decodeBencode("l5:helloi52ee") -> -[“hello”,52]
function decodeBencode(bencodedValue: string): {
  value: number | string | any[];
  lastIndexUsed: number;
} {
  const analyzer =
    /(^(?<string_length>\d+):(?<string_text>.+))|(^i(?<integer_content>-?\d+)e$)|(^l(?<array_content>.*)e$)/;

  const matches = bencodedValue.match(analyzer);

  if (!matches || !matches.groups) throw new Error('Invalid encoded value');

  const { string_length, string_text, integer_content, array_content } =
    matches?.groups;

  if (typeof array_content === 'string') {
    const decodedList = [];
    let lastIndexUsed = 0;
    while (lastIndexUsed < array_content.length) {
      const decodedValue = decodeBencode(
        array_content.substring(lastIndexUsed)
      );
      decodedList.push(decodedValue.value);
      lastIndexUsed += decodedValue.lastIndexUsed;
    }
    return { value: decodedList, lastIndexUsed };
  } else if (typeof integer_content === 'string') {
    return {
      value: parseInt(integer_content),
      lastIndexUsed: integer_content.length + 2,
    };
  } else {
    const actualStringLength = parseInt(string_length);
    return {
      value: string_text.substring(0, actualStringLength),
      lastIndexUsed: string_length.length + 1 + actualStringLength,
    };
  }
}

const args = process.argv;
const bencodedValue = args[3];

if (args[2] === 'decode') {
  try {
    const decoded = decodeBencode(bencodedValue);
    console.log(JSON.stringify(decoded.value));
  } catch (error) {
    console.error(error.message);
  }
}
