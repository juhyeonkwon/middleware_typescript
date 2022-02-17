/**
 * server.ts
 * DXDATA의 middleware solution을 ts로 다시 작성합니다.
 *
 * date : 2022-02-16
 * author : juhyeonkwon (dxdata)
 *
 */

import express from 'express';
import { createServer } from 'http';
import logger from 'morgan';
import fs from 'fs';
import path from 'path';
import cors from 'cors';
import swaggerUi from 'swagger-ui-express';
import YAML from 'yamljs';

// const { swaggerUi, specs } = require('./modules/swagger');

const app: express.Application = express();

const specs = YAML.load(path.join(__dirname, '../build.yaml'));

app.use('/swagger', swaggerUi.serve, swaggerUi.setup(specs));

const server = createServer(app);

const io = require('socket.io')(server, {
    allowEIO3: true,
    cors: {
        origin: '*', //나중에 서비스 할 때 origin을 변경해줘야 합니다 (cors문제)
        methods: ['GET', 'POST'],
        credentials: true,
        allowEIO3: true,
    },
    transport: ['websocket'],
});

//cors 설정
app.use(cors({ origin: '*' }));
app.set('io', io);

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'jade');

//log setting
let accessLogStream: fs.WriteStream = fs.createWriteStream(path.join(__dirname, 'access.log'), { flags: 'a' });

app.use(express.static(path.join(__dirname, 'public')));
app.use(logger('dev'));
app.use(logger('combined', { stream: accessLogStream }));

app.use(express.json());
app.use(express.urlencoded({ extended: false }));

let elecar: express.Router = require('./routes/elecar');

let auth: express.Router = require('./routes/user');

app.use('/elecar', elecar);
app.use('/auth', auth);

server.listen('3000', () => {
    console.log('port 3000');
});
