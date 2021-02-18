
const APIConst = {
    apiVersion : "0.0.1",
    SECRET_KEY:"",
    REDIS_SERVER:"localhost",
    REDISPORT:6379,
    TTL:{
      HOUR_8: 8*60*60*1000
    },
    IMPORT:{
      //1.風景 2.山水 3.肖像 4.人體 5.靜物 6.現代畫  6.現代畫
      STYLE:["null","風景","山水","肖像","人體","靜物","現代畫","現代畫"],
      //1.油畫 2.水彩 3.版畫 4.雕塑  1.油畫
      MATERIAL:["null","油畫","水彩","版畫","雕塑","油畫"],
    }

}
module.exports = APIConst 