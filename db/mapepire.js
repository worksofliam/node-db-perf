const mapepire = require('@ibm/mapepire-js');


/** @type {mapepire.Pool} */
let pool;

exports.name = `Mapepire`;

exports.connect = async (server, startingSize = 1, maxSize = 5) => {
  const ca = await mapepire.getCertificate(server);
  server.ca = ca.raw;

  pool = new mapepire.Pool({creds: server, maxSize, startingSize});
  await pool.init();
}

/**
 * 
 * @param {string} statement 
 * @param {(string|number)[]} bindingsValues 
 * @returns 
 */
exports.query = async (statement, bindingsValues = []) => {
  return pool.execute(statement, {parameters: bindingsValues});
}

exports.endPool = () => {
  return pool.end();
}

exports.getJob = async (server) => {
  const ca = await mapepire.getCertificate(server);
  server.ca = ca.raw;
  
  const job = new mapepire.SQLJob();
  await job.connect(server);
  return job;
}

exports.connectionParm = {
  host: process.env.DB_HOST,
  user: process.env.DB_ID,
  password: process.env.DB_PASSWORD,
  ignoreUnauthorized: true,
}