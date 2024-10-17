export type BencodePrimitive = number | string;
export type BencodeList = Array<BencodePrimitive | BencodeList | BencodeDict>;
export interface BencodeDict {
  [key: BencodePrimitive]: BencodePrimitive | BencodeList | BencodeDict;
}

export type BencodeValue = BencodePrimitive | BencodeList | BencodeDict;

export type BencodeResult<T = BencodeValue> = {
  value: T;
  lastIndexUsed: number;
};

// Examples:
// - decodeBencode("10:hello12345") -> "hello12345"
// - decodeBencode("i123e") -> 123
// - decodeBencode("l5:helloi52ee") -> -[“hello”,52]
// - decodeBencode("d10:inner_dictd4:key16:value14:key2i42e8:list_keyl5:item15:item2i3eeee") -> -{"inner_dict":{"key1":"value1","key2":42,"list_key":["item1","item2",3]}}
export function decodeBencode(
  bencodedValue: string
): BencodeResult<BencodeValue> {
  const analyzer =
    /(?:^(?<string_length>\d+):(?<string_text>.+))|(?:^i(?<integer_content>-?\d+)e)|(?:^l(?<array_content>.*)e)|(?:^d(?<dictionary_content>.*)e)/;

  const matches = bencodedValue.match(analyzer);

  if (!matches || !matches.groups)
    throw new Error('Invalid encoded value - No Matches:' + bencodedValue);

  const {
    string_length,
    string_text,
    integer_content,
    array_content,
    dictionary_content,
  } = matches?.groups;

  if (typeof integer_content === 'string') {
    return ParserStrategies.Integer.decoder(integer_content);
  } else if (typeof string_length === 'string') {
    return ParserStrategies.String.decoder(string_length, string_text);
  } else if (typeof array_content === 'string') {
    return ParserStrategies.List.decoder(array_content);
  } else if (typeof dictionary_content === 'string') {
    return ParserStrategies.Dictionary.decoder(dictionary_content);
  } else {
    throw new Error('Invalid encoded value - Invalid Type: ' + bencodedValue);
  }
}

const ParserStrategies = {
  Integer: {
    decoder(integer_content: string): BencodeResult<number> {
      return {
        value: parseInt(integer_content),
        lastIndexUsed: integer_content.length + 2,
      };
    },
  },
  String: {
    decoder(string_length: string, string_text: string): BencodeResult<string> {
      const actualStringLength = parseInt(string_length);
      return {
        value: string_text.substring(0, actualStringLength),
        lastIndexUsed: string_length.length + 1 + actualStringLength,
      };
    },
  },
  List: {
    decoder(array_content: string): BencodeResult<BencodeList> {
      const decodedList: BencodeList = [];
      let lastIndexUsed = 0;

      while (lastIndexUsed < array_content.length) {
        const decodedValue = decodeBencode(
          array_content.substring(lastIndexUsed)
        );
        lastIndexUsed += decodedValue.lastIndexUsed;

        const itWasComplexElement =
          array_content[lastIndexUsed] === 'e' &&
          array_content[lastIndexUsed - 1] === 'e';

        if (itWasComplexElement) {
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
    },
  },
  Dictionary: {
    decoder(dictionary_content: string): BencodeResult<BencodeDict> {
      function sortAndBuildDictionary(dictionary: any[]): BencodeDict {
        const unsortedResults = {} as Record<string, any>;
        for (let i = 0; i < dictionary.length; i += 2) {
          unsortedResults[dictionary[i]] = dictionary[i + 1];
        }

        return unsortedResults;
      }

      const decodedList = [];
      let lastIndexUsed = 0;

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
    },
  },
};

export function decodeAndLog(bencodedValue: string) {
  try {
    const decoded = decodeBencode(bencodedValue);
    console.log(JSON.stringify(decoded.value));
  } catch (error: unknown) {
    if (error instanceof Error) console.error(error?.message);
  }
}
