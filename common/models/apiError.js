const APIError = {
  SAME_COLLECTOR_NO:{
    errorno:"1501",
    message:"Collector Number must be unique"
  },
  SAME_ARTIST_NO:{
    errorno:"1601",
    message:"Artist Number must be unique"
  },
  SAME_WORK_NO:{
    errorno:"1701",
    message:"Work Number must be unique"
  },  
}
module.exports = APIError 