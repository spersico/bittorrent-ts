// const Matcher = {
//   text: (text: string) => {
//     const regex = /(^(?<string_length>\d+):(?<string_text>.+))/;
//     const matches = text.match(regex);
//     if (!matches?.groups) return { value: null, lastIndexUsed: 0 };
//     const { string_length, string_text } = matches.groups;
//     const actualStringLength = parseInt(string_length);
//     return {
//       value: string_text.substring(0, actualStringLength),
//       lastIndexUsed: string_length.length + 1 + actualStringLength,
//     };
//   },
//   integer: (text: string) => {
//     const regex = /(^i(?<integer_content>-?\d+)e)/;
//     const matches = text.match(regex);
//     if (!matches?.groups?.integer_content)
//       return { value: null, lastIndexUsed: 0 };
//     return {
//       value: parseInt(matches.groups.integer_content),
//       lastIndexUsed: matches?.groups?.integer_content.length + 2,
//     };
//   },
//   list: (text: string) => {
//     const regex = /(^l(?<array_content>.*e))/;
//     const matches = text.match(regex);
//     if (!matches?.groups?.array_content)
//       return { value: null, lastIndexUsed: 0 };
//     const { array_content } = matches.groups;
//     const decodedList = [];
//     let lastIndexUsed = 0;
//     while (lastIndexUsed < array_content.length) {
//       const decodedValue = decodeBencode(
//         array_content.substring(lastIndexUsed, array_content.length - 1)
//       );
//       const itWasArrayElement =
//         array_content[decodedValue.lastIndexUsed] === 'e' &&
//         array_content[decodedValue.lastIndexUsed + 1] === 'e';

//       lastIndexUsed += itWasArrayElement
//         ? decodedValue.lastIndexUsed + 1
//         : decodedValue.lastIndexUsed;

//       decodedList.push(
//         itWasArrayElement ? [decodedValue.value] : decodedValue.value
//       );
//     }
//   },
// };

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
    /(?:^(?<string_length>\d+):(?<string_text>.+))|(?:^i(?<integer_content>-?\d+)e)|(?:^l(?<array_content>.*)e)|(?:^d(?<dictionary_content>.*)e)/;

  const matches = bencodedValue.match(analyzer);
  //   console.log('decodeBencode =>', bencodedValue, '=> ', matches?.groups);

  if (!matches || !matches.groups) throw new Error('Invalid encoded value');

  const {
    string_length,
    string_text,
    integer_content,
    array_content,
    dictionary_content,
  } = matches?.groups;

  if (typeof integer_content === 'string') {
    return {
      value: parseInt(integer_content),
      lastIndexUsed: integer_content.length + 2,
    };
  } else if (typeof string_length === 'string') {
    const actualStringLength = parseInt(string_length);
    return {
      value: string_text.substring(0, actualStringLength),
      lastIndexUsed: string_length.length + 1 + actualStringLength,
    };
  } else if (typeof array_content === 'string') {
    const decodedList = [];
    let lastIndexUsed = 0;
    // console.log(`🐛 | decodeBencode | ARRAY:`, array_content);

    while (lastIndexUsed < array_content.length) {
      const decodedValue = decodeBencode(
        array_content.substring(lastIndexUsed)
      );
      lastIndexUsed += decodedValue.lastIndexUsed;

      const itWasArrayElement =
        array_content[lastIndexUsed] === 'e' &&
        array_content[lastIndexUsed - 1] === 'e';

      if (itWasArrayElement) {
        lastIndexUsed += 1;
        return {
          value: [decodedValue.value],
          lastIndexUsed: lastIndexUsed + 1,
        };
      } else {
        decodedList.push(decodedValue.value);
      }
    }
    return { value: decodedList, lastIndexUsed: lastIndexUsed + 2 };
  } else if (typeof dictionary_content === 'string') {
    const decodedList = [];
    let lastIndexUsed = 0;
    // console.log(`🐛 | decodeBencode | ARRAY:`, array_content);

    while (lastIndexUsed < dictionary_content.length) {
      const decodedValue = decodeBencode(
        dictionary_content.substring(lastIndexUsed)
      );
      lastIndexUsed += decodedValue.lastIndexUsed;

      const itWasAcomplexElement =
        dictionary_content[lastIndexUsed] === 'e' &&
        dictionary_content[lastIndexUsed - 1] === 'e';

      if (itWasAcomplexElement && decodedList.length > 0) {
        lastIndexUsed += 1;
        decodedList.push(decodedValue.value);

        return {
          value: sortAndBuildDictionary(decodedList),
          lastIndexUsed: lastIndexUsed + 1,
        };
      } else {
        decodedList.push(decodedValue.value);
      }
    }
    return {
      value: sortAndBuildDictionary(decodedList),
      lastIndexUsed: lastIndexUsed + 2,
    };
  } else {
    throw new Error('Invalid encoded value');
  }
}

function sortAndBuildDictionary(dictionary: any[]): any {
  const unsortedResults = {} as Record<string, any>;
  for (let i = 0; i < dictionary.length; i += 2) {
    unsortedResults[dictionary[i]] = dictionary[i + 1];
  }

  const sortedDictionary = Object.entries(unsortedResults)
    .sort((a, b) => a[0].localeCompare(b[0]))
    .reduce((acc, keyValuePair) => {
      console.log(`🐛 | .reduce | keyValuePair:`, keyValuePair);
      acc[keyValuePair[0]] = keyValuePair[1];
      return acc;
    }, {} as Record<string, any>);

  return sortedDictionary;
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
