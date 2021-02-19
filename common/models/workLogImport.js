const co = require('co') 
const moment = require('moment') 
const promisify = require("es6-promisify") 
const NanUtil = require('./NanUtil.js')
const APIConst = require('./apiConst.js')
const csv=require('csvtojson')
const path = require('path') 
module.exports = function(workLog) {
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
        const artist = workLog.getModel("artist")
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
                console.log(d)
                console.log(r)
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
    workLog.importArtOut = function(mode,cb) {
        co(function*() {
            const DataPath = "../ImportData/"
            const fileName = "ARTOUT.csv"
            const csvFilePath=path.join(__dirname, DataPath+fileName) 
            console.log(csvFilePath)
            //FRAME,NETPRICE,ARTNAME,PRICE,STYLE,MATERIAL,SIZE,TOPIC,YEAR,PROVNO,
            //TAX,BASE,ORDNO,COLNAME,ORDERDATE,ARTISTNO,ARTNO,INDATE,SALEPRICE,DOWNPAY
            var jsonObj = yield csv().fromFile(csvFilePath)
            var workOutData = jsonObj.map(function(od,ix){
                return {
                    workNo: ix,
                    artNo:od.ARTNO,
                    artistName: od.ARTNAME,
                    artistNo: parseInt(od.ARTISTNO,10),
                    createYear: od.YEAR,
                    material: APIConst.IMPORT.MATERIAL[parseInt(od.MATERIAL,10)],
                    size: od.SIZE,
                    title: od.TOPIC,
                    styles: APIConst.IMPORT.STYLE[parseInt(od.STYLE,10)],
                    state: "sold",
                    ownerType: "collector",
                    ownerName: od.COLNAME,
                    location: "owner",
                    price: od.PROCE,
                    inDate: od.INDATE.replace(/\//g, "-"),
                    orderNo: od.ORDNO,
                    createDTUTC: NanUtil.getUTCTime(),
                    createBy:"System",
                }
            })            
            cb(null,workOutData);
        })
        .catch(function(err){
            cb(null,err)
        })        
    }  
    workLog.remoteMethod(
        'importArtOut',
        {
          http: {verb: 'post'} ,
          accepts: [
            {arg: 'mode', type: 'string', required: true, description:'New|Update'}
          ],
          returns: {arg: 'response', type: 'object'},
          description:'Import ArtOut'
        }
      )      
}