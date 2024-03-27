import { decode } from "./header";
import { StreamReader } from "./stream-reader";
import { ReadableStream, DecompressionStream } from "stream/web";

export class TarParser {
  #reader: StreamReader;

  #files: Map<string, Uint8Array>;

  constructor(reader: StreamReader) {
    this.#reader = reader;
    this.#files = new Map();
  }

  async #parseHeader() {
    const bytes = await this.#reader.read(512);
    return decode(bytes);
  }

  async parse() {
    while (!(await this.#reader.isDone())) {
      const header = await this.#parseHeader();
      if (!header) {
        continue;
      }
      const content = await this.#reader.read(header.size);
      // Re-align after reading
      const overflow = 512 - (header.size % 512);
      this.#reader.skip(overflow);
      this.#files.set(header.name, content);
    }

    return this.#files;
  }
}

export async function untar(stream: ReadableStream, bufferSize?: number) {
  const decompressed = stream.pipeThrough(new DecompressionStream("gzip"));
  const reader = new StreamReader(decompressed, bufferSize);
  const parser = new TarParser(reader);

  return parser.parse();
}
