const mongoose = require('mongoose');

module.exports = (nosql) => ({
   Image: nosql.model(
       'Image',
       new nosql.Schema({
           name: { type: String, required: true },
           image: { type: String, required: true },
           isDeleted: {type : Boolean, default:false}
       })
   ),
});