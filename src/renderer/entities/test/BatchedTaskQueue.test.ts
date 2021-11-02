import { expect } from "chai";

import BatchedTaskQueue from "../BatchedTaskQueue";

describe("BatchedTaskQueue", () => {
  it("runs each task in order", async () => {
    // Arrange
    const taskOrder: number[] = [];
    const expected = [1, 2, 3, 4, 5];
    const tasks = expected.map((order) => async () => {
      taskOrder.push(order);
      return Promise.resolve(order);
    });
    const queue = new BatchedTaskQueue(tasks, 2);

    // Act
    const actual = await queue.run();

    // Assert
    expect(actual).deep.equal(expected);
    expect(expected).deep.equal(taskOrder);
  });

  it("does not re-run tasks if ran again", async () => {
    // Arrange
    const expected = [1, 2, 3, 4, 5];
    const taskOrder: number[] = [];
    const tasks = expected.map((order) => () => {
      if (taskOrder.includes(order)) {
        Promise.reject("Duplicate task run!");
      }
      taskOrder.push(order);
      return Promise.resolve(order);
    });
    const queue = new BatchedTaskQueue(tasks, 7);

    // Act
    const actual1 = await queue.run();
    const actual2 = await queue.run();

    // Assert
    expect(actual1).deep.equal(actual2);
    expect(actual1).deep.equal(expected);
  });
});
