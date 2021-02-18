const co = require('co') 
const moment = require('moment') 
const promisify = require("es6-promisify") 
const NanUtil = require('./NanUtil.js')

module.exports = function(exhibition) {
    exhibition.createNewExhibition = NanUtil.getCreateFN(exhibition) 
    exhibition.findExhibitionByNo = promisify(function(exibitionNo,cb) {
		co(function*() {
			var query = {
				where:{
					exibitionNo
				}
			}
			var exhibitionData = yield exhibition.findOne(query)
			cb(null,exhibitionData);
      })
      .catch(function(err){
        cb(null,{err:err});
      })
    })
    exhibition.newExhibition = function(exhibitionNo,title,preface,document,location,fromDate,toDate,
        artistsNo,worksNo,createBy,cb) {
        co(function*() {
            var newData = {
                exhibitionNo,
                title,
                preface,
                document,
                location,
                fromDate,
                toDate,
                artistsNo:artistsNo,
                worksNo:worksNo,
                state:1,
                createBy,
                createDTUTC:NanUtil.getUTCTime()
            }
            var resp1 = yield exhibition.createNewExhibition(newData)
            cb(null,resp1)
        })
        .catch(function(err){
          cb(null,{err:err});
        })
    }
    exhibition.remoteMethod(
        'newExhibition',
        {
          http: {verb: 'post'},
          accepts: [
            {arg: 'exhibitionNo', type: 'string', required: true, description:'exibitionNo'},
            {arg: 'title', type: 'string', required: true, description:'title'},
            {arg: 'preface', type: 'string', description:'preface'},		  
            {arg: 'document', type: 'string', description:'document'},
            {arg: 'location', type: 'string', description:'location'},
            {arg: 'fromDate', type: 'string', description:'2020-01-01'},
            {arg: 'toDate', type: 'string', description:'2020-01-01'},
            {arg: 'artistsNo', type: 'string', description:'a,b,c,d'},
            {arg: 'worksNo', type: 'string', description:'a,b,c,d'},            
            {arg: 'createBy', type: 'string', description:'createBy Id'}
           ],
          returns: {arg: 'response', type: 'object'},
          description:'New Exhibition'
        }
    )  
    exhibition.updateExhibition = function(exhibitionId,exhibitionNo,title,preface,document,location,fromDate,toDate,
        artistsNo,worksNo,cb) {
        co(function*() {
            var exhibitionData = yield exhibition.findById(exhibitionId)
            var updateData = {
                exhibitionNo,
                title,
                preface,
                document,
                location,
                fromDate,
                toDate,
                artistsNo,
                worksNo,
                modifyDTUTC:NanUtil.getUTCTime()
            }
            var resp1 = yield exhibitionData.updateAttributes(updateData)
            cb(null,resp1)
        })
        .catch(function(err){
          cb(null,{err:err});
        })
    }
    exhibition.remoteMethod(
        'updateExhibition',
        {
          http: {verb: 'post'},
          accepts: [
            {arg: 'exhibitionId', type: 'string', required: true, description:'exibitionId'},
            {arg: 'exhibitionNo', type: 'string', description:'exhibitionNo'},
            {arg: 'title', type: 'string', description:'title'},
            {arg: 'preface', type: 'string', description:'preface'},		  
            {arg: 'document', type: 'string', description:'document'},
            {arg: 'location', type: 'string', description:'location'},
            {arg: 'fromDate', type: 'string', description:'2020-01-01'},
            {arg: 'toDate', type: 'string', description:'2020-01-01'},
            {arg: 'artistsNo', type: 'string', description:'a,b,c,d'},
            {arg: 'worksNo', type: 'string', description:'a,b,c,d'},            
           ],
          returns: {arg: 'response', type: 'object'},
          description:'Update Exhibition'
        }
    )
    exhibition.getAllExhibitions = NanUtil.getGetAllFN(exhibition)
    exhibition.remoteMethod(
      'getAllExhibitions',
      {
        http: {verb: 'post'} ,
        accepts: [
          {arg: 'limit', type: 'string', description:'limit'},
          {arg: 'skip', type: 'string', description:'skip'},
          {arg: 'state', type: 'string', description:'0|1'},
         ],
        returns: {arg: 'response', type: 'object'},
        description:'Get All Exhibition'
      }
    ) 
    exhibition.deleteExhibition = function(exhibitionId,cb) {
      co(function*() {
        //Check In Purchase
        var resp = yield exhibition.destroyById(exhibitionId)
        cb(null,resp);
      })
      .catch(function(err){
          cb(null,{err:err});
      })
    }
    exhibition.remoteMethod(
      'deleteExhibition',
      {
        http: {verb: 'post'} ,
        accepts: [
          {arg: 'exhibitionId', type: 'string', required: true, description:'collectorId'},
         ],
        returns: {arg: 'response', type: 'object'},
        description:'Delete Exhibition'
      }
    )         
    exhibition.updateExhibitionState = NanUtil.getUpdateStateFN(exhibition) 
    exhibition.remoteMethod(
      'updateExhibitionState',
      {
        http: {verb: 'post'} ,
        accepts: [
          {arg: 'exhibitionId', type: 'string', required: true, description:'collectorId'},
          {arg: 'state', type: 'number', required: true, description:'0|1'},
         ],
        returns: {arg: 'response', type: 'object'},
        description:'Exhibition Id'
      }
    )
    exhibition.getAllExhibitionForUI = function(cb) {
      co(function*() {
        const cache = exhibition.app.models.cache
        const CKEY = "EhibitionTitleNoId"
        const cacheData = yield cache.get(CKEY)
        if (NanUtil.emptyObject(cacheData)) {
          var query = {
            fields:{
              exibitionNo:true,
              title:true,
              fromDate:true,
              id:true
            }
          }
          const allExhibitionData = yield exhibition.find(query)
          var nameDict = {}
          allExhibitionData.map(function(d){
            if (nameDict[d.title] === undefined) {
              nameDict[d.title] = d
            }
          })
           const newCacheData = JSON.parse(JSON.stringify(nameDict))
           var resp = yield cache.set(CKEY,newCacheData,APIConst.TTL.HOUR_8) 
           cb(null,nameDict)
        } else {
           console.log('cache')
           cb(null,cacheData)
         }
      })
      .catch(function(err){
        cb(null,{err:err});
      })
    }
    exhibition.remoteMethod(
      'getAllExhibitionForUI',
      {
        http: {verb: 'post'} ,
        accepts: [
         ],
        returns: {arg: 'response', type: 'object'},
        description:'Get All Exhibition for UI'
      }
    )            
} 