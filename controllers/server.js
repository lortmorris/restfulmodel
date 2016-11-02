/* eslint-disable semi */
"use strict";

const debug = require('debug')("restful:controllers:server");

function Server(main) {
	debug("init...");

	return {
		'time': (req, res, next)=> {
			debug(".time called");


			res.json({
				'date': new Date()
			});
		}

	};
}

module.exports = Server;