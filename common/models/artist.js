const co = require('co') 
const moment = require('moment') 
const promisify = require("es6-promisify") 
const NanUtil = require('./NanUtil.js')
const APIConst = require('./apiConst.js')
const { getUpdateStateFN } = require('./NanUtil.js')
const csv=require('csvtojson')
const path = require('path') 
const { POINT_CONVERSION_HYBRID } = require('constants')
module.exports = function(artist) { 
	artist.createNewArtist = NanUtil.getCreateFN(artist)
    artist.findArtistByName = promisify(function(name,cb) {
		co(function*() {
			var query = {
				where:{
					name
				}
			}
			var artistData = yield artist.find(query)
			cb(null,artistData);
		})
		.catch(function(err){
			cb(null,{err:err});
		})
    })	
    artist.findArtistByNo = promisify(function(artistNo,cb) {
		co(function*() {
			var query = {
				where:{
					artistNo
				}
			}
			var artistData = yield artist.findOne(query)
			cb(null,artistData);
		})
		.catch(function(err){
			cb(null,{err:err});
		})
    })
	artist.getArtistByNo = function(artistNo,cb) {
		co(function*() {
			const cache = artist.app.models.cache
			const CKEY = "ArtistByNo:"+artistNo
			const cacheData = yield cache.get(CKEY)
			if (NanUtil.emptyObject(cacheData)) {			
			  var artistData  = yield artist.findArtistByNo(artistNo)
              const newCacheData = JSON.parse(JSON.stringify(artistData))
              var resp = yield cache.set(CKEY,newCacheData,APIConst.TTL.HOUR_8) 			  
			  cb(null,artistData)
			} else {
			  cb(null,cacheData) 	
			}
		})
		.catch(function(err){
			cb(null,{err:err});
		})
	}
    artist.remoteMethod(
		'getArtistByNo',
		{
		  http: {verb: 'post'} ,
		  accepts: [
			{arg: 'artistNo', type: 'number', description:'artistNo'},
		   ],
		  returns: {arg: 'response', type: 'object'},
		  description:'Get Artist By No'
		}
	)
	artist.newArtist = function(artistNo,name,lastname,gender,birthYear,birthDate,
		phone1,phone2,address1,address2,material,education,note,createBy,cb) {
      co(function*() {
		var exitArtist = yield artist.findArtistByNo(artistNo)
        if (NanUtil.emptyObject(exitArtist)) {
			var newData = {
				artistNo,
				name,
				lastname,
				gender,
				birthYear,
				birthDate,
				phone1,
				phone2,
				address1,
				address2,
				material,
				education,
				note,
				state:1,
				createBy,
				createDTUTC:NanUtil.getUTCTime()
			}
			var resp1 = yield artist.createNewArtist(newData)
			cb(null,resp1)
			//After Process
			var glossary = artist.app.models.glossary
			var resp2 = yield promisify(glossary.newOrUpdateTermWithUsage)(name,'ArtistName',undefined,createBy,"skip")
        } else {
          cb(null,exitArtist)
        }
      })
      .catch(function(err){
        cb(null,{err:err});
      })
    }
    artist.remoteMethod(
      'newArtist',
      {
        http: {verb: 'post'},
        accepts: [
          {arg: 'artistNo', type: 'number', required: true, description:'artistNo'},
		  {arg: 'name', type: 'string', required: true, description:'name'},
		  {arg: 'lastname', type: 'string', description:'lastname'},		  
          {arg: 'gender', type: 'string', description:'gender'},
          {arg: 'birthYear', type: 'string', description:'birthYear'},
		  {arg: 'birthDate', type: 'string', description:'birthDate'},
		  {arg: 'phone1', type: 'string', description:'phone1'},
		  {arg: 'phone2', type: 'string', description:'phone2'},
		  {arg: 'address1', type: 'string', description:'address1'},
		  {arg: 'address2', type: 'string', description:'address2'},	
		  {arg: 'material', type: 'string', description:'material'},
		  {arg: 'education', type: 'string', description:'education'},		
		  {arg: 'note', type: 'string', description:'note'},			    	  
		  {arg: 'createBy', type: 'string', description:'createBy Id'}
         ],
        returns: {arg: 'response', type: 'object'},
        description:'Update or Add New Artist'
      }
	)
	artist.updateArtist = function(artistId,artistNo,name,lastname,gender,birthYear,birthDate,
		phone1,phone2,address1,address2,material,education,note,cb) {
		co(function*() {
		  var exitArtist = yield artist.findById(artistId)
		  var resp = yield exitArtist.updateAttributes({
			artistNo,
			name,
			lastname,
			gender,
			birthYear,
			birthDate,
			phone1,
			phone2,
			address1,
			address2,
			material,
			education,
			note,			
			modifyDTUTC:NanUtil.getUTCTime()
		  })
		  cb(null,resp)
		})
		.catch(function(err){
		  cb(null,{err:err});
		})
	}	  
    artist.remoteMethod(
		'updateArtist',
		{
		  http: {verb: 'post'},
		  accepts: [
			{arg: 'artistId', type: 'string', required: true, description:'artistNo'},
			{arg: 'artistNo', type: 'number', description:'artistNo'},
			{arg: 'name', type: 'string', description:'name'},
			{arg: 'lastname', type: 'string', description:'lastname'},
			{arg: 'gender', type: 'string', description:'gender'},
			{arg: 'birthYear', type: 'string', description:'birthYear'},
			{arg: 'birthDate', type: 'string', description:'birthDate'},
			{arg: 'phone1', type: 'string', description:'phone1'},
			{arg: 'phone2', type: 'string', description:'phone2'},
			{arg: 'address1', type: 'string', description:'address1'},
			{arg: 'address2', type: 'string', description:'address2'},	
			{arg: 'material', type: 'string', description:'material'},
			{arg: 'education', type: 'string', description:'education'},		
			{arg: 'note', type: 'string', description:'note'},			
		   ],
		  returns: {arg: 'response', type: 'object'},
		  description:'Update Artist'
		}
	)
    artist.getAllArtists = NanUtil.getGetAllFN(artist,"artistNo DESC")
    artist.remoteMethod(
      'getAllArtists',
      {
        http: {verb: 'post'} ,
        accepts: [
          {arg: 'limit', type: 'string', description:'limit'},
          {arg: 'skip', type: 'string', description:'skip'},
          {arg: 'state', type: 'string', description:'0|1'},
         ],
        returns: {arg: 'response', type: 'object'},
        description:'Get All Artist'
      }
    )	
    artist.updateArtistState = NanUtil.getUpdateStateFN(artist)
	artist.remoteMethod(
		'updateArtistState',
		{
		  http: {verb: 'post'} ,
		  accepts: [
			{arg: 'artistId', type: 'string', required: true, description:'artistId'},
			{arg: 'state', type: 'number', required: true, description:'0|1'},
		   ],
		  returns: {arg: 'response', type: 'object'},
		  description:'artist Id'
		}
	)
    artist.deleteArtist = function(artistId,cb) {
		co(function*() {
		  //Check In WorkIn
		  //Check In Order
		  //Check In Exhibition
		  var resp = yield supplier.destroyById(artistId)
		  cb(null,resp);
		})
		.catch(function(err){
			cb(null,{err:err});
		})
	  }
    artist.remoteMethod(
      'deleteArtist',
      {
        http: {verb: 'post'} ,
        accepts: [
          {arg: 'artistId', type: 'string', required: true, description:'collectorId'}
         ],
        returns: {arg: 'response', type: 'object'},
        description:'Delete By artistId'
      }
	)
	//2021-02-01
	artist.getAllArtistsForUI = function(cb) {
		co(function*() {
			const cache = artist.app.models.cache
			const CKEY = "ArtistsNameNoId"
			const cacheData = yield cache.get(CKEY)
			if (NanUtil.emptyObject(cacheData)) {
				var query = {
					fields:{
						artistNo:true,
						name:true,
						id:true
					}
				}
				const allArtistData = yield artist.find(query)
				var nameDict = {}
				var noDict = {}
				allArtistData.map(function(d){
					if (nameDict[d.name] === undefined) {
						nameDict[d.name] = d
					}
					if (noDict[d.artistNo] === undefined) {
						noDict[d.artistNo] = d
					}
				})
				var dict = {nameDict,noDict}
			   const newCacheData = JSON.parse(JSON.stringify(dict))
			   var resp = yield cache.set(CKEY,newCacheData,APIConst.TTL.HOUR_8) 
		       cb(null,dict)
			} else {
			   console.log('cache')
			   cb(null,cacheData)
		   }
		})
		.catch(function(err){
			cb(null,{err:err});
		})
	}
    artist.remoteMethod(
		'getAllArtistsForUI',
		{
		  http: {verb: 'post'} ,
		  accepts: [
		   ],
		  returns: {arg: 'response', type: 'object'},
		  description:'Get All Artist for UI'
		}
	)
	artist.importArtis = function(mode="new",cb) {
		const getGender = function(d) {
			if (d == 0) return "Female"
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
			const fileName = "ARTIST.csv"
			const csvFilePath=path.join(__dirname, DataPath+fileName) 
			console.log(csvFilePath)
			var jsonObj = yield csv().fromFile(csvFilePath)
			var artistData = jsonObj.map(function(od){
				return {
					artistNo : parseInt(od.ARTISTNO,10),
					name:od.ARTNAME,
					lastname:"",
					gender:getGender(od.GENDER),
					birthYear:getBirhtYear(od.BIRTHDAY),
					birthDate:getBirhtDate(od.BIRTHDAY),
					phone1:od.TELH,
					phone2:od.TELO,
					address1:od.COMMADD+" "+od.COMMADD2,
					address2:od.ADDRESS+" "+od.ADDRESS2,
					material:"",
					education:od.EDUCATION,
					note:"",
					createBy:"System"
				}
			})
			if (mode === "new") {
				var resp = yield artistData.map(function(d){
					return promisify(artist.newArtist)(
						d.artistNo,
						d.name,
						d.lastname,
						d.gender,
						d.birthYear,
						d.birthDate,
						d.phone1,
						d.phone2,
						d.address1,
						d.address2,
						d.material,
						d.education,
						d.note,
						d.createBy
					)
				})
				cb(null,artistData) 
			} else {
				cb(null,jsonObj)
			}
		})
          .catch(function(err){
            cb(null,{err:err})
        })
	}
    artist.remoteMethod(
		'importArtis',
		{
		  http: {verb: 'post'} ,
		  accepts: [
			{arg: 'mode', type: 'string', required: true, description:'New|Update'}
		   ],
		  returns: {arg: 'response', type: 'object'},
		  description:'Import Artist'
		}
	)			   
}