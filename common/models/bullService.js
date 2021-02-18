var co = require('co') 
const promisify = require("es6-promisify")  
const APIConst = require('./apiConst.js')
var Queue = require('bull')

var BullService = (function () {
  var instance;

  function init() {
    var redisURL = "redis://"+APIConst.REDIS_SERVER+":"+APIConst.REDISPORT
    var opLogQueue = new Queue('opLog', redisURL);    
    return {
        opLogQueue,
    }
  }

  return {
    getInstance: function () {
      if ( !instance ) {
        instance = init();
      }
      return instance;
    }
  };

})();

module.exports = BullService;