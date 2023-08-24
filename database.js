const sqlite3 = require('sqlite3');

const db = new sqlite3.Database(':memory:');

const run = (query) => {
  return new Promise((resolve, reject) => {
    db.run(query, (err, results) => {
      if (err) {
        reject(err)
      } else {
        resolve(results);
      }
    });
  });
}
module.exports.run = run;

const all = (query) => {
  return new Promise((resolve, reject) => {
    db.all(query, (err, results) => {
      if (err) {
        reject(err)
      } else {
        resolve(results);
      }
    });
  });
}

const allWithParams = (query, params) => {
  return new Promise((resolve, reject) => {
    db.run(query, params, (err, results) => {
      if (err) {
        reject(err)
      } else {
        resolve(results);
      }
    });
  });
}

module.exports.all = all;
module.exports.allWithParams = allWithParams;