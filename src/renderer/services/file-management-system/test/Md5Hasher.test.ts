
import { expect } from "chai";

import Md5Hasher from "../Md5Hasher";

describe("Md5Hasher", () => {

  describe("update", () => {
    it("Updates the MD5 calculated", () => {
        //ARRANGE
        const firstChunk = new Uint8Array([999999]);
        const secondChunk = new Uint8Array([888888]);
        const hasher = new Md5Hasher();
        hasher.update(firstChunk);
        const partialMd5 = hasher.serialize();

        const deserializedHasher = Md5Hasher.deserialize(partialMd5)
        const originalMd5 = deserializedHasher.digest();
        //ACT
        hasher.update(secondChunk);

        //ASSERT
        const newMd5 = hasher.digest();        
        expect(newMd5).to.be.not.equal(originalMd5);
    })
  })

  describe("deserialize", () => {
    it("Produces consistent hasher", () => {
        //ARRANGE
        const partialMd5 = '{"buff":"?","length":1,"hash":[1732584193,-271733879,-1732584194,271733878]}';
        const expectedMd5 = 'd1457b72c3fb323a2671125aef3eab5d';

        //ACT
        const hasher = Md5Hasher.deserialize(partialMd5);

        //ASSERT
        const actualMd5 = hasher.digest();
        expect(actualMd5).to.be.equal(expectedMd5);
    })
  })

  describe("serialize", () => {
    it("Produces consistent hasher", () => {
        //ARRANGE
        const expectedPartialMd5 = '{"buff":"?","length":1,"hash":[1732584193,-271733879,-1732584194,271733878]}';
        const firstChunk = new Uint8Array([999999]);
        const hasher = new Md5Hasher();
        hasher.update(firstChunk);
        
        //ACT
        const actualPartialMd5 = hasher.serialize();

        //ASSERT
        expect(actualPartialMd5).to.be.equal(expectedPartialMd5);   

    })
})

describe("digest", () => {
    it("Produces this error when run twice", () => {
        //ARRANGE
        const expectedMd5 = 'd1457b72c3fb323a2671125aef3eab5d';
        const firstChunk = new Uint8Array([999999]);
        const hasher = new Md5Hasher();
        hasher.update(firstChunk);
        
        //ACT
        const actualMd5 = hasher.digest();

        //ASSERT   
        expect(actualMd5).to.be.equal(expectedMd5)
    })
  })

});