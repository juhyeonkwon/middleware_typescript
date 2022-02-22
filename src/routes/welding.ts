import express from 'express';
import mariadb from 'mariadb';
import { RedisClientOptions, createClient } from 'redis';

const auth: any = require('../modules/auth');
const dbconfig: any = require('../dbconfig');

//소켓을 위한 app
const app: any = require('../server');



const router: express.Router = express.Router();

//gbs03 값 입력받는다
router.post('/gbs03/measure', async function (req: express.Request, res: express.Response) {
    //레디스 세팅
    const client = createClient({
        url: 'redis://:1234@192.168.0.21:6379',
    });

    let param: Array<any> = [req.body.eqp_id, req.body.date, req.body.acquisition_rate, req.body.welding_time, req.body.avg_amp, req.body.avg_volt, req.body.avg_welding_volt, req.body.avg_wirespeed, req.body.sum_wire, req.body.sum_inching_wire, req.body.sum_total_wire];

    let sql: string = 'INSERT INTO gbs03_measure(eqp_id, date, acquisition_rate, welding_time, avg_amp, avg_volt, avg_welding_volt, avg_wirespeed, sum_wire, sum_inching_wire, sum_total_wire) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ? )';

    mariadb
        .createConnection(dbconfig.mariaConf)
        .then(async (connection: any) => {
            try {
                let rows = await connection.query(sql, param);

                res.send(rows);

                await client.connect();

                let reply: any = client.GET(param[1] + '_watt_' + 'gbs03');
                let watt = parseFloat(req.body.avg_amp) * parseFloat(req.body.avg_welding_volt);
                if (reply === null) {
                    await client.SET(param[1] + '_watt_' + 'gbs03', watt);
                } else {
                    watt = watt + parseFloat(reply);
                    await client.SET(param[1] + '_watt_' + 'gbs03', watt);
                }

            } catch (e: any) {
                res.send(e);
            } finally {
                connection.end();
                await client.disconnect();

            }
        })
        .catch((err: any) => {
            console.log(err);
            res.send(err);
        });
});

//gbs의 현재상태
router.get('/gbs03/current', auth.auth, function (req: express.Request, res: express.Response) {
    mariadb.createConnection(dbconfig.mariaConf).then(async (connection) => {
        let sql: string = 'SELECT eqp_id, CAST(last_timestamp AS CHAR) as last_timestamp, use_yn, department, CAST(start_time AS CHAR) as start_time, CAST(end_time AS CHAR) as end_time FROM gbs03';

        try {
            let rows: any = await connection.query(sql);

            res.send(rows);
        } catch (e: any) {
            res.status(401).json({ error: 'db error' });
        } finally {
            connection.end();
        }
    });
});

//gbs03의 측정정보들을 가져온다
router.get('/gbs03/measure', auth.auth, function (req: express.Request, res: express.Response) {
    let eqp_id: string = <string>req.query.eqp_id;

    mariadb.createConnection(dbconfig.mariaConf).then(async (connection: mariadb.Connection) => {
        let sql: string = 'SELECT idx, eqp_id, CAST(date AS CHAR) as date, acquisition_rate, welding_time, avg_amp, avg_volt, avg_welding_volt, avg_wirespeed, sum_wire, sum_inching_wire, sum_total_wire FROM gbs03_measure WHERE eqp_id = ?';

        try {
            let rows: any = await connection.query(sql, [eqp_id]);

            res.send(rows);
        } catch (e: any) {
            res.status(401).json({ error: 'db error' });
        } finally {
            connection.end();
        }
    });
});

router.get('/gbs03/average', auth.auth, function (req: express.Request, res: express.Response) {
    let eqp_id: string = <string>req.query.eqp_id;

    mariadb.createConnection(dbconfig.mariaConf).then(async (connection) => {
        let sql: string =
            'SELECT eqp_id, avg(acquisition_rate) AS acquisition_rate, avg(welding_time) AS welding_time, AVG(avg_amp) AS avg_amp, AVG(avg_volt) AS avg_volt, AVG(avg_welding_volt) AS avg_welding_volt, AVG(avg_wirespeed) AS avg_wirespeed , AVG(sum_wire) AS sum_wire, AVG(sum_inching_wire) AS sum_inching_wire, AVG(sum_total_wire) AS sum_total_wire FROM gbs03_measure where eqp_id = ? GROUP BY eqp_id';

        try {
            let rows: any = await connection.query(sql, [eqp_id]);

            res.send(rows);
        } catch (err: any) {
            console.log(err);
            res.status(401).json({ error: 'db error' });
        } finally {
            connection.end();
        }
    });
});

router.post('/tbar/measure', function (req: express.Request, res: express.Response) {
    //레디스 세팅
    const client = createClient({
        url: 'redis://:1234@192.168.0.21:6379',
    });
    let param: Array<any> = [req.body.eqp_id, req.body.date, req.body.acquisition_rate, req.body.welding_time, req.body.avg_amp, req.body.avg_volt, req.body.avg_welding_volt, req.body.avg_wirespeed, req.body.sum_wire, req.body.sum_inching_wire, req.body.sum_total_wire];

    let sql: string = 'INSERT INTO tbar_measure(eqp_id, date, acquisition_rate, welding_time, avg_amp, avg_volt, avg_welding_volt, avg_wirespeed, sum_wire, sum_inching_wire, sum_total_wire) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ? )';

    mariadb
        .createConnection(dbconfig.mariaConf)
        .then(async (connection: mariadb.Connection) => {
            try {
                let rows: any = await connection.query(sql, param);

                res.send(rows);

                await client.connect();

                let reply: any = await client.GET(param[1] + '_watt_' + 'tbar');
                let watt: number = parseFloat(req.body.avg_amp) * parseFloat(req.body.avg_welding_volt);
                if (reply === null) {
                    await client.SET(param[1] + '_watt_' + 'tbar', watt);
                } else {
                    watt = watt + parseFloat(reply);
                    await client.SET(param[1] + '_watt_' + 'tbar', watt);
                }

                await client.disconnect();
            } catch (e: any) {
                res.send(e);
            } finally {
                connection.end();
            }
        })
        .catch((err: any) => {
            console.log(err);
            res.send(err);
        });
});

router.get('/tbar/current', auth.auth, function (req: express.Request, res: express.Response) {
    mariadb.createConnection(dbconfig.mariaConf).then(async (connection: mariadb.Connection) => {
        let sql: string = 'SELECT eqp_id, CAST(last_timestamp AS CHAR) as last_timestamp, use_yn, department, CAST(start_time AS CHAR) as start_time, CAST(end_time AS CHAR) as end_time FROM tbar';

        try {
            let rows: any = await connection.query(sql);

            res.send(rows);
        } catch (e: any) {
            res.status(401).json({ error: 'db error' });
        } finally {
            connection.end();
        }
    });
});

router.get('/tbar/measure', auth.auth, function (req: express.Request, res: express.Response) {
    let eqp_id: string = <string>req.query.eqp_id;

    mariadb.createConnection(dbconfig.mariaConf).then(async (connection: mariadb.Connection) => {
        let sql: string = 'SELECT idx, eqp_id, CAST(date AS CHAR) as date, acquisition_rate, welding_time, avg_amp, avg_volt, avg_welding_volt, avg_wirespeed, sum_wire, sum_inching_wire, sum_total_wire FROM tbar_measure WHERE eqp_id = ?';

        try {
            let rows: any = await connection.query(sql, [eqp_id]);

            res.send(rows);
        } catch (e: any) {
            res.status(401).json({ error: 'db error' });
        } finally {
            connection.end();
        }
    });
});

router.get('/tbar/average', auth.auth, function (req: express.Request, res: express.Response) {
    let eqp_id: string = <string>req.query.eqp_id;

    mariadb.createConnection(dbconfig.mariaConf).then(async (connection: mariadb.Connection) => {
        let sql: string =
            'SELECT eqp_id, avg(acquisition_rate) AS acquisition_rate, avg(welding_time) AS welding_time, AVG(avg_amp) AS avg_amp, AVG(avg_volt) AS avg_volt, AVG(avg_welding_volt) AS avg_welding_volt, AVG(avg_wirespeed) AS avg_wirespeed , AVG(sum_wire) AS sum_wire, AVG(sum_inching_wire) AS sum_inching_wire, AVG(sum_total_wire) AS sum_total_wire FROM tbar_measure where eqp_id = ? GROUP BY eqp_id';

        try {
            let rows: any = await connection.query(sql, eqp_id);

            res.send(rows);
        } catch (err: any) {
            res.status(401).json({ error: 'db error' });
        } finally {
            connection.end();
        }
    });
});

router.get('/using', auth.auth, function (req: express.Request, res: express.Response) {
    mariadb.createConnection(dbconfig.mariaConf).then(async (connection: mariadb.Connection) => {
        let sql: string =
            'SELECT eqp_id, CAST(last_timestamp AS CHAR) as last_timestamp, use_yn, department, type, CAST(start_time AS CHAR) as start_time, CAST(end_time AS CHAR) as end_time FROM gbs03 WHERE use_yn = 1 UNION SELECT eqp_id, CAST(last_timestamp AS CHAR) as last_timestamp, use_yn, department, type, CAST(start_time AS CHAR) as start_time, CAST(end_time AS CHAR) as end_time FROM tbar WHERE use_yn = 1 ';

        try {
            let rows: any = await connection.query(sql);

            res.send(rows);
        } catch (e: any) {
            console.log(e);
            res.status(401).json({ error: 'db error' });
        } finally {
            connection.end();
        }
    });
});

//사용량을 확인합니다람쥐..
router.get('/usage', auth.auth, async function (req: express.Request, res: express.Response) {
    //레디스 세팅
    const client = createClient({
        url: 'redis://:1234@192.168.0.21:6379',
    });
    let type: string;
    if (req.query.type === 'tbar') {
        type = 'tbar';
    } else {
        type = 'gbs03';
    }

    let today: Date = new Date();
    let month: string | number = today.getMonth() + 1 < 10 ? '0' + (today.getMonth() + 1) : today.getMonth() + 1;
    let day: string | number = today.getDate() < 10 ? '0' + today.getDate() : today.getDate();
    let date: string = today.getFullYear() + '-' + month + '-' + day;

    await client.connect();
    let reply: any = await client.GET('welding_' + type + '_' + date);
    if (reply === null) {
        res.send('{}');
    } else {
        let json = JSON.parse(reply);

        res.send(json);
    }
    await client.disconnect();
});

//일주일간 전력 사용량 확인
router.get('/watts', auth.auth, async function (req: express.Request, res: express.Response) {
    //레디스 세팅
    const client = createClient({
        url: 'redis://:1234@192.168.0.21:6379',
    });
    let type: string = <string>req.query.type;
    let today: Date = new Date();

    // today.setHours(today.getHours() + 9);

    function toStr(date: Date): string {
        function zeroNumber(num: number): string | number {
            if (num < 10) {
                return '0' + num;
            } else {
                return num;
            }
        }

        return date.getFullYear() + '-' + zeroNumber(date.getMonth() + 1) + '-' + zeroNumber(date.getDate());
    }

    let keys: Array<any> = [];

    keys.push(toStr(today));

    for (let i = 0; i < 6; i++) {
        today.setDate(today.getDate() - 1);

        keys.push(toStr(today));
    }

    let rows: Array<any> = [];

    await client.connect();

    for (let i = 0; i < keys.length; i++) {
        let reply: any = await client.GET(keys[i] + '_watt_' + type);
        if (reply === null || reply === NaN) {
            rows.push({ date: keys[i], amount: 0 });
        } else {
            rows.push({ date: keys[i], amount: parseFloat(reply) });
        }

        if (i == 6) {
            res.send(rows);
            await client.disconnect();
        }
    }
});

//일주일간 전력 사용량 확인
router.get('/watts/rank', auth.auth, function (req: express.Request, res: express.Response) {
    let type: string = <string>req.query.type;
    let today: Date = new Date();
    today.setDate(today.getDate() - 1);

    let sql: string;

    if (type === 'gbs03') {
        sql = 'SELECT eqp_id, CAST(date AS CHAR) as date, acquisition_rate, welding_time, avg_amp, avg_volt, avg_amp * avg_volt AS watt, avg_welding_volt, avg_wirespeed, sum_wire, sum_inching_wire, sum_total_wire FROM gbs03_measure g WHERE g.date = ? ORDER BY watt DESC LIMIT 10';
    } else {
        sql = 'SELECT eqp_id, CAST(date AS CHAR) as date, acquisition_rate, welding_time, avg_amp, avg_volt, avg_amp * avg_volt AS watt, avg_welding_volt, avg_wirespeed, sum_wire, sum_inching_wire, sum_total_wire FROM tbar_measure g WHERE g.date = ? ORDER BY watt DESC LIMIT 10';
    }

    function toStr(date: Date): string {
        function zeroNumber(num: number): string | number {
            if (num < 10) {
                return '0' + num;
            } else {
                return num;
            }
        }

        return date.getFullYear() + '-' + zeroNumber(date.getMonth() + 1) + '-' + zeroNumber(date.getDate());
    }

    let paramDate: string = toStr(today);

    mariadb.createConnection(dbconfig.mariaConf).then(async (connection: mariadb.Connection) => {
        try {
            let rows: any = await connection.query(sql, [paramDate]);

            res.send(rows);
        } catch (e: any) {
            console.log(e);
            res.status(401).json({ error: 'db error' });
        } finally {
            connection.end();
        }
    });
});

//대여
router.put('/rent', auth.auth, async function (req: express.Request, res: express.Response) {
    //레디스 세팅
    const client = createClient({
        url: 'redis://:1234@192.168.0.21:6379',
    });
    //파라미터로 tbar인지 gbs03인지 여부를 받는다

    let sql: string, sql2: string, type: string;
    if (req.body.type === 'tbar') {
        sql = 'UPDATE tbar set use_yn = 1, department = (SELECT department FROM users WHERE user_id = ?), start_time = ?, end_time = ? where eqp_id = ?';
        sql2 = 'SELECT eqp_id, CAST(last_timestamp AS CHAR) as last_timestamp, use_yn, department, CAST(start_time AS CHAR) as start_time, CAST(end_time AS CHAR) as end_time FROM tbar where eqp_id = ?';
        type = 'tbar';
    } else {
        sql = 'UPDATE gbs03 set use_yn = 1, department = (SELECT department FROM users WHERE user_id = ?), start_time = ?, end_time = ? where eqp_id = ?';
        sql2 = 'SELECT eqp_id, CAST(last_timestamp AS CHAR) as last_timestamp, use_yn, department, CAST(start_time AS CHAR) as start_time, CAST(end_time AS CHAR) as end_time FROM gbs03 where eqp_id = ?';
        type = 'gbs03';
    }

    let id: string = await auth.verifynotasync((<string>req.headers.authorization).split('Bearer ')[1]).id;

    const param = [id, req.body.start_time, req.body.end_time, req.body.eqp_id];

    mariadb.createConnection(dbconfig.mariaConf).then(async (connection: mariadb.Connection) => {
        try {
            let rows: any = await connection.query(sql, param);

            if (rows.affectedRows != 1) {
                res.send({ status: -1 });
            } else {
                res.send(rows);
            }

            let rows2: any = await connection.query(sql2, [req.body.eqp_id]);

            req.app.get('io').emit('rent_welding', rows2);

            const key = req.body.start_time.split(' ')[0];

            await client.connect();

            let reply: any = await client.GET('welding_' + type + '_' + key);
            let eqp_id: string = <string>req.body.eqp_id;

            if (reply === null) {
                let tempjson: any = {};
                tempjson[eqp_id + ''] = 1;
                await client.SET('welding_' + type + '_' + key, JSON.stringify(tempjson));
            } else {
                let json: any = JSON.parse(reply);

                if (json[eqp_id + ''] === undefined) {
                    json[eqp_id + ''] = 1;
                } else {
                    json[eqp_id + ''] = json[eqp_id + ''] + 1;
                }
                await client.SET('welding_' + type + '_' + key, JSON.stringify(json));
            }

            await client.disconnect();
        } catch (e: any) {
            res.send({ status: -1 });
        } finally {
            connection.end();
        }
    });
});

router.put('/return', auth.auth, async function (req: express.Request, res: express.Response) {
    //파라미터로 tbar인지 gbs03인지 여부를 받는다

    let sql: string, sql2: string;
    if (req.body.type === 'tbar') {
        sql = "UPDATE tbar set use_yn = 0, department = '', start_time = null, end_time = null where eqp_id = ?";
        sql2 = 'SELECT eqp_id, CAST(last_timestamp AS CHAR) as last_timestamp, use_yn, department FROM tbar where eqp_id = ?';
    } else {
        sql = "UPDATE gbs03 set use_yn = 0, department = '', start_time = null, end_time = null where eqp_id = ?";
        sql2 = 'SELECT eqp_id, CAST(last_timestamp AS CHAR) as last_timestamp, use_yn, department FROM gbs03 where eqp_id = ?';
    }

    const param: Array<any> = [req.body.eqp_id];

    mariadb.createConnection(dbconfig.mariaConf).then(async (connection: mariadb.Connection) => {
        try {
            let rows: any = await connection.query(sql, param);

            if (rows.affectedRows != 1) {
                res.send({ status: -1 });
            } else {
                res.send(rows);
            }

            let rows2: any = await connection.query(sql2, [req.body.eqp_id]);

            req.app.get('io').emit('rent_welding', rows2);
        } catch (e: any) {
            res.send({ status: -1 });
        } finally {
            connection.end();
        }
    });
});

router.get('/reservation', function (req: express.Request, res: express.Response) {
    mariadb.createConnection(dbconfig.mariaConf).then(async (connection: mariadb.Connection) => {
        const SQL: string = 'SELECT reserv_id, eqp_id, start_time, end_time, department, type  FROM welding_reservation e WHERE eqp_id = ? AND e.date = ?;';

        let param: Array<any> = [req.query.eqp_id, req.query.date];

        try {
            let rows: any = await connection.query(SQL, param);

            res.send(rows);
        } catch (e: any) {
            res.send(e);
        } finally {
            connection.end();
        }
    });
});

router.post('/reservation', auth.auth, function (req: express.Request, res: express.Response) {
    console.log(req.body);
    //INSERT INTO welding_reservation(eqp_id, date, start_time, end_time, department, type) VALUES ('', '2021-12-07', '15:00', '1:00', '디엑스데이타람쥐');

    mariadb.createConnection(dbconfig.mariaConf).then(async (connection: mariadb.Connection) => {
        let param: Array<any> = [req.body.eqp_id, req.body.date, req.body.start_time, req.body.end_time, req.body.department, req.body.type];

        const SQL: string = 'INSERT INTO welding_reservation(eqp_id, date, start_time, end_time, department, type) VALUES (?, ?, ?, ?, ?, ?)';

        try {
            let rows: any = await connection.query(SQL, param);

            res.send(rows);
        } catch (e: any) {
            res.send(e);
        } finally {
            connection.end();
        }
    });
});

router.delete('/canclereserve', auth.auth, function (req: express.Request, res: express.Response) {
    mariadb.createConnection(dbconfig.mariaConf).then(async (connection: mariadb.Connection) => {
        let param: Array<any> = [req.body.reserv_id];

        const SQL: string = 'DELETE FROM welding_reservation WHERE reserv_id = ?';

        try {
            let rows: any = await connection.query(SQL, param);

            res.send(rows);
        } catch (e: any) {
            res.send(e);
        } finally {
            connection.end();
        }
    });
});

module.exports = router;
