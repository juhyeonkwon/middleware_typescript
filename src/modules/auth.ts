import * as jwt from 'jsonwebtoken';
import mariadb from 'mariadb';
import express from 'express';

const config: any = require('../config/secret');
const dbconfig: any = require('../dbconfig');

module.exports = {
  auth: function (req: express.Request, res: express.Response, next: express.NextFunction) {
    if (req.headers.authorization) {
      const token: string = req.headers.authorization.split('Bearer ')[1];

      jwt.verify(token, config.secretKey, async function (err: any, decoded: any) {
        if (err) {
          res.status(401).json({ error: 'Auth Error' });
        } else {
          //DB에 저장되어있는 토큰이랑 일치 하는지 확인하는 코드
          await mariadb.createConnection(dbconfig.mariaConf).then(async (connection) => {
            let row: any;
            try {
              row = await connection.query('SELECT token from users where user_id = ?', decoded.id);
            } catch (e: any) {
              res.status(401).json({ error: 'Auth Error' });
            } finally {
              connection.end();

              if (row[0].token === token) {
                next();
              } else {
                res.status(401).json({ error: 'Auth Error' });
              }
            }
          });
        }
      });
    } else {
      res.status(401).json({ error: 'Auth Error' });
    }
  },
  //admin 은 0 이면 일반유저, 1이면 어드민임.
  generate: function (id: String, admin: Number) {
    return jwt.sign({ id: id, admin: admin }, config.secretKey);
  },
  verifyAdmin: function (req: express.Request, res: express.Response, next: express.NextFunction) {
    // const authorization: any = req.headers.authorization;

    // const token: any = authorization.split('Bearer ')[1];

    const token: string = (<string>req.headers.authorization).split('Bearer ')[1];

    return jwt.verify(token, config.secretKey, function (err: any, decoded: any) {
      if (err) {
        return err;
      } else {
        if (decoded.admin !== 1) {
          res.status(401).json({ error: 'Auth Error, Not Admin' });
        } else {
          next();
        }
      }
    });
  },
  verify: async function (token: string) {
    return jwt.verify(token, config.secretKey, function (err: any, decoded: any) {
      if (err) {
        return err;
      } else {
        return decoded;
      }
    });
  },
  verifynotasync: function (token: string) {
    return jwt.verify(token, config.secretKey, function (err: any, decoded: any) {
      if (err) {
        return err;
      } else {
        return decoded;
      }
    });
  },
};
