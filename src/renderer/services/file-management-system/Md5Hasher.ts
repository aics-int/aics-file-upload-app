import * as CryptoJS from "crypto-js";

/**
 * Abstract hasher template.
 * Provides this project with a type for CryptoJS.algo.MD5 from CryptoJS which does not export this type.
 */
 interface Hasher {
    /**
     * The number of 32-bit words this hasher operates on. Default: 16 (512 bits)
     */
    blockSize: number;
    /**
     * Resets this hasher to its initial state.
     */
    reset(): void;
    /**
     * Updates this hasher with a message.
     *
     * @param messageUpdate The message to append.
     *
     * @return This hasher.
     */
    update(messageUpdate: CryptoJS.lib.WordArray | string): this;
    /**
     * Finalizes the hash computation.
     * Note that the finalize operation is effectively a destructive, read-once operation.
     *
     * @param messageUpdate (Optional) A final message update.
     *
     * @return The hash.
     */
    finalize(messageUpdate?: CryptoJS.lib.WordArray | string): CryptoJS.lib.WordArray;
}

export default class Md5Hasher{

    /**
     * Converts serialized string to a hasher object, having the same state as when it was serialized.
     * @param serialized_md5 
     * @returns 
     */
    public static deserialize (serialized_md5: string){
        const hasher = CryptoJS.algo.MD5.create();
        
        Md5Hasher.deepCopy(JSON.parse(serialized_md5), hasher);
        return new Md5Hasher(hasher);        
    }

    /**
     * Recursively copy properties from object source to object target.
    */
    private static deepCopy(source: Record<string, any>, target: Record<string, any>) {
        for (const prop in source) {
            const value = source[prop];
            if (typeof value === "object") {
                if (typeof target[prop] !== "object") {
                    target[prop] = {};
                }
                Md5Hasher.deepCopy(source[prop], target[prop]);
            } else {
                target[prop] = source[prop];
            }
        }
    }

    private hasher: Hasher

    public constructor (hasher?: Hasher) {
        this.hasher  = hasher || CryptoJS.algo.MD5.create();
    }

    /**
     * Adds chunk bytes to computes MD5 hash.
     * @param chunk 
     */
    public update(chunk: Uint8Array) : void {
        const wa: any[] = [];
        for (let i = 0; i < chunk.byteLength; i++) {
            wa[(i / 4) | 0] |= chunk[i] << (24 - 8 * i);
        }
        const word = CryptoJS.lib.WordArray.create(wa, chunk.length);
        this.hasher.update(word);
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
        return this.hasher.finalize().toString()
    }
}