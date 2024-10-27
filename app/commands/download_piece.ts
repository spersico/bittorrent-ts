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

async function download(
  wire: Wire,
  index: number,
  offset: number,
  length: number
): Promise<Uint8Array> {
  console.log(`🐛 | 1 REQUEST:`, {
    index,
    offset,
    length,
  });

  if (!wire.peerPieces.get(index))
    throw new Error('peer does not have the piece');
  if (wire.peerChoking) throw new Error('peer is choking us');

  return new Promise((resolve, reject) => {
    try {
      wire.request(
        index,
        getOffsetInBytesBasedOnIndex(offset),
        length,
        (err, block) => {
          if (!block || err)
            return reject(err.message ? new Error(err.message) : err);
          console.log('🐛 | 2 RESPONSE', {
            offset,
            index,
            length,
            block,
          });
          return resolve(new Uint8Array(block));
        }
      );
    } catch (error) {
      console.error('ERROR', error);
    }
  });
}

async function startDownload(
  wire: Wire,
  index: number,
  numberOfPieces: number,
  pieceLength: number,
  lastPieceLength: number,
  resultFileName: string,
  startingBlock: number = 0,
  pieceBuffer: Buffer = Buffer.alloc(pieceLength)
) {
  if (!wire.peerPieces.get(index)) {
    throw new Error('peer does not have the piece');
  }

  for (let subIndex = startingBlock; subIndex < numberOfPieces; subIndex++) {
    const piece = await download(
      wire,
      index,
      getOffsetInBytesBasedOnIndex(subIndex),
      subIndex === numberOfPieces - 1
        ? lastPieceLength
        : getOffsetInBytesBasedOnIndex(1)
    ).catch((error) => {
      console.error('🐛 | E ERROR', error);
    });
    if (piece) pieceBuffer.set(piece, getOffsetInBytesBasedOnIndex(subIndex));
  }
  if (!pieceBuffer.length) throw new Error('No buffer filled');
  await fs.appendFile(resultFileName, new Uint8Array(pieceBuffer));
  return pieceBuffer;
}

export async function downloadPiece(
  resultFileName: string,
  filename: string,
  index: number
): Promise<void> {
  const torrentData = await torrentPeers(filename, { silent: true });
  await fs.writeFile(resultFileName, '');
  const { resolve, reject, promise } = Promise.withResolvers<void>();
  const { port, ip: host } = torrentData.metrics.peers[0];
  const infoHash = torrentData.info.infoHash.buffer;
  const peerId = Buffer.from(PEER_ID).toString('hex');
  const pieceLength = torrentData.info.metadata.info['piece length'];
  const lastPieceLength = torrentData.info.metadata.info.length % pieceLength;
  const numberOfPieces = Math.ceil(
    torrentData.info.metadata.info.length / pieceLength
  );
  console.log(
    `🐛 | 0 downloadPiece:`,
    { resultFileName, filename, index },
    {
      port,
      host,
      infoHash,
      peerId,
      pieceLength,
    }
  );

  const wire = new Protocol() as Wire;
  const socket = net.createConnection({ port, host }, () => {
    socket.pipe(wire).pipe(socket);
    wire.handshake(infoHash, peerId);
  });

  wire.on('error', (err) => {
    console.error('wireError', err);
  });

  wire.on('handshake', (infoHash, peerId, extensions) => {
    console.log('🐛 | 0 HANDSHAKE ', {
      peerId,
      infoHash,
      extensions,
    });
    wire.interested();
  });

  wire.on('bitfield', (bitfield) => {
    console.log(`🐛 | 0 BITFIELD:`, bitfield);
    // bitfield received from the peer
    wire.interested();
  });

  wire.on('choke', () => {
    console.log('🐛 | E CHOKE ', {
      peerId: wire.peerId,
      peerChoking: wire.peerChoking,
    });
    setTimeout(() => {
      wire.interested();
    }, 5000);
  });

  wire.on('unchoke', async () => {
    console.log('🐛 | 0 UNCHOKE ', {
      peerId: wire.peerId,
      peerChoking: wire.peerChoking,
      piece: wire.peerPieces.get(index),
      pieceLength,
      torrentLength: torrentData.info.metadata.info.length,
    });

    try {
      const result = await startDownload(
        wire,
        index,
        numberOfPieces,
        pieceLength,
        lastPieceLength,
        resultFileName
      );
      console.log('🐛 | 3 - FINAL RESULT', result);
      resolve();
    } catch (error) {
      console.error(`🐛 | ERROR:`, error);
      reject(error);
    }

    return promise;
  });
}
