import { PEER_ID } from '../env';
import { torrentInfo } from './info';
import net from 'net';
import { torrentPeers } from './peers';

export async function handshake({
  id,
  infoHashBuffer,
  port,
  host,
  debug,
}: {
  id: string;
  infoHashBuffer: Buffer;
  port: number;
  host: string;
  debug: boolean;
}): Promise<{ peerId: string; socket: net.Socket }> {
  const { resolve, reject, promise } = Promise.withResolvers();

  const messageHanshake = new Uint8Array(
    Buffer.from([
      19,
      ...'BitTorrent protocol'.split('').map((char) => char.charCodeAt(0)),
      ...new Array(8).fill(0),
      ...infoHashBuffer,
      ...id,
    ])
  );

  let peerId: string;
  const socket = net.createConnection({ port, host }, () => {
    if (debug)
      console.warn('🐛 | -> Connected to server. Sending Handshake...', {
        port,
        host,
      });

    socket.write(messageHanshake);
  });

  socket.on('error', (error) => {
    console.error('🐛 | -> Error:', error);
  });

  socket.on('timeout', () => {
    console.error('🐛 | -> Timeout');
    reject(peerId);
  });

  socket.on('close', () => {
    // console.warn('🐛 | -> Close');
    reject(peerId);
  });

  socket.on('end', () => {
    // console.warn('🐛 | -> End');
    reject(peerId);
  });

  socket.on('data', (data) => {
    try {
      const rawPeerId = new Uint8Array(data).subarray(
        data.byteLength - 20,
        data.byteLength
      );
      peerId = Buffer.from(rawPeerId).toString('hex');
      if (!debug) console.log(`Peer ID: ${peerId}`);
      resolve({ peerId, socket });
    } catch (error) {
      reject(error);
    }
  });

  return promise;
}

export async function torrentHandshake(
  filename: string,
  parameters: {
    ip?: string;
    port?: number;
    silent?: boolean;
    peerIndex?: number;
    keepAlive?: boolean;
  } = {
    ip: undefined,
    port: undefined,
    peerIndex: 0,
    silent: false,
    keepAlive: false,
  }
) {
  return new Promise(async (resolve) => {
    let info: Awaited<ReturnType<typeof torrentInfo>>;
    if (
      (!parameters.ip || !parameters.port) &&
      Number.isInteger(parameters.peerIndex)
    ) {
      const torrentData = await torrentPeers(filename, { silent: true });
      info = torrentData.info;
      parameters.ip = torrentData.metrics.peers[parameters.peerIndex || 0].ip;
      parameters.port = torrentData.metrics.peers[0].port;
    } else {
      info = await torrentInfo(filename, { silent: true });
    }

    const wire = await handshake({
      id: PEER_ID,
      infoHashBuffer: info.infoHash.buffer,
      port: Number(parameters.port),
      host: String(parameters.ip),
      debug: !!parameters.silent,
    });

    if (parameters.keepAlive) return resolve(wire);
    wire.socket.end();
    return resolve(wire);
  });
}
