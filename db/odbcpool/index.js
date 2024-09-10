const odbc = require("odbc");

const JobState = {
  Ready: "ready",
  Busy: "busy",
  Ended: "ended"
}

exports.OdbcPool = class OdbcPool {
  /**
   * @param {string} connectionString 
   */
  constructor(connectionString, maxSize = 5, startingSize = 1) {
    /** @type {odbc.Connection[]} */
    this.pool = [];
    this.usedJobs = 0;

    this.connectionString = connectionString;
    this.maxSize = maxSize;
    this.startingSize = startingSize;

    this.timeoutLength = 10;

    // setInterval(() => {
    //   console.clear();
    //   console.log(`Pool size: ${this.pool.length}`);
    //   console.log(`Ready jobs: ${this.getReadyJobs()}`);

    //   for (let i = 0; i < this.pool.length; i++) {
    //     console.log(`Job ${i}: ${this.pool[i].state}`);
    //   }
    // }, 5);
  }

  connect() {
    let promises = [];
    for (let i = 0; i < this.startingSize; i++) {
      promises.push(this.newConnection());
    }

    return Promise.all(promises);
  }

  getReadyJobs() {
    return this.pool.filter(job => job.state === JobState.Ready).length;
  }

  async newConnection(toPool = true) {
    const newJob = await odbc.connect(this.connectionString);
    if (toPool) {
      console.log(newJob.odbcConnection);
      newJob.state = JobState.Ready;
      this.pool.push(newJob);
    } else {
      newJob.state = JobState.Busy;
      return newJob;
    }
  }

  #findReadyJob() {
    return this.pool.find(job => job.state === JobState.Ready);
  }

  async #getJob() {
    if (this.getReadyJobs() > 0) {
      const job = this.#findReadyJob();
      job.state = JobState.Busy;
      return job;
      
    } else if (this.pool.length < this.maxSize) {
      throw new Error(`TESTING: Don't hit this!`);
      const newJob = await this.newConnection(false);
      return newJob;
    } else {
      const waitedJob = await new Promise((resolve, reject) => {
        let interval = setInterval(() => {
          if (this.getReadyJobs() > 0) {
            clearInterval(interval);
            const job = this.#findReadyJob();
            job.state = JobState.Busy;
            resolve(job);
          }
        }, this.timeoutLength);
      });

      return waitedJob;
    }
  }

  /**
   * @param {string} statement 
   */
  async query(statement) {
    const job = await this.#getJob();
    const res = await job.query(statement);

    job.state = JobState.Ready;

    return res;
  }

  close() {
    let promises = [];
    for (let i = 0; i < this.pool.length; i++) {
      this.pool[i].state = JobState.Ended;
      promises.push(this.pool[i].close());
    }

    return Promise.all(promises);
  }
}