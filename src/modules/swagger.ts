import swaggerUi from 'swagger-ui-express';
import swaggerJSDoc from 'swagger-jsdoc';

const options: object = {
    swaggerDefinition: {
        openapi: '3.0.0',
        info: {
            title: 'Middleware API',
            version: '0.0.1',
            description: 'DXDATA의 middleware API입니다. DashBoard 링크 : http://dxdata.co.kr:8080/',
        },
        host: 'api.dxdata.co.kr:3333',
        basePath: '/',
        components: {
            securitySchemes: {
                JWT: {
                    type: 'http',
                    scheme: 'bearer',
                },
            },
        },
    },
    apis: ['./routes/*', './swagger/*', './modules/models/*', './modules/models/elecar/*', './modules/models/user/*'],
};

const specs: any = swaggerJSDoc(options);

module.exports = { swaggerUi, specs };