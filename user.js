const db = require('./database');

let countUsers = 0;
const init = async () => {
  const countUsers = await db.all(`SELECT count(*) as count from Users;`).then(results => {
    return results[0].count;
  });


  // await db.all(`CREATE INDEX user_index ON Friends (userId);`);
  // await db.all(`CREATE INDEX user_id_index ON Users (id);`);
  // await db.all(`CREATE INDEX user_name_index ON Users (name);`);

      // await db.all(`DROP INDEX user_index;`)
  // await db.all(`DROP INDEX user_id_index;`)
  // await db.all(`DROP INDEX user_name_index;`)

  if (countUsers === 0) {


    const users = [];
    const names = ['foo', 'bar', 'baz'];
    for (i = 0; i < 27000; ++i) {
      let n = i;
      let name = '';
      for (j = 0; j < 3; ++j) {
        name += names[n % 3];
        n = Math.floor(n / 3);
        name += n % 10;
        n = Math.floor(n / 10);
      }
      users.push(name);
    }
    const friends = users.map(() => []);
    for (i = 0; i < friends.length; ++i) {
      const n = 10 + Math.floor(90 * Math.random());
      const list = [...Array(n)].map(() => Math.floor(friends.length * Math.random()));
      list.forEach((j) => {
        if (i === j) {
          return;
        }
        if (friends[i].indexOf(j) >= 0 || friends[j].indexOf(i) >= 0) {
          return;
        }
        friends[i].push(j);
        friends[j].push(i);
      });
    }
    console.log("Init Users Table...");
    await Promise.all(users.map((un) => db.run(`INSERT INTO Users (name) VALUES ('${un}');`)));
    console.log("Init Friends Table...");
    await Promise.all(friends.map((list, i) => {
      return Promise.all(list.map((j) => db.run(`INSERT INTO Friends (userId, friendId) VALUES (${i + 1}, ${j + 1});`)));
    }));
  }
  console.log("Ready.");
}

module.exports.init = init;

const search = async (req, res) => {
  const query = req.params.query;
  const userId = parseInt(req.params.userId);

  const sql = `
  -- EXPLAIN QUERY PLAN
  WITH RecursiveConnections AS (
    -- Anchor member: Direct friends of the user
    SELECT
      f.friendId AS userId,
      1 AS connectionLevel
    FROM
      Friends f
    WHERE
      f.userId = ${userId}
    
    UNION ALL
    
    -- Recursive member: Friends-of-friends up to level 4
    SELECT
      f.friendId AS userId,
      rc.connectionLevel + 1 AS connectionLevel
    FROM
      RecursiveConnections rc
      JOIN Friends f ON rc.userId = f.userId
    WHERE
      rc.connectionLevel < 3
  )
    
  SELECT
    u.id AS id,
    u.name AS name,
    COALESCE(rc.connectionLevel, 0) AS connection
  FROM
    Users u
    LEFT JOIN RecursiveConnections rc ON u.id = rc.userId
  WHERE
  u.name >= '${query}'  -- Search for names starting with or after the query
  AND u.name < '${query}' || '{'  -- Search for names starting with the query
  LIMIT 20;  -- Limit the number of search results to 20;
  `;

  db.all(sql)
    .then((results) => {
      res.statusCode = 200;
      res.json({
        success: true,
        users: results
      });
    }).catch((err) => {
      res.statusCode = 500;
      res.json({ success: false, error: err.message });
    });
}

const friend = async (req, res) => {
  const friendId = parseInt(req.params.friendId);
  const userId = parseInt(req.params.userId);

  db.all(`INSERT INTO Friends (userId, friendId) VALUES (${userId}, ${friendId});`).then((results) => {
    res.statusCode = 200;
    res.json({
      success: true,
      results: results
    });
  }).catch((err) => {
    res.statusCode = 500;
    res.json({ success: false, error: err });
  });
}

const unfriend = async (req, res) => {
  const friendId = parseInt(req.params.friendId);
  const userId = parseInt(req.params.userId);

  db.all(`DELETE FROM Friends WHERE userId = ${userId} and friendId = ${friendId};`).then((results) => {
    res.statusCode = 200;
    res.json({
      success: true,
      results: results
    });
  }).catch((err) => {
    res.statusCode = 500;
    res.json({ success: false, error: err });
  });
}

module.exports.search = search;
module.exports.friend = friend;
module.exports.unfriend = unfriend;