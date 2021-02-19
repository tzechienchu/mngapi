var moment = require('moment') 
const R = require('ramda')
const promisify = require("es6-promisify") 
const co = require('co') 
const crypto = require('crypto')

var NanUtil = (function() {
  var FNParamNamesCache = {}

  var getUTCTime = function(){
    return moment().unix();
  }  
  var YYMMDDToUTC = function(yymmdd,timeZone) {
    return  moment(yymmdd+" "+timeZone,"YYYY-MM-DD Z").unix()
  }
  var utcToLocalString = function(utc,offset,format){
    format = format || "YYYY-MM-DD HH:mm"
    return moment.unix(utc).utcOffset(offset).format(format)
  }   

  var getCreateFN = function(table) {
    return promisify(function(newData,cb) {
      table.create(newData,function(err,resp) {
        if (err) {
          console.log(err)
          cb(null,{err:err}) 
        } else {
          cb(null,resp)
        }
      }) 
    }) 
  }

  var getUpdateStateFN = function(table) {
    return function(tId,state,cb) {
      co(function*() {
        var tData = yield table.findById(tId)
        var resp = yield tData.updateAttributes({state})
        cb(null,resp);
      })
      .catch(function(err){
        cb(null,{err:err});
      })
    }
  }

  var getGetAllFN = function(table,orderBy="") {
    return function(limit,skip,state=1,cb) {
      co(function*() {
        var query = {
          where:{
            state
          },
          order:orderBy,
          limit:limit,
          skip:skip
        }
        var resp = yield [
          table.count({}),
          table.find(query)
        ]
        const page = genPageObj(resp[0],limit,skip)
        cb(null,{
          data:resp[1],
          page:page
        });
      })
      .catch(function(err){
        cb(null,{err:err});
      })
    }
  }
  var getDeleteByIdFN = function(table) {
    return function(tId,cb) {
      co(function*() {
        var resp = yield table.destroyById(tId)
        cb(null,resp);
      })
      .catch(function(err){
        cb(null,{err:err});
      })
    }
  }
  var emptyObject = function(cachedData) {
    if ((R.isEmpty(cachedData)) || (R.isNil(cachedData)) || (cachedData ==='undefined') || (cachedData === null)) 
    {
      return true
    } else {
      return false
    }
  }
  var initFNParamNamesCache = function() {
    FNParamNamesCache = {}
  }
  var getFNParamNames = function(fnName,fn) {
    if (FNParamNamesCache[fnName] === undefined) 
    {
      var param =  fn.toString()
          .replace(/[/][/].*$/mg,'') // strip single-line comments
          .replace(/\s+/g, '') // strip white space
          .replace(/[/][*][^/*]*[*][/]/g, '') // strip multi-line comments  
          .split('){', 1)[0].replace(/^[^(]*[(]/, '') // extract the parameters  
          .replace(/=[^,]+/g, '') // strip any ES6 defaults  
          .split(',').filter(Boolean); // split & filter [""]  
      FNParamNamesCache[fnName] = param
    } 
    return FNParamNamesCache[fnName]
  } 
  var getFNParams = function(fnName,fn,params) {
    if (FNParamNamesCache[fnName] === undefined) 
    {
      var param =  fn.toString()
          .replace(/[/][/].*$/mg,'') // strip single-line comments
          .replace(/\s+/g, '') // strip white space
          .replace(/[/][*][^/*]*[*][/]/g, '') // strip multi-line comments  
          .split('){', 1)[0].replace(/^[^(]*[(]/, '') // extract the parameters  
          .replace(/=[^,]+/g, '') // strip any ES6 defaults  
          .split(',').filter(Boolean); // split & filter [""]  
      FNParamNamesCache[fnName] = param
    }     
    var newParams = {}
    var pnames = FNParamNamesCache[fnName]
    Object.keys(params).map(function(key) {
      if (pnames[parseInt(key,10)] === 'req') {
        newParams[pnames[parseInt(key,10)]] = 'requestObj'
      } else if (pnames[parseInt(key,10)] === 'cb')  {
        newParams[pnames[parseInt(key,10)]] = 'callBack'
      } else {
        newParams[pnames[parseInt(key,10)]] = params[key]
      }
    })
    console.log(newParams)    
    return {
      fnName:fnName,
      params:newParams
    }
  }
  var makeDictByParm = function(arrData,parm) {
    var dict = {}
    arrData.map(function(d){
      if (dict[d[parm]] === undefined) {
        dict[d[parm]] = []
        dict[d[parm]].push(d)
      } else {
        dict[d[parm]].push(d)
      }
    })
    return dict    
  }
  var parseReqObj = function(req) {
    var keys = Object.keys(req)
    console.log(req.accessToken)
  }

  var parseStatus = function(status,defaultStatus) {
    if (status === undefined) {
      return defaultStatus
    } else {
      return status
    }   
  }  
  var parseGymIds = function(gymIds,defaultGymIds) {
    //2019-03-25
    if (gymIds === '-') {
      return undefined
    }
    if (gymIds === undefined) {
      return defaultGymIds
    } else {
      return gymIds.split(',')
    } 
  }  
  var parseContext = function(ctx) {
    var args = Object.keys(ctx.args)
    args = args.filter(function(k){
      return k !== 'req'
    })
    var obj = {
      fnName:ctx.methodString,
      params:{
        token:'',
      }
    }
    if (ctx.args.req) obj.params.token = ctx.args.req.query.access_token
    args.map(function(parm){
      obj.params[parm] = ctx.args[parm]
    })
    return obj   
  }
  // var logFn = function() {
  //   var fn = function(ctx, unused, next) {
  //     myKue.createJob('LOG_OP',
  //          {params:parseContext(ctx)},
  //          8,function(){
  //          next()
  //     }) 
  //   }
  //   return fn
  // }
   
  var inLocalMachine = function() {
    var opstat = process.env
    //console.log('Node Version 6.9.5')
    console.log(opstat.LOGNAME)
    if (opstat.LOGNAME === 'tzechienchu'){
      console.log('In Local Mac')
      return true
    } else {
      console.log('In AWS EC2')
      return false
    }
  } 
  var delayPromise = function(duration) {
    return new Promise(function(resolve, reject){
      setTimeout(function(){
        resolve() 
      }, duration)
    }) 
  }
  var createError = function(errMsg,errCode) {
    return {err:{
       message:errMsg,
       code:errCode
     }} 
  }   
  var nullCheck = function(...args) {
    return args.map(function(arg){
      if (arg === 'null') {
        //console.log('null check: null')
        return undefined
      } else {
        //console.log('null check: not null')
        return arg
      }
    })
  }     
  var isUndefined = function(i) {
    if (i === undefined) return true
    return false
  }
  var genPageObj = function(total,limit,skip=0) {
    var pageSize = limit || total
    var totalPage = Math.ceil(total/pageSize)
    var pageNo = Math.ceil(skip/pageSize) + 1
    return {
      pageSize,
      totalPage,
      pageNo,
    }
  }
  const makeKV = function(key,value,type) {
    var kvData = {}
    kvData.key = key
    kvData.type = type
    //if (type === "obj") kvData.value = JSON.stringify(value)
    //if (type === "array") kvData.value = JSON.stringify(value)
    if (type === "array") kvData.value = value.join(",")
    if (type === "int") kvData.value = ""+value
    if (type === "float") kvData.value = ""+value
    if (type === "bool") {
        if (value) {
            kvData.value = "true"
        } else {
            kvData.value = "false"
        }
    }
    if (kvData.type === 'string') kvData.value = value
    return kvData
  }  
  const parseKV = function(kvData) {
    var obj = {}
    obj.key = kvData.key
    // if (kvData.type === 'obj') obj.value = JSON.parse(kvData.value)
    // if (kvData.type === 'array') obj.value = JSON.parse(kvData.value)
    if (kvData.type === 'array') obj.value = kvData.value.split(',')
    if (kvData.type === 'int') obj.value = parseInt(kvData.value, 10)
    if (kvData.type === 'float') obj.value = parseFloat(kvData.value, 10)
    if (kvData.type === 'bool' && kvData.value === 'true') obj.value = true
    if (kvData.type === 'bool' && kvData.value === 'false') obj.value = false
    if (kvData.type === 'string') obj.value = kvData.value
    return obj
  } 
  const encrypt = function(text,secretKey) {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv('aes-256-ctr', secretKey, iv);
    const encrypted = Buffer.concat([cipher.update(text), cipher.final()]);
    var obj = {
      iv: iv.toString('hex'),
      content: encrypted.toString('hex')
    }
    return JSON.stringify(obj)
  }
  const decrypt = (hashStr,secretKey) => {
    var hash = JASON.parse(hashStr)
    const decipher = crypto.createDecipheriv('aes-256-ctr', secretKey, Buffer.from(hash.iv, 'hex'));
    const decrpyted = Buffer.concat([decipher.update(Buffer.from(hash.content, 'hex')), decipher.final()]);

    return decrpyted.toString();
};     
  return {
    initFNParamNamesCache,
    getFNParamNames,
    getFNParams,
    getCreateFN,
    getUpdateStateFN,
    getGetAllFN,
    getDeleteByIdFN,

    parseReqObj,
    getUTCTime,
    YYMMDDToUTC,

    utcToLocalString,
    emptyObject,

    parseStatus,
    parseGymIds,
    parseContext,
    
    createError,
    
    inLocalMachine,
    delayPromise,
    
    nullCheck,
    isUndefined,

    makeDictByParm,
    genPageObj,
    makeKV,
    parseKV,
    encrypt,
    decrypt,
  }
}())

module.exports = NanUtil 