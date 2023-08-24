const db = require('./database');

const init = async () => {
  await db.run('CREATE TABLE Users (id INTEGER PRIMARY KEY AUTOINCREMENT, name varchar(32));');
  await db.run('CREATE TABLE Friends (id INTEGER PRIMARY KEY AUTOINCREMENT, userId int, friendId int);');

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

  // changed here to batch insert, it was really slow to start the app everytime I did a change
  console.log("Init Users Table...");
  let placeholders = users.map((name) => '(?)').join(',');
  let sql = 'INSERT INTO Users(name) VALUES ' + placeholders;
  await db.allWithParams(sql, users);

  console.log("Init Friends Table...");
  const valuesToInsert = [];
  friends.forEach((list, i) => {
    list.forEach((j) => {
      valuesToInsert.push(`(${i + 1}, ${j + 1})`);
    });
  });
  const query = `INSERT INTO Friends (userId, friendId) VALUES ${valuesToInsert.join(', ')};`;
  await db.run(query);

  // create indexes after inserts, it will significantly speed up the search query
  console.log("Create indexes");
  await db.all(`CREATE INDEX user_index ON Friends (userId);`);
  await db.all(`CREATE INDEX user_id_index ON Users (id);`);
  await db.all(`CREATE INDEX user_name_index ON Users (name);`);

  console.log("Ready.");
}

module.exports.init = init;

const search = async (req, res) => {
  const query = req.params.query;
  const userId = parseInt(req.params.userId);

  // to determine the friend of a friend, I used a recursive sql query. Also used union, code is much more readable this way
  const friendLevel = 2;
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
      rc.connectionLevel < ${friendLevel}
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

  await db.all(`INSERT INTO Friends (userId, friendId) VALUES (${friendId}, ${userId});`);
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

  await db.all(`DELETE FROM Friends WHERE userId = ${friendId} and friendId = ${userId};`);
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