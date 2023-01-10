
import { expect } from "chai";

import Md5Hasher from "../Md5Hasher";

describe("Md5Hasher", () => {

  describe("update", () => {
    it("Updates the MD5 calculated", async () => {
        //ARRANGE
        const firstChunk = new Uint8Array([999999]);
        const secondChunk = new Uint8Array([888888]);
        const hasher = await Md5Hasher.init();
        hasher.update(firstChunk);
        const partialMd5 = hasher.serialize();

        const deserializedHasher = await Md5Hasher.deserialize(partialMd5)
        const originalMd5 = deserializedHasher.digest();
        //ACT
        hasher.update(secondChunk);

        //ASSERT
        const newMd5 = hasher.digest();        
        expect(newMd5).to.be.not.equal(originalMd5);
    })
  })

  describe("deserialize", () => {
    it("Produces consistent hasher", async () => {
        //ARRANGE
        const partialMd5 = "155,15,172,125,1,0,0,0,0,0,0,0,1,35,69,103,137,171,205,239,254,220,186,152,118,84,50,16,63,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0";
        const expectedMd5 = 'd1457b72c3fb323a2671125aef3eab5d';

        //ACT
        const hasher = await Md5Hasher.deserialize(partialMd5);

        //ASSERT
        const actualMd5 = hasher.digest();
        expect(actualMd5).to.be.equal(expectedMd5);
    })
  })

  describe("serialize", () => {
    it("Produces consistent hasher", async () => {
        //ARRANGE
        const expectedPartialMd5 = "155,15,172,125,1,0,0,0,0,0,0,0,1,35,69,103,137,171,205,239,254,220,186,152,118,84,50,16,63,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0";
        const firstChunk = new Uint8Array([999999]);
        const hasher = await Md5Hasher.init();
        hasher.update(firstChunk);
        
        //ACT
        const actualPartialMd5 = hasher.serialize();

        //ASSERT
        expect(actualPartialMd5).to.be.equal(expectedPartialMd5);   

    })
})

describe("digest", () => {
    it("Produces this error when run twice", async () => {
        //ARRANGE
        const expectedMd5 = 'd1457b72c3fb323a2671125aef3eab5d';
        const firstChunk = new Uint8Array([999999]);
        const hasher = await Md5Hasher.init();
        hasher.update(firstChunk);
        
        //ACT
        const actualMd5 = hasher.digest();

        //ASSERT   
        expect(actualMd5).to.be.equal(expectedMd5)
    })
  })

});