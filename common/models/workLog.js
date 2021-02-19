const co = require('co') 
const moment = require('moment') 
const promisify = require("es6-promisify") 
const NanUtil = require('./NanUtil.js')
const APIConst = require('./apiConst.js')
const csv=require('csvtojson')
const path = require('path') 
module.exports = function(workLog) {
    require('./workLogImport.js')(workLog)  
    workLog.getModel = function(table) {
      return workLog.app.models[table]
    } 
    workLog.createNewWorkLog = NanUtil.getCreateFN(workLog)
    //Generic add
    workLog.newWorkLog = function(workNo,artNo,title,size,material,
          artistNo,artistName,
          state,ownerType,ownerName,location,price,
          inDate,outDate,createBy,cb) {
        co(function*() {
            var newData = {
                workNo,
                artNo,
                title,
                size,
                material,
                artistNo,
                artistName,
                state,
                ownerType,
                ownerName,
                location,
                price,
                inDate,
                outDate,
                createBy,
                createDTUTC:NanUtil.getUTCTime()
            }
            var resp1 = yield workLog.createNewWorkLog(newData)
            cb(null,resp1)
        })
        .catch(function(err){
          cb(null,{err:err});
        })
    }
    //UI:User KeyIn workNo -> Know already In or Not -> Display Other UI
    workLog.inWork = function(workNo,artNo,
        artistNo,createYear,material,size,title,styles,
        state,ownerType,ownerName,location,price,inDate,createBy,cb) {
        co(function*() {
          var work = workLog.getModel('work')
          var artist = workLog.getModel('artist')
          var exitWork = yield work.findWorkByNo(workNo) 
          console.log(exitWork)  
          const artistData = yield artist.findArtistByNo(artistNo)
          const artistName = artistData.name
          if (NanUtil.emptyObject(exitWork)) {
            //Create newWork
            var resp1 = yield promisify(work.newWork)(workNo,artistNo,artistName,createYear,material,size,title,styles,createBy)
          } else {
            var workId = exitWork.id
            console.log("Exist "+workId)
            var resp1 = yield promisify(work.updateWork)(workId,workNo,artistNo,artistName,createYear,material,size,title,styles)
          }
          if (ownerName === undefined) {
            ownerName = artistData.name
          }
          var resp2 = yield promisify(workLog.newWorkLog)(
            workNo,artNo,title,size,material,
            artistNo,artistName,
            state,ownerType,ownerName,
            location,price,inDate,undefined,createBy)
          //LastWorkLogId
          cb(null,{ resp1, resp2 })
        })
        .catch(function(err){
          cb(null,{err:err});
        })
      }
    workLog.remoteMethod(
        'inWork',
        {
          http: {verb: 'post'},
          accepts: [
            {arg: 'workNo', type: 'string', required: true, description:'workNo'},
            {arg: 'artNo', type: 'string', description:'artNo'},
            {arg: 'artistNo', type: 'string', required: true, description:'artistNo'},
            {arg: 'createYear', type: 'string', description:'createYear'},
            {arg: 'material', type: 'string', description:'material'},
            {arg: 'size', type: 'string', description:'size'},
            {arg: 'title', type: 'string', description:'title'},
            {arg: 'styles', type: 'string', description:'styles'},
            {arg: 'state', type: 'string', description:'Web | Stock | Lend | Sold'},
            {arg: 'ownerType', type: 'string', description:'Artist | Nan | Collector'},
            {arg: 'ownerName', type: 'string', description:'ownerName'},
            {arg: 'location', type: 'string', description:'location'},
            {arg: 'price', type: 'number', description:'price'},
            {arg: 'inDate', type: 'string', description:'inDate'},
            {arg: 'createBy', type: 'string', description:'createBy Id'}
           ],
          returns: {arg: 'response', type: 'object'},
          description:'Add New Work'
        }
    )
    workLog.getAllWorkLogs = NanUtil.getGetAllFN(workLog)
    workLog.remoteMethod(
        'getAllWorkLogs',
        {
          http: {verb: 'post'} ,
          accepts: [
            {arg: 'limit', type: 'string', description:'limit'},
            {arg: 'skip', type: 'string', description:'skip'},
            {arg: 'state', type: 'string', description:'0|1'},
           ],
          returns: {arg: 'response', type: 'object'},
          description:'Get All WorkLog'
        }
    )             
}