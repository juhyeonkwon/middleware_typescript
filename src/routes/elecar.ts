import express from 'express';

import mariadb from 'mariadb';

const dbconfig: any = require('../dbconfig');

const router: express.Router = express.Router();

router.get(
  '/current',
  async function (req: express.Request, res: express.Response) {
    try {
      mariadb.createConnection(dbconfig.mariaConf).then(async (connection) => {
        let rows: any;

        try {
          rows = await connection.query(
            'SELECT eqp_id, current_gps_lon, current_gps_lat, department, CAST(last_timestamp AS CHAR) as last_timestamp, useYN, CAST(start_time AS CHAR) as start_time, CAST(end_time AS CHAR) as end_time FROM elecar where current_gps_lon != 0'
          );
        } catch (e: any) {
          rows = e;
        } finally {
          res.send(rows);
          connection.end();
        }
      });
    } catch (e: any) {
      console.log(e);
    }
  }
);

module.exports = router;
