'use strict';
const debug = require('debug')('restfulmodel:lib:Users');

class Users{
	constructor(main){
		debug('Users instanced');
		this.db = main.db;
	}

	insert(data){
		debug('insert called: '+JSON.stringify(data));
		let self = this;
		return new Promise(( resolve, reject)=>{
			self.db.users.insert(data, (err, doc)=>{
				err? reject(err) : resolve(doc);
			});
		});
	}

	search(query){
		let self = this;
		return new Promise((resolve, reject)=>{
			self.db.users.find({}, {}, (err, docs)=>{
				err ? reject(err) : resolve(docs);
			});
		});
	}
}

module.exports = Users;