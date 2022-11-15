import * as SparkMD5 from "spark-md5";

export default class Md5Hasher{

    /**
     * Converts serialized string to a hasher object, having the same state as when it was serialized.
     * @param serialized_md5 
     * @returns 
     */
    public static deserialize (serialized_md5: string){
        // const hasher = CryptoJS.algo.MD5.create();
        
        // Md5Hasher.deepCopy(JSON.parse(serialized_md5), hasher);
        // return new Md5Hasher(hasher);        
    }

    private hasher: SparkMD5.ArrayBuffer

    public constructor (hasher?: SparkMD5.ArrayBuffer) {
        this.hasher  = hasher || new SparkMD5.ArrayBuffer();
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
        return JSON.stringify(this.hasher);
    }

    /** 
     Return MD5 hash of file read.
     May only be done once during Md5Hasher lifecycle.
    */
    public digest():string {
        return this.hasher.end()
    }
}