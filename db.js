const sqlite3 = require('sqlite3').verbose();

const db = new sqlite3.Database('./innov8.db', (err) => {
  if (err) {
    console.error('Error opening database', err.message);
    throw err;
  }
  console.log('Database connection established.');
});

/**
 * Promisified version of db.run
 * @param {string} sql The SQL query to run.
 * @param {Array<any>} params The parameters for the SQL query.
 * @returns {Promise<{lastID: number, changes: number}>}
 */
function dbRun(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function (err) {
      if (err) {
        reject(err);
      } else {
        resolve(this);
      }
    });
  });
}

/**
 * Promisified version of db.get
 * @param {string} sql The SQL query to run.
 * @param {Array<any>} params The parameters for the SQL query.
 * @returns {Promise<any>}
 */
function dbGet(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) {
        reject(err);
      } else {
        resolve(row);
      }
    });
  });
}

/**
 * Promisified version of db.all
 * @param {string} sql The SQL query to run.
 * @param {Array<any>} params The parameters for the SQL query.
 * @returns {Promise<Array<any>>}
 */
function dbAll(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) {
        reject(err);
      } else {
        resolve(rows);
      }
    });
  });
}

/**
 * Runs multiple SQL statements in series.
 * @param {Function} fn A function containing the db calls.
 */
function serialize(fn) {
  return new Promise((resolve, reject) => {
    db.serialize(() => {
      fn().then(resolve).catch(reject);
    });
  });
}

module.exports = { db, dbRun, dbGet, dbAll, serialize };
