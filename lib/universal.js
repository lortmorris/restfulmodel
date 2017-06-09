'use strict';
const debug = require('debug')('restfulmodel:lib:universalparameters');


const getCollection = endpoint => {
  return endpoint.slice(1);
}


class Universal {
  constructor(main) {
    this.db = main.db;
  }

  search(endpoint, query, pages) {
    let self = this;
    let collection = getCollection(endpoint);

    debug('.search called');
    pages = pages || {};

    return new Promise((resolve, reject)=> {


      let p = {
        limit: pages.limit || 50,
        page: pages.page || 1,
        sorting: pages.sorting
      };


      let fields = {};
      self.db[collection].paginate(pages.q || {}, fields, p)
      .then((docs)=> resolve(docs))
      .catch(err=> reject(err));

    });
  }

  today(endpoint){
    let self = this;
    debug('.today called: ');

    return new Promise((resolve, reject)=>{
      let collection = getCollection(endpoint.replace('/today', ''));

      let p = {
        limit: 500,
        page: 1,
        sorting: '_id:desc'
      };

      let today = new Date();
      today.setHours(0,0,0);
      self.db[collection].paginate({added: {$gte: today}}, {}, p)
      .then((docs)=> resolve(docs))
      .catch(err=> reject(err));
    });//end promise
  }

  insert(endpoint, params) {
    let collection = getCollection(endpoint);
    let self = this;
    params.added = new Date();
    debug('.insert called: '+JSON.stringify(params));

    return new Promise((resolve, reject)=> {
      self.db[collection].insert(params, (err, doc)=> {
        err ? reject(err) : resolve(doc);
      });
    });
  }

  insertOrCount(endpoint, params){
    let collection = getCollection(endpoint);
    params.count = 1;

    return new Promise((resolve, reject)=>{
      let q = {};
      q[params._criterial] = params._unique;
      delete params._criterial;
      delete params._unique;

      this.db[collection].findOne(q,{}, (err, doc)=>{
        if(err) return reject(err);
        if(doc===null){
          this.insert(endpoint, params)
          .then((data)=> resolve(data))
          .catch(err=> reject(err));
        }else{
          this.update(endpoint, doc._id, Object.assign({}, params, {count: doc.count +1 }))
          .then((data)=> resolve(data))
          .catch(err => reject(err));
        }
      })
    });
  }

  remove(endpoint, _id) {
    let collection = getCollection(endpoint);
    let self = this;

    return new Promise((resolve, reject)=> {
      self.db[collection].remove({_id: self.db.ObjectId(_id)}, (err, doc)=> {
        err ? reject(err) : resolve(doc);
      });
    });
  }

  update(endpoint, _id, data) {
    let self = this;
    let collection = getCollection(endpoint);
    data.updated = new Date();

    debug('.update called: '+JSON.stringify(data));
    return new Promise((resolve, reject)=> {
      self.db[collection].update({_id: self.db.ObjectId(_id)}, {$set: data}, (err, doc)=> {
        err ? reject(err) : resolve(doc);
      });
    });
  }
}

module.exports = Universal;
