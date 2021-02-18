const co = require('co') 
const moment = require('moment') 
const promisify = require("es6-promisify") 
const NanUtil = require('./NanUtil.js')
const APIError = require('./apiError.js')
const csv=require('csvtojson')
const path = require('path') 
const { POINT_CONVERSION_HYBRID } = require('constants')
module.exports = function(collector) { 
    collector.createNewCollector = NanUtil.getCreateFN(collector)
    collector.findCollectorByNo = promisify(function(collectorNo,cb) {
      co(function*() {
        var query = {
          where:{
            collectorNo
          }
        }
        var collectorData = yield collector.findOne(query)
        cb(null,collectorData);
      })
      .catch(function(err){
        cb(null,{err:err});
      })
    })    
    collector.newCollector = function(collectorNo,name,gender,phone1,phone2,address1,address2,interestKeys,note,createBy,cb) {
        co(function*() {
          var collectorData = yield collector.findCollectorByNo(collectorNo)
          if (NanUtil.emptyObject(collectorData)) {
            var newData = {
                collectorNo,
                name,
                gender,
                phone1,
                phone2,
                address1,
                address2,
                interestKeys,
                note,
                state:1,
                createBy,
                createDTUTC:NanUtil.getUTCTime()
            }
            var resp1 = yield collector.createNewCollector(newData)
            cb(null,resp1)
          } else {
            cb(APIError.SAME_COLLECTOR_NO,collectorData)
          }
        })
        .catch(function(err){
          cb(null,{err:err});
        })
    }
    collector.remoteMethod(
        'newCollector',
        {
          http: {verb: 'post'},
          accepts: [
            {arg: 'collectorNo', type: 'string', required: true, description:'collectorNo'},
            {arg: 'name', type: 'string', required: true, description:'name'},
            {arg: 'gender', type: 'string', description:'gender'},		  
            {arg: 'phone1', type: 'string', description:'phone1'},
            {arg: 'phone2', type: 'string', description:'phone2'},
            {arg: 'address1', type: 'string', description:'address1'},
            {arg: 'address2', type: 'string', description:'address2'},
            {arg: 'interestKeys', type: 'string', description:'interestKeys'},
            {arg: 'note', type: 'string', description:'note'},            
            {arg: 'createBy', type: 'string', description:'createBy Id'}
           ],
          returns: {arg: 'response', type: 'object'},
          description:'New Collector'
        }
    )
    collector.updateCollector = function(collectorId,collectorNo,name,gender,phone1,phone2,address1,address2,interestKeys,note,cb) {
        co(function*() {
            var orgData = yield collector.findById(collectorId)
            var collectorData = yield collector.findCollectorByNo(collectorNo)
            if (NanUtil.emptyObject(collectorData)) {
              var updateData = {
                collectorNo,
                name,
                gender,
                phone1,
                phone2,
                address1,
                address2,
                interestKeys,
                note,
                modifyDTUTC:NanUtil.getUTCTime()
              }
              var resp1 = yield orgData.updateAttributes(updateData)
              cb(null,resp1)
            } else {
              cb(APIError.SAME_COLLECTOR_NO,collectorData)
            }
        })
        .catch(function(err){
          cb(null,{err:err});
        })
    }    
    collector.remoteMethod(
        'updateCollector',
        {
          http: {verb: 'post'},
          accepts: [
            {arg: 'collectorId', type: 'string', required: true, description:'collectorId'},
            {arg: 'collectorNo', type: 'string', description:'collectorNo'},
            {arg: 'name', type: 'string', description:'name'},
            {arg: 'gender', type: 'string', description:'gender'},		  
            {arg: 'phone1', type: 'string', description:'phone1'},
            {arg: 'phone2', type: 'string', description:'phone2'},
            {arg: 'address1', type: 'string', description:'address1'},
            {arg: 'address2', type: 'string', description:'address2'},
            {arg: 'interestKeys', type: 'string', description:'interestKeys'},
            {arg: 'note', type: 'string', description:'note'},            
            {arg: 'createBy', type: 'string', description:'createBy Id'}
           ],
          returns: {arg: 'response', type: 'object'},
          description:'Update Supplier'
        }
    )
    collector.getAllCollectors = NanUtil.getGetAllFN(collector)
    collector.remoteMethod(
      'getAllCollectors',
      {
        http: {verb: 'post'} ,
        accepts: [
          {arg: 'limit', type: 'string', description:'limit'},
          {arg: 'skip', type: 'string', description:'skip'},
          {arg: 'state', type: 'string', description:'0|1'},
         ],
        returns: {arg: 'response', type: 'object'},
        description:'Get All Supplier'
      }
    ) 
    collector.deleteSupplier = function(collectorId,cb) {
      co(function*() {
        //Check In Purchase
        var resp = yield collector.destroyById(collectorId)
        cb(null,resp);
      })
      .catch(function(err){
          cb(null,{err:err});
      })
    }
    collector.remoteMethod(
      'deleteCollector',
      {
        http: {verb: 'post'} ,
        accepts: [
          {arg: 'collectorId', type: 'string', required: true, description:'collectorId'},
         ],
        returns: {arg: 'response', type: 'object'},
        description:'Delete Collector'
      }
    )         
    collector.updateCollectorState = NanUtil.getUpdateStateFN(collector) 
    collector.remoteMethod(
      'updateCollectorState',
      {
        http: {verb: 'post'} ,
        accepts: [
          {arg: 'collectorId', type: 'string', required: true, description:'collectorId'},
          {arg: 'state', type: 'number', required: true, description:'0|1'},
         ],
        returns: {arg: 'response', type: 'object'},
        description:'Collector Id'
      }
    )
    //2021-02-01
    collector.importCollector = function(mode="new",cb) {
      const getGender = function(d) {
        if (d == 0) return "Female"
        if (d == 2) return "Female"
        return "Male"
      }
      const getBirhtYear = function(d) {
        if (NanUtil.emptyObject(d)){ return ""}
        const ds = d.split('/')
        return ds[0]
      }
      const getBirhtDate = function(d) {
        if (NanUtil.emptyObject(d)){ return ""}
        const ds = d.split('/')
        return ds[1]+'-'+ds[2]
      }
      co(function*() {
        const DataPath = "../ImportData/"
        const fileName = "ARTMEL.csv"
        const csvFilePath=path.join(__dirname, DataPath+fileName) 
        console.log(csvFilePath)
        var jsonObj = yield csv().fromFile(csvFilePath)
        var collectorData = jsonObj.map(function(od){
          return {
            collectorNo:od.IDNO,
            name:od.CUSTOMER,
            gender:getGender(od.SEX),
            phone1:od.TELHOME,
            phone2:od.TELOFFICE,
            address1:od.ADDRESS+" "+od.ADDRESS2,
            address2:"",
            interestKeys:"",
            note:"",
            createBy:"System"
          }
        })
        if (mode === "new") {
          var resp = yield collectorData.map(function(d){
            //collectorNo,name,gender,phone1,phone2,address1,address2,interestKeys,note
            return promisify(collector.newCollector)(
              d.collectorNo,
              d.name,
              d.gender,
              d.phone1,
              d.phone2,
              d.address1,
              d.address2,
              d.interestKeys,
              d.note,
              d.createBy
            )
          })          
          cb(null,collectorData) 
        } else {
          cb(null,collectorData)
        }
      })
      .catch(function(err){
          cb(null,{err:err})
      })
    }
    collector.remoteMethod(
      'importCollector',
      {
        http: {verb: 'post'} ,
        accepts: [
          {arg: 'mode', type: 'string', required: true, description:'New|Update'}
        ],
        returns: {arg: 'response', type: 'object'},
        description:'Import Collector'
      }
    )	 
    //2021-02-09
    collector.searchCollectorByName = function(name,cb) {
      co(function*() {
        const query = {
          where:{
            name:{regexp:name}
          }
        }
        var resp = yield collector.find(query)
        cb(null,resp);
      })
      .catch(function(err){
        cb(null,{err:err});
      })
    }  
    collector.remoteMethod(
      'searchCollectorByName',
      {
        http: {verb: 'post'} ,
        accepts: [
          {arg: 'name', type: 'string', required: true, description:'name'}
        ],
        returns: {arg: 'response', type: 'object'},
        description:'Import Collector'
      }
    )	             
}