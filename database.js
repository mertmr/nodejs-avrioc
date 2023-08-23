const sqlite3 = require('sqlite3');

const db = new sqlite3.Database('./avrioc.db', sqlite3.OPEN_READWRITE, (err) => {
  if (err) {
    console.error(err.message);
  }
  console.log('Connected to the user/friend database.');
});

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
module.exports.all = all;