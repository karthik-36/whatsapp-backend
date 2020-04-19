const mongoose = require('mongoose');

var officeSchema = new mongoose.Schema({
  officeName : {
    type : String,
    required : " Office list is required",
    unique : true
  },
  buildingName : {
    type : String,
    required : " building list is required",
  }
});

mongoose.model('office' , officeSchema);
