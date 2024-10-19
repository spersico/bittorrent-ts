import { decodeAndLog } from './commands/decode';
import { torrentInfo } from './commands/info';
import { torrentPeers } from './commands/peers';

async function executeCommand(args: string[]) {
  if (!args[2]) {
    console.log('Please provide a command');
    console.log('Valid commands are "decode", "info" and "peers"');
    return;
  }
  switch (true) {
    case args[2] === 'decode':
      decodeAndLog(args[3]);
      break;
    case args[2] === 'info':
      torrentInfo(args[3]);
      break;
    case args[2] === 'peers':
      torrentPeers(args[3]);
      break;
    default:
      console.error('Invalid command - Valid commands are "decode" and "info"');
      break;
  }
}

executeCommand(process.argv);
