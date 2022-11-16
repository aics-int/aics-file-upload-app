import { ArrayBuffer } from "spark-md5";

export default class Md5Hasher{

    private hasher: ArrayBuffer

    public constructor (hasher?: ArrayBuffer) {
        this.hasher  = hasher || new ArrayBuffer();
    }


    /**
     * Converts serialized string to SparkMD5.State, having the same state as when it was serialized.
     * @param serialized_md5 
     * @returns 
     */
     public static deserialize (serialized_md5: string) : Md5Hasher{ 
        const hasher = new ArrayBuffer();
        hasher.setState(JSON.parse(serialized_md5));
        return new Md5Hasher(hasher);
    }

    /**
     * Adds chunk bytes to computes MD5 hash.
     * @param chunk 
     */
    public update(chunk: Uint8Array) : void {
        this.hasher.append(chunk.buffer);
    }

    /**
     * Converts state of Hashing process to a String.
     * @returns Serialized Hasher string, which can be stored and used to resume hashing process.
     */
    public serialize():string {
        return JSON.stringify(this.hasher.getState());
    }

    /** 
     Return MD5 hash of file read.
     May only be done once during Md5Hasher lifecycle.
    */
    public digest():string {
        return this.hasher.end()
    }
}