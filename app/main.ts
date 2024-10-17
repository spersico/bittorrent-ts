import { decodeBencode, type BencodeDict } from './commands/decode';
import { promises as fs } from 'node:fs';

async function readFileContent(filename: string): Promise<string> {
  try {
    // Read the file content as a string
    return await fs.readFile(filename, 'utf-8');
  } catch (error) {
    console.error(`Error reading the file: ${error.message}`);
    throw error;
  }
}

async function executeCommand(args: string[]) {
  switch (true) {
    case args[2] === 'decode':
      {
        try {
          const bencodedValue = args[3];
          const decoded = decodeBencode(bencodedValue);
          console.log(JSON.stringify(decoded.value));
        } catch (error: { message: string }) {
          console.error(error?.message);
        }
      }
      break;
    case args[2] === 'info':
      {
        try {
          const fileName = args[3];
          const fileContents = await readFileContent(fileName);
          const decoded = decodeBencode(fileContents);
          if (!decoded?.value?.info || !decoded?.value?.announce)
            throw new Error('Invalid torrent file');
          const result = {
            'Tracker URL': decoded.value['announce'],
            Length: (decoded.value.info as BencodeDict).length,
          };
          console.log(JSON.stringify(result));
        } catch (error: unknown) {
          if (error instanceof Error) console.error(error?.message);
          throw error;
        }
      }
      break;
    default:
      console.error('Invalid command - Valid commands are "decode" and "info"');
      break;
  }
}

executeCommand(process.argv);
