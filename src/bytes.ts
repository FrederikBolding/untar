// Non async version of byte reading utilities from StreamReader and TarParser
// But with extra handling of bit reading etc
export class ByteReader {
  #buffer: Uint8Array;
  #pointer: number;

  constructor(buffer: Uint8Array) {
    this.#buffer = buffer;
    this.#pointer = 0;
  }

  getBytesLeft() {
    return this.#buffer.byteLength - this.#pointer;
  }

  skip(n: number) {
    this.#pointer = this.#pointer + n;
  }

  read(n: number): Uint8Array {
    const start = this.#pointer;
    const end = this.#pointer + n;

    if (this.#buffer.length < end) {
      throw new Error("ByteReader out of range");
    }

    this.#pointer = end;
    return this.#buffer.subarray(start, end);
  }

  readByte() {
    const bytes = this.read(1);
    return bytes[0]!;
  }

  readString(length: number) {
    return new TextDecoder().decode(this.read(length));
  }

  readOct(length: number) {
    const str = this.readString(length);
    return parseInt(str, 8);
  }
}
