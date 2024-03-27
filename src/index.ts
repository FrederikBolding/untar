import fs from "fs";
import path from "path";
import { Readable, pipeline } from "stream";
import { extract as tarExtract } from "tar-stream";
import { DecompressionStream, ReadableStream } from "stream/web";
import concat from "concat-stream";
import { untar } from "./tar";

const TEST_FILE_PATH = "./test/masca-1.1.0.tgz";

function getFileStream() {
  return fs.createReadStream(path.resolve(TEST_FILE_PATH));
}

async function getFileSize() {
  return (await fs.promises.stat(TEST_FILE_PATH)).size;
}

async function customUntar(stream: ReadableStream, bufferSize: number) {
  return untar(stream, bufferSize);
}

function createTarballStream(files: Map<string, Uint8Array>) {
  const extractStream = tarExtract();

  extractStream.on("entry", (header: any, entryStream: any, next: any) => {
    const { name: headerName, type: headerType } = header;
    if (headerType === "file") {
      const path = headerName;
      return entryStream.pipe(
        concat({ encoding: "uint8array" }, (data: any) => {
          try {
            files.set(path, data);
            return next();
          } catch (error) {
            return extractStream.destroy(error as any);
          }
        })
      );
    }

    entryStream.on("end", () => next());
    return entryStream.resume();
  });
  return extractStream;
}

async function untarBench(stream: ReadableStream) {
  const files = new Map();

  const decompressionStream = new DecompressionStream("gzip");
  const decompressedStream = stream.pipeThrough(decompressionStream);

  const tarballStream = createTarballStream(files);

  return new Promise<Map<string, Uint8Array>>((resolve, reject) => {
    pipeline(
      Readable.fromWeb(decompressedStream),
      tarballStream,
      (error: unknown) => {
        error ? reject(error) : resolve(files);
      }
    );
    return;
  });
}

async function main() {
  const fileStream1 = Readable.toWeb(getFileStream());
  let now = Date.now();
  const files1 = await untarBench(fileStream1);
  console.log(
    "Untar with tar-stream took",
    Date.now() - now,
    "ms",
    "Contained",
    files1.size,
    "files"
  );

  const fileStream2 = Readable.toWeb(getFileStream());
  const bufferSize = (await getFileSize()) * 2;
  now = Date.now();
  const files2 = await customUntar(fileStream2, bufferSize);
  console.log(
    "Untar took",
    Date.now() - now,
    "ms",
    "Contained",
    files2.size,
    "files"
  );

  const files1Keys = Array.from(files1.keys());
  const files1Values = Array.from(files1.values());
  const files2Keys = Array.from(files2.keys());
  const files2Values = Array.from(files2.values());
  for (let i = 0; i < files1Values.length; i++) {
    const key1 = files1Keys[i];
    const key2 = files2Keys[i];
    const value1 = files1Values[i]!;
    const value2 = files2Values[i]!;

    if (key1 !== key2) {
      throw new Error(`Key mismatch ${key1} !== ${key2}`);
    }

    if (value1.length !== value2.length) {
      throw new Error(`Value mismatch for ${key1} and ${key2}`);
    }

    for (let j = 0; j < value1.length; j++) {
      if (value1[j] !== value2[j]) {
        throw new Error(`Value mismatch for ${key1} and ${key2}`);
      }
    }
  }
}

main().catch(console.error);
