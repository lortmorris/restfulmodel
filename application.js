import express from 'express';
import http from 'http';
import swaggerTools from 'swagger-tools';
import yaml from 'js-yaml';
import path from 'path';
import fs from 'fs';
import helmet from 'helmet';
import compression from 'compression';
import mongojs from 'mongojs';
import Debug from 'debug';
import paginate from './lib/mongopage';
import Universal from './lib/universal';
import Controllers from './controllers';

const debug = Debug('restfulmodel:app');
/**
 * Build the main application
 * @param {object} config - The module config
 * @returns {Promise}
 * @author César Casas
 */

class App {
  constructor(config) {
    debug('init....');
    this.main = {
      config,
      db: mongojs(config.get('db.host'), config.get('db.collections')),
      restEndpoint: config.get('service.protocol') + config.get('service.host') + config.get('service.pathname'),
    };

    paginate(this.main.db);
    return new Promise((resolve, reject) => {
      this.swaggerDoc()
      .then(() => this.getApp())
      .then(() => this.libs())
      .then(() => this.controllers())
      .then(() => this.routers())
      .then(() => resolve(this.main))
      .catch(err => reject(err));
    });
  }

  swaggerDoc() {
    debug('running swaggerDoc');

    return new Promise((resolve) => {
      const swaggerFile = path.join(__dirname, '/api/swagger/swagger.yaml');
      const swaggerString = fs.readFileSync(swaggerFile, 'utf8');
      const swaggerDoc = yaml.safeLoad(swaggerString);

      swaggerDoc.host = this.main.config.get('service.host');
      swaggerDoc.basePath = this.main.config.get('service.pathname');
      this.main.swaggerDoc = swaggerDoc;
      resolve({ swaggerDoc });
    });
  }

  getApp() {
    debug('getApp...');
    return new Promise((resolve) => {
      this.main.app = express();
      this.main.app.set('trust proxy', 1);

      this.main.app.use(helmet());
      this.main.app.use(compression());

      this.main.server = http.createServer(this.main.app);
      resolve({ app: this.main.app, server: this.main.server });
    });
  }

  libs() {
    return new Promise((resolve) => {
      this.main.libs = {};
      this.main.libs.http = http;
      this.main.libs.Universal = new Universal(this.main);
      resolve(this.main.libs);
    });
  }

  controllers() {
    debug('controllers...');
    return new Promise((resolve) => {
      this.main.controllers = Controllers(this.main);
      resolve(this.main.controllers);
    });
  }

  routers() {
    debug('routers...');

    return new Promise((resolve) => {
      const app = this.main.app;
      const options = {
        controllers: this.main.controllers,
      };

      app.set('basePath', this.main.swaggerDoc.basePath);

      const formatValidationError = (req, res, next, err) => {
        const error = {
          code: 'validation_error',
          message: err.message,
          details: err.results ? err.results.errors : null,
        };

        res.json({ error });
      };


      const initMiddleWare = (middleware, callback) => {
        debug('initializating middleware');

        app.use((req, res, next) => {
          res.setHeader('Access-Control-Allow-Origin', '*');
          res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, PATCH, DELETE');
          res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, Content-Length, X-Requested-With');
          res.setHeader('Access-Control-Allow-Credentials', true);

          if (req.method === 'OPTIONS') return res.end();


          if (req.headers && req.headers['x-forwarded-for']) {
            const parts = req.headers['x-forwarded-for'].split(',');
            req.realip = parts[0];
          } else {
            req.realip = req.ip;
          }
          return next();
        });

        app.use(middleware.swaggerMetadata());
        app.use(middleware.swaggerValidator(), formatValidationError);

        app.use(middleware.swaggerRouter(options));

        app.use((req, res, next, err) => {
          res.status(500);
          res.send(err);
          return res.end();
        });

        app.use(middleware.swaggerUi({
          apiDocs: `${this.main.config.get('service.pathname')}/api-docs`,
          swaggerUi: `${this.main.config.get('service.pathname')}/docs`,
        }));
        app.use(express.static('public'));

        callback();
      };

      swaggerTools.initializeMiddleware(this.main.swaggerDoc, (swaggerMiddleware) => {
        initMiddleWare(swaggerMiddleware, () => resolve());
      });
    });
  }

}

export default App;
