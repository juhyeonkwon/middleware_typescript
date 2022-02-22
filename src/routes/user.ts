import express from 'express';
import mariadb from 'mariadb';
import crypto from 'crypto';

const router: express.Router = express.Router();

const dbconfig: any = require('../dbconfig');
const secret: any = require('../config/secret');
const auth: any = require('../modules/auth');
const jwt: any = require('../modules/auth');

//회원가입
router.post('/signup', async function (req: express.Request, res: express.Response) {
  let SQL: string = 'INSERT INTO users(user_id, user_password, department) VALUES(?, ?, ?) ';

  const password: string = crypto.createHmac('sha256', secret.secretKey).update(req.body.password).digest('hex');

  mariadb.createConnection(dbconfig.mariaConf).then(async (connection) => {
    let rows: any;
    try {
      rows = await connection.query(SQL, [req.body.id, password, req.body.department, req.body.admin]);
    } catch (e: any) {
      rows = e;
    } finally {
      res.send(rows);
      connection.end();
    }
  });
});

//중복 찾기
router.post('/overlap', async function (req: express.Request, res: express.Response) {
  let connection: mariadb.Connection = await mariadb.createConnection(dbconfig.mariaConf);

  const SQL: string = 'SELECT user_id FROM users where user_id = ?';

  let rows: any = await connection.query(SQL, [req.body.id]);

  if (rows.length === 0) {
    res.send('1');
  } else {
    res.send('0');
  }

  connection.end();
});

//로그인
router.post('/login', async function (req: express.Request, res: express.Response) {
  let id: string = req.body.id;

  let param: Array<any> = [id];

  let password: string = crypto.createHmac('sha256', secret.secretKey).update(req.body.password).digest('hex');

  let connection: mariadb.Connection = await mariadb.createConnection(dbconfig.mariaConf);

  let SQL: string = 'SELECT user_id, user_password, department, admin from users where user_id = ?';

  let rows: any;

  try {
    rows = await connection.query(SQL, param);

    if (rows.length === 0) {
      res.send('0');
      return;
    }
  } catch (e: any) {
    console.log(e);
    res.send('-1');
    return;
  }

  //비밀번호가 일치한다면 토큰을 생성해서 토큰을 저장합니다!! 그리고 토큰을 전달합니다람쥐!!!
  if (await checkPassword(<string>rows[0].user_password, password)) {
    const token: string = jwt.generate(req.body.id, rows[0].admin);
    try {
      await connection.query('UPDATE users SET token = ? WHERE user_id = ?', [token, req.body.id]);
      res.send({
        token: token,
        department: rows[0].department,
        admin: rows[0].admin,
      });
    } catch (e: any) {
      console.log(e);
      res.send('-1');
      return;
    } finally {
      connection.end();
    }
  } else {
    connection.end();

    res.send('0');
    return;
  }

  // console.log(jwt.verify(req.body.token))
});

//비밀번호 일치 확인 함수
async function checkPassword(password: string, password2: string) {
  if (password === password2) {
    return true;
  } else {
    return false;
  }
}

//유저 수정
router.put('/modify_auth', auth.auth, auth.verifyAdmin, function (req: express.Request, res: express.Response) {
  mariadb.createConnection(dbconfig.mariaConf).then(async (connection) => {
    let sql: string = 'UPDATE users set department = ?, admin = ? where idx = ?';
    let param: any;

    for (let i = 0; i < req.body.length; i++) {
      param = [req.body[i].department, req.body[i].admin, req.body[i].idx];

      try {
        await connection.query(sql, param);
      } catch (e: any) {
        res.send(e);
        connection.end();
        break;
      } finally {
        if (i === req.body.length - 1) {
          res.status(200).json({ status: 1 });
          connection.end();
        }
      }
    }
  });
});

// 유저 삭제
router.delete('/delete', auth.auth, auth.verifyAdmin, function (req: express.Request, res: express.Response) {
  mariadb.createConnection(dbconfig.mariaConf).then(async (connection) => {
    let sql: string = 'delete from users where user_id = ?';
    let param: Array<any> = [req.body.id];

    let rows: any;

    try {
      rows = await connection.query(sql, param);
      res.status(200).json({ status: 1 });
    } catch (e: any) {
      rows = e;
      res.end(e);
    } finally {
      connection.end();
    }
  });
});

// 사용자가 직접 비밀번호 수정
router.put('/password_user', auth.auth, async function (req: express.Request, res: express.Response) {
  let token: string = (<string>req.headers.authorization).split('Bearer ')[1];

  let value: any = await jwt.verify(token);

  let param: Array<any> = [value.id];

  let password: string = crypto.createHmac('sha256', secret.secretKey).update(req.body.password).digest('hex');

  let connection: mariadb.Connection = await mariadb.createConnection(dbconfig.mariaConf);

  let SQL: string = 'SELECT user_id, user_password from users where user_id = ?';

  let rows: any;

  try {
    rows = await connection.query(SQL, param);

    if (rows.length === 0) {
      res.send('0');
      return;
    }
  } catch (e: any) {
    console.log(e);
    res.send('-1');
    return;
  }

  //비밀번호가 일치한다면 비밀번호를 변경합니다.
  if (await checkPassword(rows[0].user_password, password)) {
    let new_password: string = crypto.createHmac('sha256', secret.secretKey).update(req.body.new_password).digest('hex');

    try {
      await connection.query('UPDATE users SET user_password = ? WHERE user_id = ?', [new_password, value.id]);
      res.send('1');
    } catch (e: any) {
      console.log(e);
      res.send('-1');
    } finally {
      connection.end();
    }
  } else {
    connection.end();
    res.send('0');
    return;
  }
});

router.put('/password_author', auth.auth, auth.verifyAdmin, async function (req: express.Request, res: express.Response) {
  let password: string = crypto.createHmac('sha256', secret.secretKey).update(req.body.password).digest('hex');

  let param: Array<string> = [password, req.body.user_id];

  let connection: mariadb.Connection = await mariadb.createConnection(dbconfig.mariaConf);

  try {
    await connection.query('UPDATE users SET user_password = ? WHERE user_id = ?', param);
    res.send('1');
  } catch (e: any) {
    console.log(e);
    res.send('-1');
  } finally {
    connection.end();
  }
});

router.get('/list', async function (req: express.Request, res: express.Response) {
  mariadb.createConnection(dbconfig.mariaConf).then(async (connection) => {
    let rows: any = await connection.query('SELECT * FROM user_list');

    res.send(rows);
  });
});

router.post('/check', jwt.auth, function(req, res) {
  res.send('1');
})

module.exports = router;
