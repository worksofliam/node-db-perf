const dbs = {
  odbc: require(`./db/odbc`),
  odbcCustom: require(`./db/odbc-custom`),
  mapepire: require(`./db/mapepire`)
}

const modes = {
  s: `Single-Promise.all`,
  sa: `Single-For-Await`,
  p: `Pool-Promise.all`,
  pa: `Pool-For-Await`
}

const args = process.argv.slice(2);

if (args.length < 3) {
  console.error(`Usage: node index.js <db> <s|sa|p|pa> <count>`);
  process.exit(1);
}

const chosenDb = args[0];
const mode = args[1];
const count = parseInt(args[2]);

const db = dbs[chosenDb];

if (!db) {
  console.error(`Database ${chosenDb} not found`);
  process.exit(1);
}

const SQL_STATEMENT = `select * from sample.employee`;
const poolSizes = {
  start: 5,
  max: 5
}

console.log(`Running..`);
console.log(``);

const promises = [];
let results = [];

let spinUpStart;
let spinUpEnd;
let spinupTime;
let singleJob;

let reportName = `${db.name} - ${modes[mode]} - ${count} queries`;

const work = async () => {
  let isPooling = false;
  const poolExec = async (uniqueId, statement) => {
    const now = performance.now();
    console.log(`A: ${uniqueId}`);
    const res = await db.query(statement);
    
    switch (db.name) {
      case `node-odbc`:
      case `node-odbc-custom`:
        if (res.length === 0) {
          throw new Error(`No results from ODBC.`);
        }

        break;
      case `Mapepire`:
        if (res.data.length === 0) {
          throw new Error(`No results from Mapepire.`);
        }

        break;
    }

    const timeLength = performance.now() - now;

    console.log(`B: ${uniqueId} - ${timeLength}`);

    return {uniqueId, timeLength};
  };

  switch (mode) {
    case `sa`:
      spinUpStart = performance.now();
      singleJob = await db.getJob(db.connectionParm);
      spinUpEnd = performance.now();
      spinupTime = spinUpEnd - spinUpStart;

      for (let i = 0; i < count; i++) {
        const now = performance.now();
        console.log(`A: ${i} - ${now}`);

        switch (db.name) {
          case `node-odbc`:
          case `node-odbc-custom`:
            res = await singleJob.query(SQL_STATEMENT);

            if (res.length === 0) {
              throw new Error(`No results from ODBC.`);
            }
            break;
          case `Mapepire`:
            res = await singleJob.execute(SQL_STATEMENT);

            if (res.data.length === 0) {
              throw new Error(`No results from Mapepire.`);
            }
            break;
        }

        let timeLength = performance.now() - now;
        console.log(`B: ${i} - ${timeLength}`);
        results.push({uniqueId: i, timeLength});
      }

      singleJob.close();
      break;

    case `s`:
      spinUpStart = performance.now();
      singleJob = await db.getJob(db.connectionParm);
      spinUpEnd = performance.now();
      spinupTime = spinUpEnd - spinUpStart;

      const execute = async (uniqueId, statement) => {
        // since they have unique methods, we need to switch on the db name
        let res;
        const now = performance.now();
        console.log(`A: ${uniqueId} - ${now}`);
        
        switch (db.name) {
          case `node-odbc-custom`:
          case `node-odbc`:
            res = await singleJob.query(statement);

            if (res.length === 0) {
              throw new Error(`No results from ODBC.`);
            }
            break;
          case `Mapepire`:
            res = await singleJob.execute(statement);

            if (res.data.length === 0) {
              throw new Error(`No results from Mapepire.`);
            }
            break;
        }

        const timeLength = performance.now() - now;
        console.log(`B: ${uniqueId} - ${timeLength}`);

        return {uniqueId, timeLength};
      };

      for (let i = 0; i < count; i++) {
        promises.push(execute(i, SQL_STATEMENT));
      }

      results = await Promise.all(promises);
      
      singleJob.close();
      break;

    case `p`:
      isPooling = true;
      spinUpStart = performance.now();
      await db.connect(db.connectionParm, poolSizes.start, poolSizes.max);
      spinUpEnd = performance.now();
      spinupTime = spinUpEnd - spinUpStart;

      for (let i = 0; i < count; i++) {
        promises.push(poolExec(i, SQL_STATEMENT));
      }

      results = await Promise.all(promises);

      await db.endPool();
      break;

    case `pa`:
      isPooling = true;
      spinUpStart = performance.now();
      await db.connect(db.connectionParm, poolSizes.start, poolSizes.max);
      spinUpEnd = performance.now();
      spinupTime = spinUpEnd - spinUpStart;

      for (let i = 0; i < count; i++) {
        results.push(await poolExec(i, SQL_STATEMENT));
      }

      await db.endPool();
      break;

    default:
      console.error(`Unknown mode ${mode}`);
      process.exit(1);
  }

  const lengths = results.map(r => r.timeLength);
  const total = lengths.reduce((acc, curr) => acc + curr, 0);
  const average = total / count;

  const fastest = Math.min(...lengths);
  const slowest = Math.max(...lengths);
  const fastestIndex = lengths.indexOf(fastest);
  const slowestIndex = lengths.indexOf(slowest);

  console.log(`---------------------------------`);
  console.log(``);
  console.log(reportName);
  console.log(``);
  console.log(`Node.js version: ${process.version}`);
  console.log(`Platform:        ${process.platform}`);
  console.log(`Architecture:    ${process.arch}`);
  console.log(``);
  console.log(`SQL used:`);
  console.log(`\t${SQL_STATEMENT}`);
  console.log(``);

  if (isPooling) {
    console.log(`Pool startup:`);
    console.log(`\tStart size: ${poolSizes.start}`);
    console.log(`\tMax size:   ${poolSizes.max}`);
    console.log(`\tTime:       ${spinupTime}ms`);
    console.log(``);
    console.log(`Pooling is being used. The test runner results are based on how long`);
    console.log(`it takes to execute a query from a pool of connections.`);
  } else {
    console.log(`Single connection startup:`);
    console.log(`\tTime: ${spinupTime}ms`);
    console.log(``);
    console.log(`A single job is being used. The test runner results are based on how long`);
    console.log(`it takes to execute a query using a single connection.`);
  }

  const type = isPooling ? `pool request` : `statement`;

  console.log(`Total ${type}s:      ${count}`);
  console.log(`Total time:         ${total}ms`);
  console.log(`Average time:       ${average}ms`);
  console.log(`Fastest ${type}:      ${fastest}ms (${type} ${fastestIndex + 1})`);
  console.log(`Slowest ${type}:      ${slowest}ms (${type} ${slowestIndex + 1})`);

  console.log(``);
  console.log(`Keynote chart:`);
  console.log(results.map(r => r.uniqueId).join(`\t`));
  console.log(results.map(r => r.timeLength).join(`\t`));
  console.log(``);
  console.log(`---------------------------------`);

  process.exit(0);
};

work();