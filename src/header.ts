import { ByteReader } from "./bytes";

const INITIAL_CHECKSUM = 8 * 32;

function calculateChecksum(bytes: Uint8Array) {
  const reader = new ByteReader(bytes);
  const firstChunk = reader.read(148);
  reader.skip(8);
  const secondChunk = reader.read(356);
  let sum = INITIAL_CHECKSUM;
  for (const byte of firstChunk) {
    sum += byte;
  }
  for (const byte of secondChunk) {
    sum += byte;
  }
  return sum;
}

function decodeTypeFlag(flag: number) {
  switch (flag) {
    case 0:
      return "file";
    case 1:
      return "link";
    case 2:
      return "symlink";
    case 3:
      return "character-device";
    case 4:
      return "block-device";
    case 5:
      return "directory";
    case 6:
      return "fifo";
    case 7:
      return "contiguous-file";
    case 72:
      return "pax-header";
    case 55:
      return "pax-global-header";
    case 27:
      return "gnu-long-link-path";
    case 28:
    case 30:
      return "gnu-long-path";
  }

  return null;
}

export function decode(bytes: Uint8Array) {
  const reader = new ByteReader(bytes);

  const name = reader.readString(100);
  const fileMode = reader.readOct(8);
  const uid = reader.readOct(8);
  const gid = reader.readOct(8);
  const size = reader.readOct(12);
  const mtime = reader.readOct(12);
  const checksum = reader.readOct(12);
  const type = decodeTypeFlag(reader.readByte());
  const linkName = reader.readString(100);

  const calculatedChecksum = calculateChecksum(bytes);

  if (calculatedChecksum === INITIAL_CHECKSUM) {
    return null; // Empty headers are skipped
  }

  if (calculatedChecksum !== checksum) {
    throw new Error("Invalid checksum");
  }

  return {
    name,
    fileMode,
    uid,
    gid,
    size,
    mtime,
    checksum,
    type,
    linkName,
  };
}
