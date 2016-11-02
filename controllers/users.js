'use strict';
const debug = require('debug')('restfulmodel:controllers:users');

function Users(main) {

	return {
		'search': (req, res, next)=> {

			main.libs.users.search()
				.then((users)=> {
					res.json(users);
				})
				.catch((err)=> {
					next(err);
				});


		},
		'insert': (req, res, next)=> {
			debug('.insert called');
			let user = req.swagger.params.user.value;

			main.libs.users.insert(user)
				.then((u)=> {
					res.json(u);
				})
				.catch((err)=> {
					next(err);
				});
		}
	}
}
module.exports = Users;