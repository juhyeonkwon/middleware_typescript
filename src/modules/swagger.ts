import swaggerUi from 'swagger-ui-express';
import swaggerJSDoc from 'swagger-jsdoc';

const options: any = {
  swaggerDefinition: {
    openapi: '3.0.0',
    info: {
      title: 'Middleware API',
      version: '0.0.1',
      description:
        'DXDATA의 middleware API입니다. DashBoard 링크 : http://dxdata.co.kr:8080/',
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
  apis: [
    './routes/*.ts',
    './routes/*.js',
    './modules/models/*.js',
    './modules/models/elecar/*.js',
    './modules/models/user/*.js',
  ],
};

const specs: any = swaggerJSDoc(options);

console.log(specs);

module.exports = { swaggerUi, specs };
