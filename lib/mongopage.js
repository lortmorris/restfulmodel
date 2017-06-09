import Debug from 'debug';

const debug = Debug('lib:paginate');

const privPaginate = collection => (query, fields, options) => {
  debug('paginate called');

  return new Promise((resolve, reject) => {
    const page = options.page || 1;
    let count = 0;
    let totalPages = 0;
    const defaultLimit = 30;
    const sort = options.sort;

    collection.count(query || {}, (err, doc) => {
      if (err) return reject(err);
      count = doc;

      totalPages = Math.floor(count / (options.limit || defaultLimit)) + ((count % (options.limit || defaultLimit) ) > 0 ? 1 : 0);

      return collection.find(query, fields)
      .sort(sort)
      .skip((options.limit || defaultLimit) * (page - 1))
      .limit(options.limit || defaultLimit, (err2, docs) => {
        if (err2) return reject(err2);
        return resolve({ docs, limit: (options.limit || defaultLimit), count, page, totalPages });
      });
    });
  }); // end promise
};


const paginate = (db) => {
  debug('.paginate constructor called');

  db.getCollectionNames((err, collections) => {
    if (err) return;
    collections.forEach((c) => {
      debug(`setting paginate to ${c}`);
      db[c].paginate = privPaginate(c);
    });
  });
};


module.exports = paginate;
