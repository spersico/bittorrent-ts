import { promises as fs } from 'fs';
import bencode from 'bencode';

async function readFileContent(filename: string): Promise<Buffer> {
  try {
    // Read the file as a Buffer
    const buffer = await fs.readFile(filename);

    // You can try different encodings based on the file content:
    // UTF-8 if the file mostly contains text and valid characters
    // Latin1 (ISO-8859-1) to preserve the byte values for non-UTF-8 characters

    return buffer;
  } catch (error) {
    if (error instanceof Error)
      console.error(`Error reading the file: ${error?.message}`);
    throw error;
  }
}

export async function torrentInfo(filename: string) {
  try {
    const fileContents = await readFileContent(filename);
    if (!fileContents) throw new Error('Empty torrent file');

    const decoded = bencode.decode(fileContents);
    if (!decoded?.info || !decoded?.announce)
      throw new Error('Error decoding the torrent file');
    const announce = new TextDecoder().decode(decoded['announce']);
    console.log(`Tracker URL: ${announce}`);
    console.log(`Length: ${decoded.info.length}`);
    return decoded;
  } catch (error: unknown) {
    if (error instanceof Error) console.error(error?.message);
    throw error;
  }
}
