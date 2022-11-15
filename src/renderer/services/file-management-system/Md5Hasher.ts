import * as SparkMD5 from "spark-md5";

export default class Md5Hasher{

    private hasher: SparkMD5.ArrayBuffer

    public constructor (hasher?: SparkMD5.ArrayBuffer) {
        this.hasher  = hasher || new SparkMD5.ArrayBuffer();
    }

    /**
     * Converts serialized string to a hasher object, having the same state as when it was serialized.
     * @param serialized_md5 
     * @returns 
     */
    //  public deserialize (serialized_md5: string){
        // this.hasher.setState();        
    // }

    // public static deserialize (serialized_md5: string){
        // return new Md5Hasher(hasher);        
    // }

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
        // const state: SparkMD5.State = this.hasher.getState();
        // return this.hasher.toString();
        return "foo";
    }

    /** 
     Return MD5 hash of file read.
     May only be done once during Md5Hasher lifecycle.
    */
    public digest():string {
        return this.hasher.end()
    }

        /**
 * Recursively copy properties from object source to object target.
*/
    //     private static deepCopy(source: Record<string, any>, target: Record<string, any>) {
    //     for (const prop in source) {
    //         const value = source[prop];
    //         if (typeof value === "object") {
    //             if (typeof target[prop] !== "object") {
    //                 target[prop] = {};
    //             }
    //             Md5Hasher.deepCopy(source[prop], target[prop]);
    //         } else {
    //             target[prop] = source[prop];
    //         }
    //     }
    // }
}