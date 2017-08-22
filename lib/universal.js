const debug = require('debug')('restfulmodel:lib:universalparameters');

const getCollection = endpoint => endpoint.slice(1);

class Universal {
  constructor(main) {
    this.db = main.db;
  }

  search(endpoint, query, pages = {}) {
    const self = this;
    const collection = getCollection(endpoint);
    debug('.search called');

    return new Promise((resolve, reject) => {
      const p = {
        limit: pages.limit || 50,
        page: pages.page || 1,
        sorting: pages.sorting,
      };

      const fields = {};
      self.db[collection].paginate(pages.q || {}, fields, p)
      .then(docs => resolve(docs))
      .catch(err => reject(err));
    });
  }

  today(endpoint) {
    const self = this;
    debug('.today called: ');

    return new Promise((resolve, reject) => {
      const collection = getCollection(endpoint.replace('/today', ''));

      const p = {
        limit: 500,
        page: 1,
        sorting: '_id:desc',
      };

      const today = new Date();
      today.setHours(0, 0, 0);
      self.db[collection].paginate({ added: { $gte: today } }, {}, p)
      .then(docs => resolve(docs))
      .catch(err => reject(err));
    });// end promise
  }

  insert(endpoint, params) {
    const collection = getCollection(endpoint);
    const self = this;
    debug('.insert called: ', JSON.stringify(params));

    return new Promise((resolve, reject) => {
      self.db[collection].insert(Object.assign({}, params, { added: new Date() }), (err, doc) => {
        err ? reject(err) : resolve(doc);
      });
    });
  }

  insertOrCount(endpoint, params) {
    const collection = getCollection(endpoint);
    params.count = 1;

    return new Promise((resolve, reject) => {
      let q = {};
      q[params._criterial] = params._unique;
      delete params._criterial;
      delete params._unique;

      this.db[collection].findOne(q, {}, (err, doc) => {
        if (err) return reject(err);
        if (doc === null) {
          this.insert(endpoint, params)
          .then(data => resolve(data))
          .catch(err2 => reject(err2));
        } else {
          this.update(endpoint, doc._id, Object.assign({}, params, { count: doc.count + 1 }))
          .then(data => resolve(data))
          .catch(err3 => reject(err3));
        }
      });
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
