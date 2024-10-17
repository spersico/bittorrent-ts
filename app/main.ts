import { decodeAndLog } from './commands/decode';
import { torrentInfo } from './commands/info';

async function executeCommand(args: string[]) {
  switch (true) {
    case args[2] === 'decode':
      decodeAndLog(args[3]);
      break;
    case args[2] === 'info':
      torrentInfo(args[3]);
      break;
    default:
      console.error('Invalid command - Valid commands are "decode" and "info"');
      break;
  }
}

executeCommand(process.argv);
