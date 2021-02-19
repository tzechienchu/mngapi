const co = require('co') 
const moment = require('moment') 
const promisify = require("es6-promisify") 
const NanUtil = require('./NanUtil.js')
const APIConst = require('./apiConst.js')
module.exports = function(work) {
    var getModel = function(table) {
      return work.app.models[table]
    } 
	  work.createNewWork = NanUtil.getCreateFN(work)
    work.findWorkByNameAndArtistNo = promisify(function(name,artistNo,cb) {
        co(function*() {
            var query = {
                where:{
                    name,
                    artistNo
                }
            }
            var workData = yield work.find(query)
            cb(null,workData);
        })
        .catch(function(err){
            cb(null,{err:err});
        })
    })	
    //ToDo:More then 2 Item found ?
    work.findWorkByNo = promisify(function(workNo,cb) {
        co(function*() {
            const cache = work.app.models.cache
            const CKEY = "WORKBYNO:"+workNo
            const cacheData = yield cache.get(CKEY)  
            if (NanUtil.emptyObject(cacheData)) {      
              const query = {
                  where:{
                      workNo
                  }
              }
              var workData = yield work.findOne(query)
              if (NanUtil.emptyObject(workData)) {
                cb(null,workData)
              } else {
                const newCacheData = JSON.parse(JSON.stringify(workData))
                var resp = yield cache.set(CKEY,newCacheData,APIConst.TTL.HOUR_8) 
                cb(null,workData)
              }
            } else {
              cb(null,cacheData)
            }
        })
        .catch(function(err){
            cb(null,{err:err});
        })
    })
    work.newWork = function(workNo,artistNo,createYear,material,size,title,styles,createBy,cb) {
      co(function*() {
	      var exitWork = yield work.findWorkByNo(workNo)
				
        if (NanUtil.emptyObject(exitWork)) {
            var newData = {
                workNo,
                artistNo,
                createYear,
                material,
                size,
                title,
                createBy,
                styles,
                state:1,
                createDTUTC:NanUtil.getUTCTime()
            }
            var resp1 = yield work.createNewWork(newData)
            cb(null,resp1)
            //After Process
            var glossary = work.app.models.glossary
            var resp2 = yield [
              //promisify(glossary.newOrUpdateTermWithUsage)(title,'WorkTitle',undefined,createBy,"skip"),
              promisify(glossary.newOrUpdateTermWithUsage)(material,'Material',undefined,createBy,"skip"),
              promisify(glossary.newOrUpdateTermWithUsage)(style,'Style',undefined,"skip")
            ]
            console.log(resp2)
        } else {
          cb(null,exitArtist)
        }
      })
      .catch(function(err){
        cb(null,{err:err});
      })
    }
    work.remoteMethod(
      'newWork',
      {
        http: {verb: 'post'},
        accepts: [
          {arg: 'workNo', type: 'string', required: true, description:'workNo'},
          {arg: 'artistNo', type: 'string', required: true, description:'artistNo'},
          {arg: 'createYear', type: 'string', description:'createYear'},
          {arg: 'material', type: 'string', description:'material'},
          {arg: 'size', type: 'string', description:'size'},
          {arg: 'title', type: 'string', description:'title'},
          {arg: 'styles', type: 'string', description:'styles'},
		      {arg: 'createBy', type: 'string', description:'createBy Id'}
         ],
        returns: {arg: 'response', type: 'object'},
        description:'Add New Work'
      }
    )  
    work.updateWork = function(workId,workNo,artistNo,createYear,material,size,title,styles,cb) {
        co(function*() {
          var now = NanUtil.getUTCTime()
          var workData = yield work.findById(workId)
          var resp = yield workData.updateAttributes({
            workNo,artistNo,createYear,material,size,title,styles,
            modifyDTUTC:now
          })
        })
        .catch(function(err){
          cb(null,{err:err});
        })
    }     
    work.remoteMethod(
        'updateWork',
        {
          http: {verb: 'post'},
          accepts: [
            {arg: 'workId', type: 'string', required: true, description:'workId'},
            {arg: 'workNo', type: 'string', required: true, description:'workNo'},
            {arg: 'artistNo', type: 'string', required: true, description:'artistNo'},
            {arg: 'createYear', type: 'string', description:'createYear'},
            {arg: 'material', type: 'string', description:'material'},
            {arg: 'size', type: 'string', description:'size'},
            {arg: 'title', type: 'string', description:'title'},
            {arg: 'styles', type: 'string', description:'styles'},
           ],
          returns: {arg: 'response', type: 'object'},
          description:'Update Work'
        }
    )
    work.getAllWorks = NanUtil.getGetAllFN(work,"workNo DESC")
    work.remoteMethod(
        'getAllWorks',
        {
          http: {verb: 'post'} ,
          accepts: [
            {arg: 'limit', type: 'string', description:'limit'},
            {arg: 'skip', type: 'string', description:'skip'},
            {arg: 'state', type: 'string', description:'0|1'},
           ],
          returns: {arg: 'response', type: 'object'},
          description:'Get All Work'
        }
    )
    work.updateWorkState = NanUtil.getUpdateStateFN(work) 
    work.remoteMethod(
      'updateWorkState',
      {
        http: {verb: 'post'} ,
        accepts: [
          {arg: 'workId', type: 'string', required: true, description:'workId'},
          {arg: 'state', type: 'number', required: true, description:'0|1'},
         ],
        returns: {arg: 'response', type: 'object'},
        description:'Work Id'
      }
    )
    work.searchWorkByTitle = function(title,cb) {
      co(function*() {
        const query = {
          where:{
            title:{regexp:title}
          }
        }
        var resp = yield work.find(query)
        cb(null,resp);
      })
      .catch(function(err){
        cb(null,{err:err});
      })
    }  
    work.remoteMethod(
      'searchWorkByTitle',
      {
        http: {verb: 'post'} ,
        accepts: [
          {arg: 'title', type: 'string', required: true, description:'title'}
        ],
        returns: {arg: 'response', type: 'object'},
        description:'Search Work By Title'
      }
    )	             
}