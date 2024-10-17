import { promises as fs } from 'fs';
import { decodeBencode, type BencodeDict, type BencodeResult } from './decode';

async function readFileContent(filename: string): Promise<string> {
  try {
    return await fs.readFile(filename, 'utf-8');
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

    const decoded = decodeBencode(fileContents) as BencodeResult<BencodeDict>;
    if (!decoded?.value?.info || !decoded?.value?.announce)
      throw new Error('Error decoding the torrent file');

    console.log(`Tracker URL: ${decoded.value['announce']}`);
    console.log(`Length: ${(decoded.value.info as BencodeDict).length}`);
    return decoded.value;
  } catch (error: unknown) {
    if (error instanceof Error) console.error(error?.message);
    throw error;
  }
}
