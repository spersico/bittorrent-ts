import { decodeAndLog } from './commands/decode';
import { downloadPiece } from './commands/download_piece';
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
    case args[2] === 'handshake': {
      if (!args[4]) return torrentHandshake(args[3], {});

      let [ip, port] = args[4].split(':');
      return torrentHandshake(args[3], { ip, port: parseInt(port) });
    }
    case args[2] === 'download_piece': {
      if (!args[3] || !args[4]) {
        console.log(
          'Please provide a filename, offset and (optionally) a length'
        );
        return;
      }
      const [outputFileName, torrentFileName, pieceIndex] = args
        .filter((arg) => arg !== '-o')
        .slice(-3);

      return await downloadPiece(
        outputFileName,
        torrentFileName,
        pieceIndex ? parseInt(pieceIndex) : 0
      );
    }

    default:
      console.error('Invalid command - Valid commands are "decode" and "info"');
      return 1;
  }
}

executeCommand(process.argv);
