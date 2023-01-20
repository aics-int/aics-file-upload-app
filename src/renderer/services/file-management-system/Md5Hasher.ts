import { createMD5 } from "hash-wasm";
import { IHasher } from "hash-wasm/dist/lib/WASMInterface";


export default class Md5Hasher{

    private static readonly ARRAY_DELIMITER = ",";

    private hasher: IHasher

    public constructor(hasher: IHasher) {
        this.hasher = hasher;
    }


    /**
     * Factory method for creating Md5Hashers
     * @returns Promise<Md5Hasher>
     */
     public static async init(): Promise<Md5Hasher>{ 
        const hasher = await createMD5();
        hasher.init();
        return new Md5Hasher(hasher);
    }


    /**
     * Converts serialized string to Uint8Array, having the same state as when it was serialized.
     * @param serialized_md5 
     * @returns Promise<Md5Hasher>
     */
     public static async deserialize(serializedMd5: string): Promise<Md5Hasher>{
        // The load() function necessary to rehydrate the Md5Hasher state requires a Uint8Array,
        // but in order to persist the Uint8Array it had to be converted to string.
        // This intends to take an array-like string and convert it back into an array
        // that a Uint8Array can be created from.
        const serializedMd5AsArray = serializedMd5.split(Md5Hasher.ARRAY_DELIMITER).map(v => +v);
        const deserializedHasher = Uint8Array.from(serializedMd5AsArray); 
        const hasher = await createMD5();
        hasher.load(deserializedHasher);
        return new Md5Hasher(hasher);
    }

    /**
     * Adds chunk bytes to computes MD5 hash.
     * @param chunk 
     */
    public update(chunk: Uint8Array): void {
        this.hasher.update(chunk);
    }

    /**
     * Converts state of Hashing process to a string.
     * @returns Serialized Hasher string, which can be stored and used to resume hashing process.
     */
    public serialize(): string {
        const hasherState = this.hasher.save();
        // Convert Uint8Array into an array-like string
        return hasherState.join(Md5Hasher.ARRAY_DELIMITER);
    }

    /** 
     * Return MD5 hash of file read.
     * May only be done once during Md5Hasher lifecycle.
     * @returns MD5 produced from hashing
    */
    public digest(): string {
        return this.hasher.digest()
    }
}
