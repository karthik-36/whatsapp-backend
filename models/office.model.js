const mongoose = require('mongoose');

var officeSchema = new mongoose.Schema({
  officeName: {
    type: String,
    required: " Office list is required"
  },
  buildingName: {
    type: String,
    required: " building list is required"
  },
  locationId: {
    type: String,
    required: " locationId is required"
  }
});


mongoose.model('office', officeSchema);