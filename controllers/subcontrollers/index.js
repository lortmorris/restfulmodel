
const debug = require('debug')('controllers:subcontrollers:index');

const subcontrollers = {

};

function processSubControllers(apiPath, action, main, params, response){
  debug('processSubControllers '+apiPath+' : '+action+' : '+JSON.stringify(params));

  if( apiPath in subcontrollers && action in subcontrollers[apiPath]){
    debug('property exists');
    return subcontrollers[apiPath][action](main, params, response);
  }else{
    debug('property NOT exists');
    return Promise.resolve(params);
  }
}

module.exports = processSubControllers;
