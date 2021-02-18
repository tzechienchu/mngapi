const { join } = require('ramda')

var BullService = require('../../common/models/bullService.js').getInstance()
module.exports = function(app) {
  var opLog = app.models.opLog
  BullService.opLogQueue.process(opLog.makeCreateLogJobFn())  
  BullService.opLogQueue.on('completed',function(job,result){
    job.queue.clean('0','completed')
  })
}