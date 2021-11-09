/**
 * This class represents a queue of tasks to run asynchronously in batches.
 */
export default class BatchedTaskQueue<T> {
  private readonly tasks: (() => Promise<T>)[];
  private readonly batchSize: number;
  private readonly results: T[] = [];
  private taskIndex = 0;

  public constructor(tasks: (() => Promise<T>)[], batchSize: number) {
    this.tasks = tasks;
    this.batchSize = batchSize;
  }

  /**
   * Runs the remaining tasks in the queue if any asynchronously.
   */
  public run(): Promise<T[]> {
    if (!this.canRunNext()) {
      return Promise.resolve(this.results);
    }

    return new Promise<T[]>((resolve, reject) => {
      // Run as many tasks as possible at once
      while (this.canRunNext()) {
        // Grab next task
        const task = this.tasks[this.taskIndex];

        // Increment position in task order
        this.taskIndex++;

        // Asynchronously kick off task
        task()
          .then((result) => {
            this.results.push(result);
            if (this.canRunNext()) {
              // Recursive case: run another task
              this.run().then(resolve).catch(reject);
            } else {
              // Base case: resolve with results array
              resolve(this.results);
            }
          })
          .catch(reject);
      }
    });
  }

  /**
   * Check if another task can be run. Returns true if the
   * amount of running tasks allots for another task to be run
   * in parallel and there is another task to run.
   */
  private canRunNext(): boolean {
    return (
      this.getCountOfRunningTasks() < this.batchSize &&
      this.taskIndex < this.tasks.length
    );
  }

  /**
   * Determine number of tasks in progress currently.
   */
  private getCountOfRunningTasks(): number {
    return this.taskIndex - this.results.length;
  }
}
