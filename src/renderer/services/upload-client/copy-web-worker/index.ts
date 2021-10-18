/**
 *  TODO:
 * */ 

const ctx: Worker = self as any;
  ctx.onmessage = async (e: MessageEvent) => {
    const [filePath, initialOffset, chunkSize, onProgress, onComplete] = e.data as [filePath: string, initialOffset: number, chunkSize: number, onProgress: (result: string | ArrayBuffer, chunkNumber: number) => Promise<void>, onComplete: (error?: string) => void];

    let chunkNumber = 0;
    let offset = initialOffset;
    const file = new File(filePath);

    // Dummy function to assign to read event handler for now
    let chunkReaderBlock = (_: number): void => {
        throw new Error("Not Yet Implemented");
    };

    // Read event handler, decides whether read
    // should continue & dispatches callback
    const readEventHandler = async (evt: ProgressEvent<FileReader>): Promise<void> => {
        // If an error is present complete the read with an error message
        if (!evt?.target?.result || evt.target.error) {
            onComplete(evt?.target?.error?.message || "Missing file read result");
            return;
        }

        // Bump chunkNumber & offset
        chunkNumber += 1;
        offset += chunkSize;

        // Base case: when the offset reaches the fileSize the
        // file read has completed
        if (offset >= file.size) {
            onComplete();
            return;
        }

        // Alert main thread of read progress
        await onProgress(evt.target.result, chunkNumber)

        // Recurse: read next chunk
        chunkReaderBlock(chunkSize);
    }

    // Actual file read, reads only one specific file chunk at a time
    chunkReaderBlock = (length: number): void => {
        // TODO Should I just re-use this reader...?
        const fileReader = new FileReader(); // TODO: How to close???
        var blob = file.slice(offset, length + offset);
        fileReader.onload = readEventHandler;
        fileReader.readAsText(blob);
    }

    // Start with first block
    chunkReaderBlock(chunkSize);
  };
