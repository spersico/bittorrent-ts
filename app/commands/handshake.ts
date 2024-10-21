import { PEER_ID } from '../env';
import { torrentInfo } from './info';
import net from 'net';

export async function torrentHandshake(
  filename: string,
  peerIpAndPort: string
) {
  return new Promise(async (resolve, reject) => {
    let peerId: string;

    let [peerIp, peerPort] = peerIpAndPort.split(':');
    const info = await torrentInfo(filename, { silent: true });
    const messageHanshake = new Uint8Array(
      Buffer.from([
        19,
        ...'BitTorrent protocol'.split('').map((char) => char.charCodeAt(0)),
        ...new Array(8).fill(0),
        ...info.infoHash.buffer,
        ...PEER_ID,
      ])
    );

    const socket = net.createConnection(
      { port: parseInt(peerPort), host: peerIp },
      () => {
        // console.warn('🐛 | -> Connected to server. Sending Handshake...', {
        //   port: parseInt(peerPort),
        //   host: peerIp,
        // });

        socket.write(
          messageHanshake
          //, () =>console.warn('🐛 | -> Server Handshaked')
        );
      }
    );

    socket.on('error', (error) => {
      console.error('🐛 | -> Error:', error);
    });

    socket.on('timeout', () => {
      console.error('🐛 | -> Timeout');
      return reject(peerId);
    });

    socket.on('close', () => {
      // console.warn('🐛 | -> Close');
      return reject(peerId);
    });

    socket.on('end', () => {
      // console.warn('🐛 | -> End');
      return reject(peerId);
    });

    socket.on('data', (data) => {
      try {
        const rawPeerId = new Uint8Array(data).subarray(
          data.byteLength - 20,
          data.byteLength
        );
        peerId = Buffer.from(rawPeerId).toString('hex');
        console.log(`Peer ID: ${peerId}`);
        socket.end();
        return resolve(peerId);
      } catch (error) {
        return reject(error);
      }
    });
  });
}
