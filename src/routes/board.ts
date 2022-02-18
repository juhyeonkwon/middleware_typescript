import express from 'express';
import mariadb from 'mariadb';

const auth: any = require('../modules/auth');
const dbconfig: any = require('../dbconfig');

const router: express.Router = express.Router();

router.get('/notice/login', function (req: express.Request, res: express.Response) {
  try {
    mariadb.createConnection(dbconfig.mariaConf).then(async (connection: mariadb.Connection) => {
      try {
        let rows: any = await connection.query('SELECT CAST(date AS CHAR) as date, user_id, title FROM board_notice order by board_idx desc limit 12');

        res.send(rows);
      } catch (e: any) {
        console.log(e);
        res.status(500);
      } finally {
        connection.end();
      }
    });
  } catch (e: any) {
    res.status(500);
  } finally {
    return;
  }
});

router.get('/notice/list', auth.auth, function (req: express.Request, res: express.Response) {
  try {
    mariadb.createConnection(dbconfig.mariaConf).then(async (connection: mariadb.Connection) => {
      try {
        let rows: any = await connection.query('SELECT board_idx, user_id, title, CAST(date AS CHAR) as date FROM board_notice');

        res.send(rows);
      } catch (e: any) {
        console.log(e);
        res.status(500);
      } finally {
        connection.end();
      }
    });
  } catch (e: any) {
    res.status(500);
  } finally {
    return;
  }
});

router.get('/notice', auth.auth, function (req: express.Request, res: express.Response) {
  let query_id: string = <string>req.query.board_idx;

  try {
    mariadb.createConnection(dbconfig.mariaConf).then(async (connection: mariadb.Connection) => {
      try {
        let rows: any = await connection.query('SELECT board_idx, user_id, title, content, CAST(date AS CHAR) as date FROM board_notice WHERE board_idx = ?', [query_id]);

        res.send(rows);
      } catch (e: any) {
        console.log(e);
        res.status(500);
      } finally {
        connection.end();
      }
    });
  } catch (e: any) {
    res.status(500);
  } finally {
    return;
  }
});

router.post('/notice', auth.auth, auth.verifyAdmin, async function (req: express.Request, res: express.Response) {
  let token: string = (<string>req.headers.authorization).split('Bearer ')[1];

  let value: any = await auth.verify(token);

  const param: Array<any> = [value.id, req.body.title, req.body.content, req.body.date];

  try {
    mariadb.createConnection(dbconfig.mariaConf).then(async (connection: mariadb.Connection) => {
      try {
        let rows: any = await connection.query('INSERT INTO board_notice(user_id, title, content, date) VALUES (?, ?, ?, NOW())', param);

        res.send(rows);
      } catch (e: any) {
        console.log(e);
        res.status(500);
      } finally {
        connection.end();
      }
    });
  } catch (e) {
    res.status(500);
  } finally {
    return;
  }
});

router.put('/notice', auth.auth, auth.verifyAdmin, async function (req: express.Request, res: express.Response) {
  let token: string = (<string>req.headers.authorization).split('Bearer ')[1];

  const param: Array<any> = [req.body.title, req.body.content, req.body.board_idx];

  try {
    mariadb.createConnection(dbconfig.mariaConf).then(async (connection: mariadb.Connection) => {
      try {
        let rows: any = await connection.query('UPDATE board_notice SET title = ?, content = ? WHERE board_idx = ?', param);

        res.send(rows);
      } catch (e: any) {
        console.log(e);
        res.status(500);
      } finally {
        connection.end();
      }
    });
  } catch (e: any) {
    res.status(500);
  } finally {
    return;
  }
});

router.delete('/notice', auth.auth, auth.verifyAdmin, async function (req: express.Request, res: express.Response) {
  const param: Array<any> = [req.body.board_idx];

  try {
    mariadb.createConnection(dbconfig.mariaConf).then(async (connection: mariadb.Connection) => {
      try {
        let rows: any = await connection.query('DELETE FROM board_notice WHERE board_idx = ?', param);

        res.send(rows);
      } catch (e: any) {
        console.log(e);
        res.status(500);
      } finally {
        connection.end();
      }
    });
  } catch (e: any) {
    res.status(500);
  } finally {
    return;
  }
});

module.exports = router;
