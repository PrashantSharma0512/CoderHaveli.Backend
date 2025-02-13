const mongoose = require('mongoose');   

const connection = async (url)=>{
    return mongoose.connect(url, { useNewUrlParser: true, useUnifiedTopology: true })

}
module.exports = connection;