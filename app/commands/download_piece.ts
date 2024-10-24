import Protocol from 'bittorrent-protocol';
import net from 'net';
import fs from 'fs/promises';
import { torrentPeers } from './peers';
import Bitfield from 'bitfield';
import { PEER_ID } from '../env';

interface Wire extends Protocol.Wire {
  request<T extends any>(
    index: number,
    offset: number,
    length: number,
    cb?: (err: Error, block: Buffer) => unknown
  ): T | void;
  peerPieces: Bitfield;
}

const getOffsetInBytesBasedOnIndex = (blockNumber = 0) =>
  blockNumber * (2 ^ 14);

async function tryToDownloadStuff(
  wire: Wire,
  offset: number,
  index: number
): Promise<Buffer> {
  // console.log(`🐛 | REQUEST:`, {
  //   offset,
  //   index,
  //   offsetInBytes: getOffsetInBytesBasedOnIndex(index),
  // });

  if (!wire.peerPieces.get(offset))
    throw new Error('peer does not have the piece');
  if (wire.peerChoking) throw new Error('peer is choking us');

  return new Promise((resolve) =>
    wire.request(
      offset,
      getOffsetInBytesBasedOnIndex(index),
      getOffsetInBytesBasedOnIndex(1),
      async (err, block) => {
        if (err) throw err;
        // console.log('REQUEST RESPONSE', {
        //   offset,
        //   index,
        //   offsetInBytes: getOffsetInBytesBasedOnIndex(index),
        // });
        return resolve(block);
      }
    )
  );
}

export async function downloadPiece(
  resultFileName: string,
  filename: string,
  offset: number
): Promise<void> {
  const torrentData = await torrentPeers(filename, { silent: true });
  const { resolve, reject, promise } = Promise.withResolvers<void>();
  const { port, ip: host } = torrentData.metrics.peers[0];
  const infoHash = torrentData.info.infoHash.buffer;
  const peerId = Buffer.from(PEER_ID).toString('hex');
  // const pieceLength = torrentData.info.metadata.info['piece length'];
  // console.log(
  //   `🐛 | downloadPiece 1:`,
  //   { resultFileName, filename, offset },
  //   {
  //     port,
  //     host,
  //     infoHash,
  //     peerId,
  //     torrentData: torrentData.info.metadata.info,
  //   }
  // );

  const wire = new Protocol() as Wire;
  const socket = net.createConnection({ port, host }, () => {
    socket.pipe(wire).pipe(socket);
    wire.handshake(infoHash, peerId);
  });

  wire.on('error', (err) => console.error(err));
  socket.on('error', (err) => console.error(err));

  wire.on('handshake', (infoHash, peerId, extensions) => {
    // receive a handshake (infoHash and peerId are hex strings)
    // console.log('UNCHOKE ', {
    //   peerId,
    //   extensions,
    //   peerChoking: wire.peerChoking,
    //   infoHash,
    // });
    wire.interested();
  });

  wire.on('bitfield', (bitfield) => {
    // console.log(`🐛 | bitfield:`, bitfield);
    // bitfield received from the peer
    wire.interested();
  });

  wire.on('choke', () => {
    // console.log('CHOKE ', {
    //   peerId: wire.peerId,
    //   peerChoking: wire.peerChoking,
    // });
    setTimeout(() => {
      wire.interested();
    }, 5000);
  });

  wire.on('unchoke', () => {
    // console.log('UNCHOKE ', {
    //   peerId: wire.peerId,
    //   peerChoking: wire.peerChoking,
    // });
    const hasPiece = wire.peerPieces.get(offset);
    // console.log(`🐛 | wire.on | peerPieces:`, wire.peerPieces);
    // console.log(`🐛 | wire.on | hasPiece:`, hasPiece);

    if (!hasPiece) {
      // console.log('peer does not have the piece');
      reject();
      return;
    }
    const totalPieces = wire.peerPieces.length;
    // group in 3 and request
    wire.peerPieces.forEach(async (bit, index) => {
      // console.log(`🐛 | wire.peerPieces.forEach | bit, index:`, bit, index);
      if (!bit) return;
      const block = await tryToDownloadStuff(wire, offset, index);
      if (!block) return;
      await fs.appendFile(resultFileName, new Uint8Array(block));
      if (index === totalPieces - 1) resolve();
    });
  });

  return promise;
}
