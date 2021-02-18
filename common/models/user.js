const co = require('co') 
const moment = require('moment') 
const promisify = require("es6-promisify") 
const NanUtil = require('./NanUtil.js')

module.exports = function(user) {
    user.createNewUser = NanUtil.getCreateFN(user)
    user.posLogin = function(email,password,cb) {
      co(function*() {
        var respData = {}
        var melogin = yield user.login({email:email,password:password})
        var userData = yield user.findById(melogin.userId) 
        var systemKV = user.app.models.systemKV
        var allSystemKV = yield systemKV.getAllKV()
        respData.token = melogin.id
        respData.userData = userData
        respData.systemKV = allSystemKV
        cb(null,respData);
      })
      .catch(function(err){
        cb(null,err)
      })
    }
    user.remoteMethod(
      'posLogin',
      {
        http: {verb: 'post'},
        accepts: [
          {arg: 'email', type: 'string', required: true, description:'email'},
          {arg: 'password', type: 'string', required: true, description:'password'},
        ],
        returns: {arg: 'response', type: 'object'},
        description:'POS Login'
      }
    )    
    user.getDashBoard = function(cb) {
        co(function*() {
          cb(null,'ToDo');
        })
        .catch(function(err){
          cb(null,{err:err});
        })
    }
    user.remoteMethod(
        'getDashBoard',
        {
          http: {verb: 'post'} ,
          accepts: [
           ],
          returns: {arg: 'response', type: 'object'},
          description:'Get DashBoard Data'
        }
    )  
    user.refreshUITerms = function(cb) {
        co(function*() {
          cb(null,'ToDo');
        })
        .catch(function(err){
          cb(null,{err:err});
        })
    }  
    user.remoteMethod(
        'refreshUITerms',
        {
          http: {verb: 'post'} ,
          accepts: [
           ],
          returns: {arg: 'response', type: 'object'},
          description:'Get UI Terms'
        }
    ) 
    user.deleteTables = function(tableName,cb) {
      co(function*() {
        const tb = user.app.models[tableName]
        var resp = yield tb.destroyAll({})
        cb(null,resp);
      })
      .catch(function(err){
        cb(null,{err:err});
      })
    }
    user.remoteMethod(
      'deleteTables',
      {
        http: {verb: 'post'} ,
        accepts: [
          {arg: 'tableName', type: 'string', required: true, description:'t1,t2'},
        ],
        returns: {arg: 'response', type: 'object'},
        description:'Get UI Terms'
      }
  )     
}