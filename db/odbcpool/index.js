const odbc = require("odbc");

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

    this.timeoutLength = 50;
  }

  connect() {
    let promises = [];
    for (let i = 0; i < this.startingSize; i++) {
      promises.push(this.newConnection());
    }

    return Promise.all(promises);
  }

  getTotalJobs() {
    return this.pool.length + this.usedJobs;
  }

  async newConnection(toPool = true) {
    const newJob = await odbc.connect(this.connectionString);
    if (toPool) {
      this.pool.push(newJob);
    } else {
      return newJob;
    }
  }

  /**
   * @param {odbc.Connection} connection 
   */
  #addJob(connection) {
    if (this.pool.length < this.maxSize) {
      this.usedJobs = Math.max(0, this.usedJobs - 1);
      this.pool.push(connection);
    } else {
      connection.close();
    }
  }

  /**
   * @returns {Promise<odbc.Connection>}
   */
  async #getJob() {
    if (this.pool.length > 0) {
      this.usedJobs++;
      return this.pool.shift();
    } else if (this.getTotalJobs() < this.maxSize) {
      throw new Error(`TESTING: Don't hit this!`);
      const newJob = await this.newConnection(false);
      this.usedJobs++;
      return newJob;
    } else {
      console.log(`Waiting for new job...`);
      const waitedJob = await new Promise((resolve, reject) => {
        let interval = setInterval(() => {
          if (this.pool.length > 0) {
            clearInterval(interval);
            resolve(this.pool.shift());
          }
        }, 10);
      });

      this.usedJobs++;
      return waitedJob;
    }
  }

  /**
   * @param {string} statement 
   */
  async execute(statement) {
    const job = await this.#getJob();
    const res = await job.query(statement);
    this.#addJob(job);

    return res;
  }

  close() {
    let promises = [];
    for (let i = 0; i < this.pool.length; i++) {
      promises.push(this.pool[i].close());
    }

    return Promise.all(promises);
  }
}