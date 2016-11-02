/* eslint-disable semi */

'use strict';


const express = require("express");
const http = require("http");
const socket = require('socket.io');
const swaggerTools = require('swagger-tools');
const path = require('path');
const yaml = require('js-yaml');
const fs = require('fs');
const paginate = require("./lib/mongopage");
const helmet = require('helmet');
const compression = require('compression');
const bodyParser = require('body-parser');
const moment = require('moment');
const debug = require('debug')('restfulmodel:app');
const mongojs = require('mongojs');
const redisSentinel = require('redis-sentinel');
const redis = require('redis');
const Users  = require('./lib/Users');

/**
 * Build the main application
 * @param {object} config - The module config
 * @returns {Promise}
 * @author César Casas
 */
function app(config) {

	var self = this;
	debug("init....");


	self.main = {
		config: config,
		db: mongojs(config.get('db.host'), config.get('db.collections')),
		restEndpoint: config.get('service.protocol') + config.get('service.host') + config.get('service.pathname'),
		sockets: {}
	};


	/*
	 *Inject paginate method for all collections
	 */

	paginate(self.main.db);

	return new Promise((resolve, reject)=> {

		self.swaggerDoc()
			.then(()=> {
				return self.getApp();
			})
			.then(()=> {
				return self.io();
			})
			.then(()=> {
				return self.redisClient();
			})
			.then(()=> {
				return self.announce();
			})
			.then(()=> {
				return self.libs();
			})
			.then(()=> {
				return self.controllers();
			})
			.then(()=> {
				return self.routers();
			})

			.then(()=> {
				debug("Setup finish, run...");
				resolve(self.main);
			})
			.catch((err)=> {
				console.log("Error init: ", err);
			});
	});
}

/**
 * inject swagger doc into main object.
 * @returns {Promise}
 */
app.prototype.swaggerDoc = function () {
	var self = this;

	debug("running swaggerDoc");

	return new Promise((resolve, reject)=> {
		var swaggerFile = path.join(__dirname, '/api/swagger/swagger.yaml');
		var swaggerString = fs.readFileSync(swaggerFile, 'utf8');
		var swaggerDoc = yaml.safeLoad(swaggerString);

		swaggerDoc.host = self.main.config.get('service.host');
		swaggerDoc.basePath = self.main.config.get('service.pathname');

		self.main.swaggerDoc = swaggerDoc;
		resolve({swaggerDoc: swaggerDoc});
	});
}

/**
 * Create the express instance an inject into main property the instance and server (http)
 * @returns {Promise}
 */
app.prototype.getApp = function () {
	var self = this;
	debug("getApp...");

	return new Promise((resolve, reject)=> {
		self.main.app = express();

		/**
		 * Sessions
		 */

		self.main.app.set('trust proxy', 1);

		self.main.app.use(helmet());
		self.main.app.use(compression());

		self.main.server = http.createServer(self.main.app);
		resolve({app: self.main.app, server: self.main.server});
	});
}

/**
 * create socket.io instance and inject into main object
 * @returns {Promise}
 */
app.prototype.io = function () {
	var self = this;

	debug("io...");

	return new Promise((resolve, reject)=> {
		let pathName = self.main.config.get('service.pathname');
		debug(pathName + '/socket.io');
		self.main.io = socket.listen(self.main.server);


		let io = self.main.io;


		io.on('connection', (socket)=> {

			debug("Socket.io connected: " + socket.id);
			self.main.sockets[socket.id] = socket;
			self.main.sockets[socket.created] = new Date();

			socket.on('disconnect', ()=> {
				delete self.main.sockets[socket.id];
			});
		});

		resolve({io: self.main.io});
	});
}

/**
 * create redisClient or sentinel instance, use own redis lib (return sentinel instance or redisClient). Inject the instance into main object.
 * @returns {Promise}
 */
/**
 * create redisClient or sentinel instance, use own redis lib (return sentinel instance or redisClient). Inject the instance into main object.
 * @returns {Promise}
 */
app.prototype.redisClient = function () {
	var self = this;
	debug("redisClient");

	let redisConf = self.main.config.get('redis');


	return new Promise((resolve, reject)=> {

		if (redisConf.hosts.length == 1) self.main.redis = redis.createClient(redisConf.hosts);
		else self.main.redisClient = redis.createClient(self.main.config.get('redis').hosts, self.main.config.get('redis').mastername);
		resolve({redisClient: self.main.redisClient});
	});
}


/**
 * Socket.io emit message. Using into controllers/index.js for wrapHandler
 * @returns {Promise}
 */
app.prototype.announce = function () {
	var self = this;
	debug("announce...");

	return new Promise((resolve, reject)=> {
		self.main.announce = function () {
			var args = Array.prototype.slice.apply(arguments);
			self.main.io.sockets.emit.apply(self.main.io.sockets, args);
		};

		resolve({announce: self.main.announce});
	});
}


/**
 * Create the common lib instances for all REST Application
 * @returns {Promise}
 */
app.prototype.libs = function () {
	var self = this;
	return new Promise((resolve, reject)=> {

		self.main.libs = {};
		self.main.libs.http = http;
		self.main.libs.moment = moment;
		self.main.libs.users = new Users(self.main);

		resolve(self.main.libs);
	});
}

app.prototype.controllers = function () {
	var self = this;
	var controllers = {};

	debug("controllers...");

	return new Promise((resolve, reject)=> {
		self.main.controllers = require('./controllers')(self.main);
		resolve(self.main.controllers);
	});
}


app.prototype.routers = function () {
	var self = this;

	debug("routers...");

	return new Promise((resolve, reject)=> {

		var app = self.main.app;
		var options = {
			controllers: self.main.controllers
		};


		app.set('basePath', self.main.swaggerDoc.basePath);

		var formatValidationError = function formatValidationError(err, req, res, next) {
			var error = {
				code: 'validation_error',
				message: err.message,
				details: err.results ? err.results.errors : null
			};

			res.json({error: error});
		};


		function initMiddleWare(middleware, callback) {
			debug('initializating middleware');

			app.use((req, res, next)=> {
				res.setHeader('Access-Control-Allow-Origin', '*');
				res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, PATCH, DELETE');
				res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, Content-Length, X-Requested-With');
				res.setHeader('Access-Control-Allow-Credentials', true);

				if (req.method === 'OPTIONS') return res.end();


				if (req.headers && req.headers['x-forwarded-for']) {
					let parts = req.headers['x-forwarded-for'].split(",");
					req.realip = parts[0];
				} else {
					req.realip = req.ip;
				}


				next();
			});

			app.use(middleware.swaggerMetadata());
			app.use(middleware.swaggerValidator(), formatValidationError);

			app.use(middleware.swaggerRouter(options));

			app.use((err, req, res, next) => {
				res.status(500);
				res.send(err);
				res.end();
			});

			app.use(middleware.swaggerUi({
				apiDocs: self.main.config.get('service.pathname') + '/api-docs',
				swaggerUi: self.main.config.get('service.pathname') + '/docs'
			}));

			app.use(express.static('public'));

			callback();
		}

		swaggerTools.initializeMiddleware(self.main.swaggerDoc, (swaggerMiddleware) => {
			initMiddleWare(swaggerMiddleware, (err) => {
				resolve();
			});
		});

	});
}

module.exports = app;
