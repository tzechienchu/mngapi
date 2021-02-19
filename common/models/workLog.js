const co = require('co') 
const moment = require('moment') 
const promisify = require("es6-promisify") 
const NanUtil = require('./NanUtil.js')
const APIConst = require('./apiConst.js')
const csv=require('csvtojson')
const path = require('path') 
module.exports = function(workLog) {
    var getModel = function(table) {
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
          var work = getModel('work')
          var artist = getModel('artist')
          var exitWork = yield work.findWorkByNo(workNo) 
          console.log(exitWork)  
          const artistData = yield artist.findArtistByNo(artistNo)
          const artistName = artistData.name
          if (NanUtil.emptyObject(exitWork)) {
            //Create newWork
            var resp1 = yield promisify(work.newWork)(workNo,artistNo,createYear,material,size,title,styles,createBy)
          } else {
            var workId = exitWork.id
            console.log("Exist "+workId)
            var resp1 = yield promisify(work.updateWork)(workId,workNo,artistNo,createYear,material,size,title,styles)
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
    //2021-02-17
    workLog.getWorkByNo = function(workNo,cb) {
      co(function*() {
        var workData = yield work.findWorkByNo(workNo)
        cb(null,workData);
      })
      .catch(function(err){
          cb(null,{err:err});
      })      
    }
    workLog.importArtIn = function(mode="view",cb) {
      co(function*() {
        const DataPath = "../ImportData/"
        const fileName = "ARTIN.csv"
        const csvFilePath=path.join(__dirname, DataPath+fileName) 
        console.log(csvFilePath)
        //SALE,YEAR,STYLE,ARTNO,ARTISTNO,INDATE,MATERIAL,SIZE,TOPIC,PRICE
        var jsonObj = yield csv().fromFile(csvFilePath)
        var workInData = jsonObj.map(function(od,ix){
          return {
            workNo: ix,
            artNo:od.ARTNO,
            artistNo: parseInt(od.ARTISTNO,10),
            createYear: od.YEAR,
            material: APIConst.IMPORT.MATERIAL[parseInt(od.MATERIAL,10)],
            size: od.SIZE,
            title: od.TOPIC,
            styles: APIConst.IMPORT.STYLE[parseInt(od.STYLE,10)],
            state: "Import",
            ownerType: "Import",
            ownerName: "Import",
            location: "Import",
            price: od.PROCE,
            inDate: od.INDATE.replace(/\//g, "-"),
            createDTUTC: NanUtil.getUTCTime(),
            createBy:"System",
          }
        })
        console.log(workInData.length)
        const artist = getModel("artist")
        const artistData = yield promisify(artist.getAllArtistsForUI)()
        const artistNoDict = artistData.noDict
        var badWorkIn = []
        var goodWorkIn = []
        var allWorkNo = []
        var duplicateWorkNo = []
        workInData.map(function(d){
          if (artistNoDict[d.artistNo] === undefined) {
            badWorkIn.push(d)
          } else {
            goodWorkIn.push(d)
            if (allWorkNo.indexOf(d.workNo) === -1) {
              allWorkNo.push(d.workNo)
            } else {
              duplicateWorkNo.push(d)
            }
          }
        })
        console.log(allWorkNo.length)
        console.log(duplicateWorkNo.length)
        const workInDataRun = workInData //.slice(0,2)
        if (mode === "new") {
          var resp = []
          var s = 0
          const runLeng = workInDataRun.length
          while (s < runLeng) {
            var d = workInDataRun[s]
            var r = yield promisify(workLog.inWork)(d.workNo,d.artNo,d.artistNo,d.createYear,
              d.material,d.size,d.title,d.styles,
              d.state,d.ownerType,d.ownerName,d.location,d.price,d.inDate,d.createBy)
            s+= 1
            resp.push(r)
            //console.log(d)
            console.log(s+"/"+runLeng)
            yield NanUtil.delayPromise(10)
          }        
          cb(null,resp) 
        } else {
          cb(null,{
            badWorkIn,
          })
        }
      })
      .catch(function(err){
          cb(null,{err:err})
      })
    }
    workLog.remoteMethod(
      'importArtIn',
      {
        http: {verb: 'post'} ,
        accepts: [
          {arg: 'mode', type: 'string', required: true, description:'New|Update'}
        ],
        returns: {arg: 'response', type: 'object'},
        description:'Import ArtIn'
      }
    )         
}