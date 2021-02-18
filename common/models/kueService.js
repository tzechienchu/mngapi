var kue = require('kue')
var co = require('co') 
const promisify = require("es6-promisify")  
const APIConst = require('./apiConst.js');
// Priority Level
// {
//     low: 10
//   , normal: 0
//   , medium: -5
//   , high: -10
//   , critical: -15
// };
var KueService = (function () {
  var instance;
  var queue = kue.createQueue({
    prefix: 'queue',
    redis: {
      port: APIConst.REDISPORT,
      host: 'localhost'
    }
  });

  queue
  .on('job enqueue', function(id, type){
      //console.log( 'Job %s got queued of type %s', id, type );
    })
  .on('job complete', function(id, result){
      kue.Job.get(id, function(err, job){
          if (err) return;
          job.remove(function(err){
              if (err) throw err;
              //console.log('removed completed job #%d', job.id);
          });
      });
  });

  function init() {
    var createJob = function(jobType,payload,jobPriority,cb) {
      //console.log("Create : "+jobType)
      var job = queue
                .create(jobType, payload)
                .priority(jobPriority)
                .save(function(err){
                    if (!err) cb(null,job.id);
                    if (err)  cb(err);
                })
    }
    var createWorker = function(jobType,fn) {
      console.log("Create : "+jobType)
      var worker = queue
                   .process(jobType, function(job, done){
                      fn(job, done);
                   });
      return worker
    }  
    var getCount = function(item,cb) {
      // others are inactiveCount activeCount, completeCount, failedCount, delayedCount
      queue[item](function(err, total ) { 
        cb(null,total)
      });      
    }  
    var getIds = function(item,cb) {
      // others are inactiveCount activeCount, completeCount, failedCount, delayedCount
      queue[item](function(err, ids ) { 
        cb(null,ids)
      });      
    }          
    var getCountState = function(cb) {
      co(function*() {
        var ml = ['inactiveCount', 'activeCount', 'completeCount', 'failedCount', 'delayedCount']
        var resp = yield ml.map(function(m) {
          return promisify(getCount)(m)
        })
        cb(null,resp);
      })
      .catch(function(err){
        cb(null,{err:err});
      })
    }
    var getIdsList = function(cb) {
      co(function*() {
        var ml = ['inactive', 'active', 'complete', 'failed', 'delayed']
        var resp = yield ml.map(function(m) {
          return promisify(getCount)(m)
        })
        cb(null,resp);
      })
      .catch(function(err){
        cb(null,{err:err});
      })
    }      
    var getState = function(cb) {
      co(function*() {
        var resp = yield [
          promisify(getIdsList)(),
          promisify(getCountState)(),
        ]
        cb(null,resp)
      })
      .catch(function(err){
        cb(null,{err:err});
      })
    }
    return {
      createJob:createJob,
      createWorker:createWorker,
      getCountState:getCountState,
      getIdsList:getIdsList,
      getState:getState
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

module.exports = KueService;