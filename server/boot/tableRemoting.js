var Util = require('../../common/models/NanUtil') 
//var myKue = require('../../common/models/kueService.js').getInstance()
var BullService = require('../../common/models/bullService.js').getInstance()
module.exports = function(app) {
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
  var tables = ['artist','supplier','collector','artistPriceLog','collector','glossary',
                'work','workLog']

      tables.map(function(t){
        console.log('afterRemote '+t)
        var tref = app.models[t]
        tref.afterRemote('*',function(ctx, unused, next) {
          BullService.opLogQueue.add({params:Util.parseContext(ctx)})
          next()
          // myKue.createJob('LOG_OP',
          //       {params:Util.parseContext(ctx)},
          //       8,function(){
          //       next()
          // }) 
        })
      })
}