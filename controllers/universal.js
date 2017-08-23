const debug = require('debug')('restfulmodel:controller:universal');
const subcontrollers = require('./subcontrollers');

function Universal(main) {
  debug('init...');
  const db = main.db;
  return {
    insert: (req, res, next) => {
      debug('.insert called');
      const params = req.swagger.params.modeldata.value;
      params.added = new Date();

      subcontrollers(req.swagger.apiPath, 'insertbefore', main, params)
      .then(data => main.libs.Universal.insert(req.swagger.apiPath, data))
      .then(doc => subcontrollers(req.swagger.apiPath, 'insert', main, params, doc))
      .then(dataToResponse => res.json(dataToResponse))
      .catch(err => next(err));
    },

    insertOrCount: (req, res, next) => {
      const params = req.swagger.params.modeldata.value;
      subcontrollers(req.swagger.apiPath, 'insertbefore', main, params)
      .then((data) => {
        return main.libs.Universal
        .insertOrCount(req.swagger.apiPath, data);
      })
      .then(doc => subcontrollers(req.swagger.apiPath, 'insert', main, params, doc))
      .then(dataToResponse => res.json(dataToResponse))
      .catch(err => next(err));
    },
    update: (req, res, next) => {
      debug('.update called');

      const data = req.swagger.params.modeldata.value;
      const _id = data._id;
      delete data._id;

      main.libs.Universal
      .update(req.swagger.apiPath, _id, data)
      .then(result => res.json(result))
      .catch(err => next(err));
    },
    remove: (req, res, next) => {
      debug('.remove called');
      const _id = req.swagger.params._id.value;

      main.libs.Universal
      .remove(req.swagger.apiPath, _id)
      .then(doc => res.json(doc))
      .catch(err => next(err))
    },
    today: (req, res, next) => {
      debug('.today called');
      main.libs.Universal
      .today(req.swagger.apiPath)
      .then(data => res.json(data))
      .catch(err => next(err));
    },
    search: (req, res, next) => {
      debug('.search called');
      let q = req.swagger.params.q.value;
      let sorting = req.swagger.params.sorting.value;
      const page = req.swagger.params.page.value;
      const limit = req.swagger.params.limit.value;

      if (q) {
        const parts = q.split(',');
        q = {};
        parts.forEach((i) => {
          const k = i.split(':');
          if (k.length === 2) {
            if (k[0][0] === '_') q[k[0]] = db.ObjectId(k[1]);
            else q[k[0]] = RegExp(k[1], 'i');
          }
        });
      }

      if (sorting) {
        const parts = sorting.split(':');
        sorting = {};
        if (parts.length === 2) sorting[parts[0]] = (parts[1] === 'desc' ? -1 : 1);
      }


      main.libs.Universal
      .search(req.swagger.apiPath, {}, { page, limit, q, sorting })
      .then(result => res.json(result))
      .catch(err => next(err));
    },
  };
}

module.exports = Universal;
