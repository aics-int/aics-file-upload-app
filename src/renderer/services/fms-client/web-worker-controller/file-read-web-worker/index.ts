import ChunkedFileReader from "./chunked-file-reader";

export interface FileReadWebWorkerConfig {
  chunkSize: number;
  file: File;
  initialOffset: number;
  onComplete: () => void;
  onError: (message: string) => void;
  onProgress: (chunk: string, chunkNumber: number) => Promise<void>;
}

/**
 *  TODO:
 * */
const ctx: Worker = self as any;
ctx.onmessage = async (e: MessageEvent) => {
  const config: FileReadWebWorkerConfig = e.data;
  const fileReader = new ChunkedFileReader(
    config.file,
    config.chunkSize,
    config.initialOffset
  );

  try {
    await fileReader.read(config.onProgress);
    config.onComplete();
  } catch (err) {
    config.onError(
      `Something went wrong while reading file. Details: ${err?.message}`
    );
  }
};
