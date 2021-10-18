function readChunked(file: File, offset: number, chunkSize: number, onChunk: (chunk: string | ArrayBuffer, offset: number) => void, onComplete: (error?: string) => void) {
    const fileReader = new FileReader();
  
    const onNext = () => {
      const fileSlice = file.slice(offset, offset + chunkSize);
      fileReader.readAsBinaryString(fileSlice);
    }

    fileReader.onload = () => {
    // Upon any error, consider file read complete
      if (fileReader.error || !fileReader.result) {
        onComplete(fileReader?.error?.message || "Unknown error");
        return;
      }

      // Successful chunk read, add to MD5
      onChunk(fileReader.result, offset); 

      // Increment offset for (potential) next call
      offset += chunkSize;

      // Base Case: If offset is greater than file size, file read is complete
      if (offset >= file.size) {
        onComplete();
        return;
      }

      // Recurse: Read another chunk
      onNext();
    };
  
    fileReader.onerror = (err) => {
        onComplete(err.target?.error?.message || "Unknown error");
    };

    onNext();
}
  
function getMD5(file: File, onProgress: (remainingPercent: number) => void): Promise<void> {
    return new Promise((resolve, reject) => {
      var md5 = CryptoJS.algo.MD5.create();
      readChunked(file, 0, 0, (chunk, offset) => {
        md5.update(CryptoJS.enc.Latin1.parse(chunk));
        onProgress(offset / file.size);
      }, (err) => {
        if (err) {
          reject(err);
        } else {
          // TODO: Handle errors
          var hash = md5.finalize();
          var hashHex = hash.toString(CryptoJS.enc.Hex);
          resolve(hashHex);
        }
      });
    });
}
