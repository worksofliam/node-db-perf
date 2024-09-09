const odbc = require("odbc");
const { OdbcPool } = require("./odbcpool");

/** @type {OdbcPool} */
let pool;

exports.name = `node-odbc-custom`;

/**
 * @param {string} connectionString 
 * @param {number} startingSize
 * @param {number} maxSize
 */
exports.connect = (connectionString, startingSize = 1, maxSize = 5) => {
  pool = new OdbcPool(connectionString, maxSize, startingSize);
  return pool.connect();
}

/**
 * 
 * @param {string} statement 
 * @param {(string|number)[]} bindingsValues 
 * @returns 
 */
exports.query = (statement) => {
  return pool.execute(statement);
}

exports.endPool = () => {
  return pool.close();
}

exports.getJob = (connectionString) => {
  return odbc.connect(connectionString);
}

exports.connectionParm = [
  `DRIVER=IBM i Access ODBC Driver`,
  `SYSTEM=${process.env.DB_HOST}`,
  `UID=${process.env.DB_ID}`,
  `Password=${process.env.DB_PASSWORD}`,
  `Naming=1`,
].join(`;`);