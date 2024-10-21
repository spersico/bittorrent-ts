import { decodeAndLog } from './commands/decode';
import { torrentHandshake } from './commands/handshake';
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
      return decodeAndLog(args[3]);
    case args[2] === 'info':
      return torrentInfo(args[3]);
    case args[2] === 'peers':
      return torrentPeers(args[3]);
    case args[2] === 'handshake':
      return torrentHandshake(args[3], args[4]);
    default:
      console.error('Invalid command - Valid commands are "decode" and "info"');
      return 1;
  }
}

executeCommand(process.argv);
