/* eslint-disable semi */
"use strict";

const debug = require('debug')('restful:controllers:index');

/**
 * Create controllers for Application (swagger)
 */


/**
 * wrap all controllers (redefine the 'next'. If next has argument, throw error (redis and res.json.end).
 * @param {function} handler - The function for controller.
 * @returns {Function} - the wrap function.
 */
function wrapHandler(handler) {
	debug("wrapHandler called");
	return (req, res, next) => {
		try {
			handler(req, res, (err) => {
				if (err) {
					debug(err);

					// send 503 and error as string
					res.status(503).json({
						code: 'controller_error',
						message: typeof(err) === 'string' ? err : err.message
					}).end();
				}
				else {
					next();
				}
			});
		} catch (e) {
			debug(e);

			res.status(503).json({
				code: 'controller_error',
				message: typeof(e) === 'string' ? e : e.message
			}).end();
		}
	};
}


/**
 * each the controllers function and call to wrap function.
 * @param {object} controllers - The controllers list (object)
 * @returns {*}
 */
function wrapControllers(controllers) {
	debug("wrapControllers called");
	for (var k in controllers) {
		debug("setting wrapHandler to: " + k);
		controllers[k] = wrapHandler(controllers[k]);
	}

	return controllers;
}


/**
 * Create and return the controllers Object for swagger & routers.
 * @param {object} main - The main object create by Application instance (app.js)
 * @returns {object} - Controller object
 */
function makeControllers(main) {


	debug("main function called");

	let controllers = {
		'about': require("./about")(main),
		'universal': require('./universal')(main)
	};


	return wrapControllers({
		'about.about_get': controllers.about.about,
		'universal.search_get': controllers.universal.search,
		'universal.insert_put': controllers.universal.insert,
		'universal.remove_delete': controllers.universal.remove,
		'universal.update_patch': controllers.universal.update,
		'universal.today_get': controllers.universal.today,
		'universal.insertorcount_put': controllers.universal.insertOrCount
	}, main.announce);
}


module.exports = makeControllers;
