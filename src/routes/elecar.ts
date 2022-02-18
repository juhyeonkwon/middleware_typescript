import express from 'express';
import maria from 'mariadb';
import { RedisClientOptions, createClient } from 'redis';

const auth: any = require('../modules/auth');
const dbconfig: any = require('../dbconfig');

//소켓을 위한 app
const app: any = require('../server');
//레디스 세팅
const client = createClient({
    url: 'redis://:1234@192.168.0.21:6379',
});

const router: express.Router = express.Router();

router.get('/current', auth.auth, async function (req: express.Request, res: express.Response) {
    try {
        maria.createConnection(dbconfig.mariaConf).then(async (connection) => {
            let rows: any;

            try {
                rows = await connection.query('SELECT eqp_id, current_gps_lon, current_gps_lat, department, CAST(last_timestamp AS CHAR) as last_timestamp, useYN, CAST(start_time AS CHAR) as start_time, CAST(end_time AS CHAR) as end_time FROM elecar where current_gps_lon != 0');
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
});

//elecar의 정보를 가져옵니다.
router.post('/measure', async function (req: express.Request, res: express.Response) {
    maria.createConnection(dbconfig.mariaConf).then(async (connection) => {
        let param: Array<any> = [
            req.body.eqp_id,
            parseFloat(req.body.gps_lon),
            parseFloat(req.body.gps_lat),
            parseInt(req.body.eqp_spec_code.slice(0, 2)),
            req.body.department,
            req.body.req_no.slice(0, 4) + '-' + req.body.req_no.slice(4, 6) + '-' + req.body.req_no.slice(6, 8), //신청 일자(20200812 / 까지)
            req.body.use_date.slice(0, 4) + '-' + req.body.use_date.slice(4, 6) + '-' + req.body.use_date.slice(6, 8), //실제 사용 일자 날짜 까지
            req.body.use_timestamp.slice(0, 4) + '-' + req.body.use_timestamp.slice(4, 6) + '-' + req.body.use_timestamp.slice(6, 8) + ' ' + req.body.use_timestamp.slice(9, 11) + ':' + req.body.use_timestamp.slice(11, 13) + ':' + req.body.use_timestamp.slice(13, 15), //사용 시간 시간까지 다
        ];

        let rows: any;

        try {
            rows = await connection.query('INSERT INTO elecar_measure(eqp_id, gps_lon, gps_lat, eqp_spec_code, department, req_no, use_date, use_timestamp) VALUES (?, ?, ?, ?, ?, ?, ?, ?)', param);

            //실시간 업데이트 다람쥐..
            let row2: any = await connection.query('UPDATE elecar set current_gps_lon = ?, current_gps_lat = ?, department = ?, last_timestamp= ?, useYN = 1 WHERE eqp_id = ?', [param[1], param[2], param[4], param[7], param[0]]);

            req.app.get('io').emit('new_elecar', param);

            await client.connect();

            const key: string = req.body.eqp_id + '_' + req.body.use_timestamp.slice(0, 4) + '-' + req.body.use_timestamp.slice(4, 6) + '-' + req.body.use_timestamp.slice(6, 8);

            let data: string = JSON.stringify({
                gps_lon: req.body.gps_lon,
                gps_lat: req.body.gps_lat,
                use_timestamp: req.body.use_timestamp.slice(0, 4) + '-' + req.body.use_timestamp.slice(4, 6) + '-' + req.body.use_timestamp.slice(6, 8) + ' ' + req.body.use_timestamp.slice(9, 11) + ':' + req.body.use_timestamp.slice(11, 13) + ':' + req.body.use_timestamp.slice(13, 15),
            });

            await client.LPUSH(key, data);

            await client.disconnect();
        } catch (e: any) {
            console.log(e);
        } finally {
            res.send(rows);
            connection.end();
        }
    });
});

//elecar의 상세정보를 불러옵니다
router.get('/locations', async function (req: express.Request, res: express.Response) {
    let key: string = <string>req.query.key;

    await client.connect();

    let reply: any = await client.LRANGE(key, 0, -1);

    res.send(JSON.parse('[' + reply + ']'));

    await client.disconnect();
});

//현재 사용중인 고소차들의 위치를 보여줍니다.
router.get('/usinglocation', function (req: express.Request, res: express.Response) {
    //SELECT eqp_id, current_gps_lon, current_gps_lat FROM elecar WHERE useYN = 1;
    maria.createConnection(dbconfig.mariaConf).then(async (connection) => {
        let rows: any;
        try {
            rows = await connection.query('SELECT eqp_id, current_gps_lon, current_gps_lat FROM elecar WHERE useYN = 1');
        } catch (e: any) {
            rows = e;
        }
        res.send(rows);

        connection.end();
    });
});

//고소차 대여
router.post('/rent', auth.auth, function (req: express.Request, res: express.Response) {
    maria.createConnection(dbconfig.mariaConf).then(async (connection) => {
        const param: Array<any> = [await auth.verifynotasync((<string>req.headers.authorization).split('Bearer ')[1]).id, req.body.start_time, req.body.end_time, req.body.eqp_id];

        let SQL: string = 'UPDATE elecar SET useYN = 1, department = (SELECT department FROM users WHERE user_id = ?), start_time = ?, end_time = ? WHERE eqp_id = ?';

        try {
            let rows: any = await connection.query(SQL, param);

            let param2: Array<any> = [req.body.eqp_id];

            let rows2: any = await connection.query('SELECT eqp_id, current_gps_lon, current_gps_lat, department, CAST(last_timestamp AS CHAR) as last_timestamp, useYN, CAST(start_time AS CHAR) as start_time, CAST(end_time AS CHAR) as end_time FROM elecar WHERE eqp_id = ?', param2);

            await connection.query('INSERT INTO elecar_history(eqp_id, department, date) VALUES (?, (SELECT department FROM users WHERE user_id = ?), ?)', [req.body.eqp_id, param[0], req.body.start_time]);

            req.app.get('io').emit('update_elecar', rows2);

            const key: string = req.body.start_time.split(' ')[0];

            await client.connect();

            let reply: any = await client.GET('elecar_' + key);
            if (reply === null) {
                await client.SET('elecar_' + key, '1');
            } else {
                let num = parseInt(reply) + 1;

                await client.SET('elecar_' + key, num + '');
            }

            await client.disconnect();

            res.send(rows);
        } catch (e: any) {
            console.log(e);
            res.send(e);
        } finally {
            connection.end();
        }
    });
});

//고소차 반납
router.post('/return', auth.auth, function (req: express.Request, res: express.Response) {
    maria.createConnection(dbconfig.mariaConf).then(async (connection) => {
        const param: Array<any> = [req.body.eqp_id];

        let SQL: string = "UPDATE elecar SET useYN = 0, department = '', start_time = null, end_time = null WHERE eqp_id = ?";

        try {
            let rows: any = await connection.query(SQL, param);

            let rows2: any = await connection.query('SELECT eqp_id, current_gps_lon, current_gps_lat, department, CAST(last_timestamp AS CHAR) as last_timestamp, useYN, CAST(start_time AS CHAR) as start_time, CAST(end_time AS CHAR) as end_time FROM elecar WHERE eqp_id = ?', param);

            req.app.get('io').emit('update_elecar', rows2);

            res.send(rows);
        } catch (e: any) {
            console.log(e);
            res.send(e);
        } finally {
            connection.end();
        }
    });
});

router.get('/reservation', function (req: express.Request, res: express.Response) {
    console.log(req.query.eqp_id);
    console.log(req.query.date);

    maria.createConnection(dbconfig.mariaConf).then(async (connection) => {
        const SQL: string = 'SELECT reserv_id, eqp_id, start_time, end_time, department  FROM elecar_reservation e WHERE eqp_id = ? AND e.date = ?;';

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

//예약
router.post('/reservation', auth.auth, function (req: express.Request, res: express.Response) {
    //INSERT INTO elecar_reservation(eqp_id, date, start_time, end_time, department) VALUES ('N-229', '2021-12-07', '15:00', '1:00', '디엑스데이타람쥐');

    maria.createConnection(dbconfig.mariaConf).then(async (connection) => {
        let param: Array<any> = [req.body.eqp_id, req.body.date, req.body.start_time, req.body.end_time, req.body.department];

        const SQL: string = 'INSERT INTO elecar_reservation(eqp_id, date, start_time, end_time, department) VALUES (?, ?, ?, ?, ?)';

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

//예약취소
router.delete('/canclereserve', auth.auth, function (req: express.Request, res: express.Response) {
    maria.createConnection(dbconfig.mariaConf).then(async (connection) => {
        let param: Array<any> = [req.body.reserv_id];

        const SQL: string = 'DELETE FROM elecar_reservation WHERE reserv_id = ?';

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

router.get('/usage', async function (req: express.Request, res: express.Response) {
    let today: Date = new Date();

    // today.setHours(today.getHours() + 9);

    function toStr(date: Date): string {
        function zeroNumber(num: Number): Number | string {
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
        let reply: any = await client.GET('elecar_' + keys[i]);
        if (reply === null || reply === NaN) {
            rows.push({ date: keys[i], amount: 0 });
        } else {
            rows.push({ date: keys[i], amount: parseInt(reply) });
        }

        if (i == 6) {
            res.send(rows);
        }
    }

    await client.disconnect();
});

module.exports = router;
