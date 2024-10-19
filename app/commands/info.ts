import { promises as fs } from 'fs';
import { createHash } from 'crypto';
import bencode from 'bencode';

async function readFileContent(filename: string): Promise<Buffer> {
  try {
    const buffer = await fs.readFile(filename);
    return buffer;
  } catch (error) {
    if (error instanceof Error)
      console.error(`Error reading the file: ${error?.message}`);
    throw error;
  }
}

function getHash(info: any): {
  buffer: Buffer;
  hex: string;
  bin: string;
  infoHash: string;
} {
  const hasher = createHash('sha1');
  const encodedInfo = new Uint8Array(bencode.encode(info));
  hasher.update(encodedInfo);
  const hash = hasher.digest();

  return {
    buffer: hash,
    hex: hash.toString('hex'),
    bin: hash.toString('binary'),
    infoHash: hash.toString('hex').replace(/(.{2})/g, '%$1'),
  };
}

type DecodedMetadata = {
  announce: Uint8Array;
  'created by': Uint8Array;
  info: {
    length: number;
    name: Uint8Array;
    'piece length': number;
    pieces: Uint8Array;
  };
};

type TorrentInfo = {
  metadata: DecodedMetadata;
  infoHash: ReturnType<typeof getHash>;
  piecesHexa: string;
  announce: string;
};

export async function torrentInfo(
  filename: string,
  { silent }: { silent: boolean } = { silent: false }
): Promise<TorrentInfo> {
  try {
    const fileContents = await readFileContent(filename);
    if (!fileContents) throw new Error('Empty torrent file');

    const metadata = bencode.decode(fileContents);
    if (!metadata?.info || !metadata?.announce)
      throw new Error('Error decoding the torrent file');
    const announce = new TextDecoder().decode(metadata['announce']);
    const infoHash = getHash(metadata.info);

    const piecesHexa = Buffer.from(metadata.info.pieces).toString('hex');
    if (silent) return { metadata, infoHash, piecesHexa, announce };

    console.log(`Tracker URL: ${announce}`);
    console.log(`Length: ${metadata.info.length}`);
    console.log(`Info Hash: ${infoHash.hex}`);
    console.log(`Piece Length: ${metadata.info['piece length']}`);
    console.log(
      'Piece Hashes:',
      piecesHexa
        .match(/.{1,40}/g)
        ?.map((piece: string) => piece)
        .join('\n')
    );
    return { metadata, infoHash, piecesHexa, announce };
  } catch (error: unknown) {
    if (error instanceof Error) console.error(error?.message);
    throw error;
  }
}
