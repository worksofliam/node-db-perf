const dbs = {
  odbc: require(`./db/odbc`),
  mapepire: require(`./db/mapepire`)
}

const args = process.argv.slice(2);

if (args.length < 3) {
  console.error(`Usage: node index.js <db> <s|p> <count>`);
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

const SQL_STATEMENT = `SELECT * FROM SAMPLE.DEPARTMENT`;
const poolSizes = {
  start: 5,
  max: 5
}

console.log(`Running..`);
console.log(``);

const promises = [];

const work = async () => {
  switch (mode) {
    case `s`:
      const jobStart = performance.now();
      const singleJob = await db.getJob(db.connectionParm);
      const jobEnd = performance.now();
      const jobCreationTime = jobEnd - jobStart;

      const execute = async (statement) => {
        // since they have unique methods, we need to switch on the db name
        let res;
        const now = performance.now();
        
        switch (db.name) {
          case `node-odbc`:
            res = await singleJob.query(statement);
            break;
          case `Mapepire`:
            res = await singleJob.execute(statement);
            break;
        }

        const timeLength = performance.now() - now;

        return timeLength;
      };

      for (let i = 0; i < count; i++) {
        promises.push(execute(SQL_STATEMENT));
      }

      await Promise.all(promises);

      const lengthsS = await Promise.all(promises);

      const totalS = lengthsS.reduce((acc, curr) => acc + curr, 0);
      const averageS = totalS / count;
      
      singleJob.close();

      console.log(`---------------------------------`);
      console.log(``);
      console.log(`Single job test results: ${db.name}`);
      console.log(``);
      console.log(`Node.js version: ${process.version}`);
      console.log(`Platform:        ${process.platform}`);
      console.log(`Architecture:    ${process.arch}`);
      console.log(``);
      console.log(`SQL used:`);
      console.log(`\t${SQL_STATEMENT}`);
      console.log(``);
      console.log(`Job startup:`);
      console.log(`\tTime:       ${jobCreationTime}ms`);
      console.log(``);
      console.log(`Total queries:      ${count}`);
      console.log(`Total time:         ${totalS}ms`);
      console.log(`Average time:       ${averageS}ms`);
      console.log(``);
      console.log(`---------------------------------`);

      break;

    case `p`:
      const poolStart = performance.now();
      await db.connect(db.connectionParm, poolSizes.start, poolSizes.max);
      const poolEnd = performance.now();

      const poolCreationTime = poolEnd - poolStart;

      const block = async () => {
        const now = performance.now();
        const res = await db.query(SQL_STATEMENT);
        const timeLength = performance.now() - now;

        return timeLength;
      };

      for (let i = 0; i < count; i++) {
        promises.push(block());
      }

      const lengthsP = await Promise.all(promises);

      const totalP = lengthsP.reduce((acc, curr) => acc + curr, 0);
      const averageP = totalP / count;

      const fastest = Math.min(...lengthsP);
      const slowest = Math.max(...lengthsP);
      const fastestIndex = lengthsP.indexOf(fastest);
      const slowestIndex = lengthsP.indexOf(slowest);

      await db.endPool();

      console.log(`---------------------------------`);
      console.log(``);
      console.log(`Pool test results: ${db.name}`);
      console.log(``);
      console.log(`Node.js version: ${process.version}`);
      console.log(`Platform:        ${process.platform}`);
      console.log(`Architecture:    ${process.arch}`);
      console.log(``);
      console.log(`SQL used:`);
      console.log(`\t${SQL_STATEMENT}`);
      console.log(``);
      console.log(`Pool startup:`);
      console.log(`\tStart size: ${poolSizes.start}`);
      console.log(`\tMax size:   ${poolSizes.max}`);
      console.log(`\tTime:       ${poolCreationTime}ms`);
      console.log(``);
      console.log(`Total queries:      ${count}`);
      console.log(`Total time:         ${totalP}ms`);
      console.log(`Average time:       ${averageP}ms`);
      console.log(`Fastest query:      ${fastest}ms (query ${fastestIndex + 1})`);
      console.log(`Slowest query:      ${slowest}ms (query ${slowestIndex + 1})`);
      console.log(``);
      console.log(`---------------------------------`);

      process.exit(0);
      break;

    default:
      console.error(`Unknown mode ${mode}`);
      process.exit(1);
  }
};

work();