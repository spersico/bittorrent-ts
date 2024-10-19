import { torrentInfo } from './info';
import bencode from 'bencode';

const MY_NAME_IS = '12345678901230303456';

function parsePeers(peers: Uint8Array): { ip: string; port: string }[] {
  const groupPeers = peers.reduce((acc, _, index) => {
    if (index % 6 === 0) {
      acc.push(peers.slice(index, index + 6));
    }
    return acc;
  }, [] as Uint8Array[]);

  const PeersParsed = groupPeers.map((bytes, index) => {
    const ip = Array.from(bytes.slice(0, 4)).join('.');
    const portPart = bytes.slice(4, 6);
    const port = Number.parseInt(Buffer.from(portPart).toString('hex'), 16);
    return { ip, port };
  });

  return PeersParsed;
}

export async function torrentPeers(filename: string) {
  try {
    const info = await torrentInfo(filename, { silent: true });
    const url =
      info.announce.toString() +
      '?info_hash=' +
      info.infoHash.infoHash +
      '&peer_id=' +
      encodeURIComponent(MY_NAME_IS) +
      '&port=6881&uploaded=0&downloaded=0&left=' +
      info.metadata.info.length.toString() +
      '&compact=1';

    const rawResponse = await fetch(url);

    const response = await rawResponse.arrayBuffer();
    const parsedResponse = bencode.decode(Buffer.from(response));

    const metrics = {
      complete: parsedResponse.complete,
      incomplete: parsedResponse.incomplete,
      interval: parsedResponse.interval,
      minInterval: parsedResponse['min interval'],
      peers: parsedResponse.peers as Uint8Array,
    };

    // group peers by 6 bytes
    const groupPeers = metrics.peers.reduce((acc, _, index) => {
      if (index % 6 === 0) {
        acc.push(metrics.peers.slice(index, index + 6));
      }
      return acc;
    }, [] as Uint8Array[]);

    const PeersParsed = groupPeers.map((bytes, index) => {
      const ip = Array.from(bytes.slice(0, 4)).join('.');
      const portPart = bytes.slice(4, 6);
      const port = Number.parseInt(Buffer.from(portPart).toString('hex'), 16);
      return { ip, port };
    });
    console.log(
      PeersParsed.map((peer) => `${peer.ip}:${peer.port}`).join('\n')
    );

    return { info };
  } catch (error: unknown) {
    if (error instanceof Error) console.error(error?.message);
    throw error;
  }
}
