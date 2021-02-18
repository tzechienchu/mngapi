var co = require('co') 
var moment = require('moment') 
const promisify = require("es6-promisify") 
var Util = require('./NanUtil') 
var APIConst = require('./apiConst.js') 
var LogService = require('./logToS3.js').getInstance()

var fs = require("fs") 
var path = require('path') 

/*
    var params = Util.getFNParams('gym.buildRootGym',gym.buildRootGym,arguments)
    var logObj = {
      opResult:{},
      params:params  
    }
    logObj.opResult = resp
    yield promisify(myKue.createJob)('LOG_OP',logObj,8) 
*/
module.exports = function(opLog) {
  opLog.makeCreateLogJobFn = function() {
    return function(job,done) {
      var now = Util.getUTCTime()
      var obj = {
        method: job.data.params.fnName,
        params: job.data.params.params,
        //opResult: job.data.opResult,
        createDTUTC:now
      }
      console.log(now + '-'+obj.method)
      opLog.create([obj],function(err,resp) {
        if (err) {
          console.log(err)
          done(err)
        } else {
          done(null,resp)
        }
      })
      //done()
    }
  }

  opLog.deleteAllOpLogs = function(mode,cb) {
    co(function*() {
      if (mode === APIConst.SECRET_KEY) {
        var removeCount = yield opLog.destroyAll({})
      }
      cb(null,removeCount)
    })
    .catch(function(err){
      cb(null,{err:err})
    })
  }
  opLog.remoteMethod(
      'deleteAllOpLogs',
      {
        http: {verb: 'post'},
        accepts: [
          {arg: 'method', type: 'string', required: true, description:'all'}
        ],
        returns: {arg: 'response', type: 'object'},
        description:'Delete All Data'
      }
  )
  opLog.getOpLogDataById = function(oplogId,cb) {
    co(function*() {
      var logData = yield opLog.findById(oplogId)
      var user = opLog.app.models.user
      var userData = yield user.getUserByToken(logData.params.token)
      logData.userData = userData
      cb(null,logData);
    })
    .catch(function(err){
      cb(null,{err:err});
    })
  }
  opLog.remoteMethod(
    'getOpLogDataById',
    {
      http: {verb: 'post'},
      accepts: [
        {arg: 'oplogId', type: 'string', required: true, description:'all'}
      ],
      returns: {arg: 'response', type: 'object'},
      description:'Get Op Log Data with Id'
    }
)  
  //2018-12-12
  opLog.searchMethod = function(searchStr,range,limit,skip,cb) {
    co(function*() {
      var [utcTime,method] = searchStr.split('-')
      var query = {
        where :{
          method:method,
          //createDTUTC:parseInt(utcTime)
          and:[
            {createDTUTC:{gte:parseInt(utcTime)-range}},
            {createDTUTC:{lte:parseInt(utcTime)+range}}
          ]
        }
      }   
      //console.log(query.where.and)    
      var opData = yield opLog.find(query)
      cb(null,opData)
    })
    .catch(function(err){
      cb(null,{err:err})
    })
  }
  //1544581966
  opLog.remoteMethod(
      'searchMethod',
      {
        http: {verb: 'post'},
        accepts: [
          {arg: 'searchStr', type: 'string', required: true, description:'customer.searchCustomerByNameAndPhone'},
          {arg: 'range', type: 'number', description:'In Seconds'},          
          {arg: 'limit', type: 'number', description:'10'},
          {arg: 'skip', type: 'number', description:'0'},
        ],
        returns: {arg: 'response', type: 'object'},
        description:'Search Methods'
      }
  )
  opLog.searchMethodName = function(methodName,gymId,limit,skip,cb) {
    co(function*() {
      var query = {
        where :{
          method:methodName,
          "params.gymId":gymId
        },
        limit:limit,
        skip:skip
      }   
      //console.log(query.where.and)    
      var opData = yield opLog.find(query)
      cb(null,opData)
    })
    .catch(function(err){
      cb(null,{err:err})
    })
  }  
  opLog.remoteMethod(
    'searchMethodName',
    {
      http: {verb: 'post'},
      accepts: [
        {arg: 'methodName', type: 'string', required: true, description:'customer.searchCustomerByNameAndPhone'},         
        {arg: 'gymId', type: 'string', description:'gymId'},
        {arg: 'limit', type: 'number', description:'10'},
        {arg: 'skip', type: 'number', description:'0'},
      ],
      returns: {arg: 'response', type: 'object'},
      description:'Search Methods by method name'
    }
)  
  opLog.deleteOpLogsNDaysAgo = function(days,cb) {
    co(function*() {
      //var resp = yield promisify(opLog.archieveOpLogsNDaysAgo)(days)
      //console.log(resp)
      var now = Util.getUTCTime()
      var ago = now - 24*60*60*days
      var query = {
        where : {
          createDTUTC:{lt:ago}
        }
      }
      var removeCount = yield opLog.destroyAll(query.where)
      cb(null,removeCount)
    })
    .catch(function(err){
      cb(null,{err:err})
    })
  }
  opLog.remoteMethod(
      'deleteOpLogsNDaysAgo',
      {
        http: {verb: 'post'},
        accepts: [
          {arg: 'days', type: 'number', required: true, description:'number of days before'}
        ],
        returns: {arg: 'response', type: 'object'},
        description:'Delete Days Ago Data'
      }
  )  
  opLog.archieveOpLogsNDaysAgo = function(days,cb) {
    co(function*() {
      var now = Util.getUTCTime()
      var ago = now - 24*60*60*days
      var query = {
        where : {
          createDTUTC:{lt:ago}
        }
      }
      var logs = yield opLog.find(query)
      var csv = LogService.objToCSV(logs)
      var resp = LogService.saveCSVToS3(csv,'before'+ago+'.csv','oplog')
      //var removeCount = yield opLog.destroyAll(query.where)
      cb(null,csv.length)
    })
    .catch(function(err){
      cb(null,{err:err})
    })
  }
  opLog.remoteMethod(
      'archieveOpLogsNDaysAgo',
      {
        http: {verb: 'post'},
        accepts: [
          {arg: 'days', type: 'number', required: true, description:'number of days before'}
        ],
        returns: {arg: 'response', type: 'object'},
        description:'Archieve Days Ago Data'
      }
  )  
  opLog.getClassName = function() {
    var funcNameRegex = /function (.{1,})\(/
    var result = (funcNameRegex).exec(inputClass.constructor.toString()) 
    return (result && result.length >1) ? result[1]:''
  } 
  opLog.getQuery = function(tableName,gymId) {
    var VALIDTABLE1 = ["product","customer"]
    var VALIDTABLE2 = ["order","gymWorksheet","gymGroupClass"]    
    if (VALIDTABLE1.indexOf(tableName) >= 0) {
      var query = {
        where : {
          gymIds:gymId
        }
      }  
      return query    
    } 
    if (VALIDTABLE2.indexOf(tableName) >= 0) {
      var query = {
        where : {
          gymId:gymId
        }
      }  
      return query   
    } 
    return {}   
  }
  //2018-11-16
 //2018-11-16
 opLog.archieveDataBelongToGym = function(tableName,gymId,cb) {
  co(function*() {
    var logTable = opLog.app.models[tableName]
    console.log(tableName)
    var query = opLog.getQuery(tableName,gymId)
    if (Util.emptyObject(query)) {
      return cb(null,'No Data');
    } else {
      var gymData = yield logTable.find(query)
      var objStr = JSON.stringify(gymData)
      LogService.saveSTRToS3(objStr,tableName+'-'+gymId+'.jsontxt',tableName)
      return cb(null,gymData.length);    
    }
  })
  .catch(function(err){
    cb(null,{err:err});
  })
}   
  opLog.archieveGymTables = function(tableNames,gymId,cb) {
    co(function*() {
      var resp = yield tableNames.map(function(tb){
        return {tb:opLog.archieveDataBelongToGym(tb,gymId)}
      })
      cb(null,resp)
    })
    .catch(function(err){
      cb(null,{err:err});
    })
  } 
  opLog.remoteMethod(
    'archieveGymTables',
    {
      http: {verb: 'post'},
      accepts: [
        {arg: 'tableNames', type: 'string', required: true, description:'table Name'},
        {arg: 'gymId', type: 'string', required: true, description:'tables gymId'}
      ],
      returns: {arg: 'response', type: 'object'},
      description:'Archieve Gyms Data'
    }  
  )
  opLog.importArchieveData = function(tableName,fileName,cb) {
    co(function*() {
      var DataPath = './archieveData/' 
      var fileStr = fs.readFileSync(path.join(__dirname, DataPath+fileName)).toString()
      var objs = JSON.parse(fileStr)
      //How to Put Objects into Tables (Problems:every data id)
      cb(null,objs)
    })
    .catch(function(err){
      cb(null,{err:err});
    })
  } 
  opLog.remoteMethod(
    'importArchieveData',
    {
      http: {verb: 'post'},
      accepts: [
        {arg: 'tableName', type: 'string', required: true, description:'table Name'},
        {arg: 'fileName', type: 'string', required: true, description:'tables gymId'}
      ],
      returns: {arg: 'response', type: 'object'},
      description:'Archieve Gyms Data'
    }
  )  
  //"method": "customer.getGymCustomer"
  opLog.countOperationAtDate = function(method,date,cb) {
    co(function*() {
      var startUTC =  moment(date).unix()
      var endUTC = startUTC + 24*60*60
      var query = {
        where :{
          and:[
            {createDTUTC:{lte:endUTC}},
            {createDTUTC:{gte:startUTC}}
          ]
        }
      }
      if (method !== 'all') {
        query.where['method'] = method
      }
      console.log(query.where.or)
      var count = yield opLog.count(query.where)
      cb(null,count);
    })
    .catch(function(err){
      cb(null,{err:err});
    })
  }
  opLog.remoteMethod(
    'countOperationAtDate',
    {
      http: {verb: 'post'},
      accepts: [
        {arg: 'method', type: 'string', required: true, description:'table Name'},
        {arg: 'date', type: 'string', description:'2019-01-01'}
      ],
      returns: {arg: 'response', type: 'object'},
      description:'Count Method Operation Count'
    }
  )     //gymGroupClass.setConfirmAndAddProClassLog 
  opLog.findOperationAtDate = function(method,date,filter,cb) {
    co(function*() {
      var startUTC =  moment(date).unix()
      var endUTC = startUTC + 24*60*60
      var query = {
        where :{
          method:method,
          and:[
            {createDTUTC:{lte:endUTC}},
            {createDTUTC:{gte:startUTC}}
          ]
        }
      }
      var opData = yield opLog.find(query)
      cb(null,opData);
    })
    .catch(function(err){
      cb(null,{err:err});
    })
  }
  opLog.remoteMethod(
    'findOperationAtDate',
    {
      http: {verb: 'post'},
      accepts: [
        {arg: 'method', type: 'string', required: true, description:'table Name'},
        {arg: 'gymId', type: 'string', description:'gymId'},
        {arg: 'date', type: 'string', description:'2019-01-01'}
      ],
      returns: {arg: 'response', type: 'object'},
      description:'Find Method Operation Count'
    }
  )  
  opLog.findParams = function(paramsname,value,cb) {
    co(function*() {
      var key = "params."+paramsname
      var query = {
        where:{
        },
      }
      query.where[key] = value
      console.log(query)
      var opData = yield opLog.find(query)
      cb(null,opData);
    })
    .catch(function(err){
      cb(null,{err:err});
    })
  }  
  opLog.remoteMethod(
    'findParams',
    {
      http: {verb: 'post'},
      accepts: [
        {arg: 'paramsname', type: 'string', required: true, description:'orderId'},
        {arg: 'value', type: 'string', required: true, description:'value'},
      ],
      returns: {arg: 'response', type: 'object'},
      description:'Find Params'
    }
  )   
}