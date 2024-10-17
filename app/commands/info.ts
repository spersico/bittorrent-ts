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

function getInfoHash(info: any) {
  const hasher = createHash('sha1');
  const encodedInfo = new Uint8Array(bencode.encode(info));
  hasher.update(encodedInfo);
  return hasher.digest('hex');
}

export async function torrentInfo(filename: string) {
  try {
    const fileContents = await readFileContent(filename);
    if (!fileContents) throw new Error('Empty torrent file');

    const metadata = bencode.decode(fileContents);
    if (!metadata?.info || !metadata?.announce)
      throw new Error('Error decoding the torrent file');
    const announce = new TextDecoder().decode(metadata['announce']);
    const hash = getInfoHash(metadata.info);

    const piecesHexa = Buffer.from(metadata.info.pieces).toString('hex');

    console.log(`Tracker URL: ${announce}`);
    console.log(`Length: ${metadata.info.length}`);
    console.log(`Info Hash: ${hash}`);
    console.log(
      'Piece Hashes:',
      piecesHexa
        .match(/.{1,40}/g)
        ?.map((piece: string) => piece)
        .join('\n')
    );
    return { metadata, hash };
  } catch (error: unknown) {
    if (error instanceof Error) console.error(error?.message);
    throw error;
  }
}
