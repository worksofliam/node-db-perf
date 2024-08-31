const odbc = require(`odbc`);

/** @type {odbc.Pool} */
let pool;

exports.name = `node-odbc`;

/**
 * @param {string} connectionString 
 */
exports.connect = async (connectionString, startingSize = 1, maxSize = 5) => {
  pool = await odbc.pool({connectionString, maxSize, initialSize: startingSize, reuseConnections: true, incrementSize: 1});
}

/**
 * 
 * @param {string} statement 
 * @param {(string|number)[]} bindingsValues 
 * @returns 
 */
exports.query = (statement, bindingsValues = []) => {
  return pool.query(statement, bindingsValues);
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