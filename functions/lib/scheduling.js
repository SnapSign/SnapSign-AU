const index = require('..');

module.exports = {
  scheduleJob: index.scheduleJob || ((spec) => { throw new Error('scheduleJob not implemented'); }),
  cancelJob: index.cancelJob || ((id) => { throw new Error('cancelJob not implemented'); }),
};
