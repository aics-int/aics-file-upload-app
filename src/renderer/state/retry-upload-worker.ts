import { FileManagementSystem } from "@aics/aicsfiles";

const ctx: Worker = self as any;
ctx.onmessage = async (e: MessageEvent) => {
  const [job, fileNames, host, port, username] = e.data;
  const copyProgress = Object.keys(fileNames).reduce(
    (accum: { [originalPath: string]: number }, filePath) => {
      return {
        ...accum,
        [filePath]: 0,
      };
    },
    {}
  );
  // updates copyProgress
  const onCopyProgress = (
    originalFilePath: string,
    bytesCopied: number,
    totalBytes: number
  ) => {
    copyProgress[originalFilePath] = bytesCopied;
    const totalBytesCopied = Object.values(copyProgress).reduce(
      (totalCopied: number, curr: number) => totalCopied + curr,
      0
    );
    const percentCopied = (totalBytesCopied / totalBytes) * 100;
    ctx.postMessage(`percent copied:${percentCopied}`);
  };
  ctx.postMessage("Web worker retrying upload");
  const fms = new FileManagementSystem({ host, port, username });
  await fms.retryUpload(job, onCopyProgress);
  ctx.postMessage("Upload success!");
};
