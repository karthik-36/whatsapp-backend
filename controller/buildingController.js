const express = require("express");
const router = express.Router();
const mongoose = require("mongoose");
mongoose.set("useFindAndModify", false);
const Employee = mongoose.model("employees");
const Admin = mongoose.model("admin");
let Buildingsite = mongoose.model("buildings");
const Offices = mongoose.model("office");
const Bids = mongoose.model("bids");
const util = require('util')






// Custom Search Refer to customSearch Function
router.post("/customSearch", (req, res) => {
  res.set("Access-Control-Allow-Headers", "*");
  Buildingsite.find({},{ locationType : 1 , buildingName : 1, buildingSites : 1, _id : 1}).then(docs => {
      let idList = customSearch(util.inspect(docs, {showHidden: false, depth: null}) , req.body.search , req.body.withinBuilding );

      return idList;
  }).then(idList => {
    console.log(idList);
    Buildingsite.find({ _id : idList }).then(docs => {
      res.send(docs);
      console.log(docs);
    });
});
});



// global Search
router.post("/search", (req, res) => {
  res.set("Access-Control-Allow-Headers", "*");
  Buildingsite.find( { $text: { $search: "office" } }).exec(function(err, docs){
  if (err) {
    console.log(err)
    res.send("building not found");
    } else {
      console.log(docs.toString())
      res.send(docs);
    }
  });
});







// Add New Building + ( offices and buildingId ==> localName pairs)
router.post("/addBuilding", (req, res) => {
  let resultHolder = '';
  const toLow = req.body.buildingName.replace(/ +/g, "");;
  const lowBuildingName = toLow.toLowerCase();
  const buff = new Buffer(lowBuildingName);
  const base64data = buff.toString("base64");

  let arrSites = [];
  for (i = 0; i < req.body.Sites.length; i++) {
    let bsite = {
      Site: [
        {
          siteName: req.body.Sites[i]
        },
        {
          buildingId: []
        },
        {
          OfficeNames: []
        }
      ]
    };
    arrSites.push(bsite);
  }

  var newBuilding = new Buildingsite();
  newBuilding.buildingName = lowBuildingName;
  newBuilding.locationType = req.body.locationType;
  newBuilding.buildingSites = arrSites;

  if(req.body.locationType != "residential"){
  var newOffices = new Offices();
  let officeArray = [];
  for (var i = 0; i < req.body.offices.length; i++) {
    var temp = {
      officeName: req.body.offices[i],
      buildingName: lowBuildingName
    };
    officeArray.push(temp);
  }

  console.log("office");
  console.log(officeArray);

  Offices.collection.insert(officeArray, { ordered: false }, function (
    err,
    docs
  ) {
    if (err) {
      console.error(err);
      //    res.send(err);
    } else {
      console.log("Multiple documents inserted to Collection");
      resultHolder = resultHolder + " Office Collection Added ,  "
    }
  });

  }

  var newBids = new Bids();
  let bidsArray = [];
  for (var i = 0; i < req.body.buildingId.length; i++) {
    var temp = {
      buildingName: lowBuildingName,
      buildingId: req.body.buildingId[i],
      idName: req.body.idName[i]
    };
    bidsArray.push(temp);
  }


  if (
    lowBuildingName &&
    req.body.locationType &&
    req.body.Sites.length &&
    req.body.buildingId.length == req.body.idName.length
  ) {
    newBuilding.save((err, doc) => {
      if (!err) {
        resultHolder = resultHolder + " New Building Added ,  ";
      } else {
        console.log("error during record insertion : " + err);
      }
    });



    Bids.collection.insert(bidsArray, { ordered: false }, function (err, docs) {
      if (err) {
        console.error(err);
      } else {
        console.log("Multiple documents inserted to Collection");
          resultHolder = resultHolder + "  Building id sets added ,  ";
      }
    });

    res.send("buildingid : " +base_64(req.body.buildingName,req.body.locationType) + " \n " + resultHolder);
    console.log(resultHolder);
  } else {
    res.send("Error during insertion");
  }
});






// Add New Site / Update Existing (local Names will be supplied instead of building Ids)
router.post("/AddSiteByName", (req, res) => {
  res.set("Access-Control-Allow-Headers", "*");
  let buildingIdList = [];
  let localList =req.body.Site[1].buildingId;
  let bName = req.headers.buildingid != undefined ?  to_ascii(res,req.headers.buildingid) : to_ascii(res,"");
  if(bName != -1){
  Bids.find({ buildingName: bName, idName : localList }).then(docs => {
      for(var i = 0 ; i < docs.length ; i++){
        buildingIdList.push(docs[i].buildingId);
      }
       console.log(buildingIdList);

       if(buildingIdList.length == 0){
         throw new Error("local name => buildingId   pair not found");
       }
      return buildingIdList;

   }).then(buildingIdList =>{

    req.body.Site[1].buildingId = buildingIdList;
      Buildingsite.find({ buildingName: bName }, (err, docs) => {
        if (!err) {
          if (docs.length == 0) {
            res.send("building not found");
          } else {


            var siteExists = false;
            siteArr = [];
            for (var i = 0; i < docs[0].buildingSites.length; i++) {
              siteArr = siteArr.concat(docs[0].buildingSites[i].Site[0].siteName);
            }

            if (siteArr.includes(req.body.Site[0].siteName)) {
              siteExists = true;
            }

            if (siteExists) {

              var newBuildingID = new Set();
              var newOfficeName = new Set();
              var index;
              newBuildingID = req.body.Site[1].buildingId;
              newOfficeName = req.body.Site[2].OfficeNames;

              var earr;
              for (var i = 0; i < docs[0].buildingSites.length; i++) {
                if (
                  docs[0].buildingSites[i].Site[0].siteName ==
                  req.body.Site[0].siteName
                ) {
                  index = i;
                  earr = docs[0].buildingSites[i];
                  break;
                }
              }


              earr.Site[1].buildingId = earr.Site[1].buildingId.concat(
                newBuildingID
              );
              earr.Site[2].OfficeNames = earr.Site[2].OfficeNames.concat(
                newOfficeName
              );

              earr.Site[1].buildingId = [...new Set(earr.Site[1].buildingId)];
              earr.Site[2].OfficeNames = [...new Set(earr.Site[2].OfficeNames)];
              //////// Replacement
              var arr = [];
              arr = docs[0].buildingSites;
              arr[index] = earr;
              docs[0].buildingSites = arr;
              newDoc = docs[0];
              addSite(docs[0]._id, newDoc, res);
            } else {
              var bidArr = [];
              var flag = true;
              for (var i = 0; i < docs[0].buildingSites.length; i++) {
                bidArr = bidArr.concat(docs[0].buildingSites[i].Site[1].buildingId);
              }

              for (var i = 0; i < req.body.Site[1].buildingId.length; i++) {
                if (bidArr.includes(req.body.Site[1].buildingId[i])) {
                  flag = false;
                  break;
                }
              }

              if (flag) {
                var arr = [];
                arr = docs[0].buildingSites;
                arr.push(req.body);
                docs[0].buildingSites = arr;
                newDoc = docs[0];
                addSite(docs[0]._id, newDoc, res);
              } else {
                res.send(
                  "Building ID already exists in a different building or site, Enter unique ID or contact KONE "
                );
              }
            }
          }
        } else {
          res.send(err);
        }
      });

  }).catch( err => {
    let str = '';
    str = str + err;
    console.log(str)
    res.send(str)
  })
}
});




// List All Buildingid  ===> Local Name   Pairs
router.get("/buildingIdAndName", (req, res) => {
  let bName = req.headers.buildingid != undefined ?  to_ascii(res,req.headers.buildingid) : to_ascii(res,"");
  if(bName != -1){
  Bids.find({ buildingName: bName }, (err, docs) => {
    if (!err) {
      res.set("Access-Control-Allow-Headers", "*");
      res.json(docs);
    } else {
      res.set("Access-Control-Allow-Headers", "*");
      res.send(err);
      console.log(err);
    }
  });
}
});



//on Page Load
router.post("/onPageLoad", (req, res) => {
  let bName = req.headers.buildingid != undefined ?  to_ascii(res,req.headers.buildingid) : to_ascii(res,"");
  if(bName != -1){
  Buildingsite.find({ buildingName: bName }, (err, docs) => {
    if (err) {
      res.send("building not found");
    } else {
      res.send(docs);
    }
  });
}
});



// Delete existing Site of a building
router.post("/deleteSite", (req, res) => {
  let bName = req.headers.buildingid != undefined ?  to_ascii(res,req.headers.buildingid) : to_ascii(res,"");
  if(bName != -1){
  res.set("Access-Control-Allow-Headers", "*");
  Buildingsite.find({ buildingName: bName }, (err, docs) => {
    if (!err) {
      if (docs.length == 0) {
        res.send("building not found");
      } else {
        var index = -1;
        for (var i = 0; i < docs[0].buildingSites.length; i++) {
          if (docs[0].buildingSites[i].Site[0].siteName == req.body.siteName) {
            index = i;
            break;
          }
        }
        if (index >= 0) {
          var arr = [];
          arr = docs[0].buildingSites;
          arr.splice(index, 1);
          docs[0].buildingSites = arr;
          newDoc = docs[0];
          addSite(docs[0]._id, newDoc, res);
        } else {
          res.send(" Site not found");
        }
      }
    } else {
      res.send(err);
      console.log(err);
    }
  });
}
});





// Add New Site
router.post("/addSite", (req, res) => {
  res.set("Access-Control-Allow-Headers", "*");
  let bName = req.headers.buildingid != undefined ?  to_ascii(res,req.headers.buildingid) : to_ascii(res,"");
  if(bName != -1){
  Buildingsite.find({ buildingName: bName }, (err, docs) => {
    if (!err) {
      if (docs.length == 0) {
        res.send("building not found");
      } else {
        var siteExists = false;
        siteArr = [];
        for (var i = 0; i < docs[0].buildingSites.length; i++) {
          siteArr = siteArr.concat(docs[0].buildingSites[i].Site[0].siteName);
        }

        if (siteArr.includes(req.body.Site[0].siteName)) {
          siteExists = true;
        }

        if (siteExists) {

          var newBuildingID = new Set();
          var newOfficeName = new Set();
          var index;
          newBuildingID = req.body.Site[1].buildingId;
          newOfficeName = req.body.Site[2].OfficeNames;

          var earr;
          for (var i = 0; i < docs[0].buildingSites.length; i++) {
            if (
              docs[0].buildingSites[i].Site[0].siteName ==
              req.body.Site[0].siteName
            ) {
              index = i;
              earr = docs[0].buildingSites[i];
              break;
            }
          }


          earr.Site[1].buildingId = earr.Site[1].buildingId.concat(
            newBuildingID
          );
          earr.Site[2].OfficeNames = earr.Site[2].OfficeNames.concat(
            newOfficeName
          );

          earr.Site[1].buildingId = [...new Set(earr.Site[1].buildingId)];
          earr.Site[2].OfficeNames = [...new Set(earr.Site[2].OfficeNames)];
          //////// Replacement commeth
          var arr = [];
          arr = docs[0].buildingSites;
          arr[index] = earr;
          docs[0].buildingSites = arr;
          newDoc = docs[0];
          addSite(docs[0]._id, newDoc, res);
        } else {
          var bidArr = [];
          var flag = true;
          for (var i = 0; i < docs[0].buildingSites.length; i++) {
            bidArr = bidArr.concat(docs[0].buildingSites[i].Site[1].buildingId);
          }


          for (var i = 0; i < req.body.Site[1].buildingId.length; i++) {
            if (bidArr.includes(req.body.Site[1].buildingId[i])) {
              flag = false;
              break;
            }
          }

          if (flag) {
            var arr = [];
            arr = docs[0].buildingSites;
            arr.push(req.body);
            docs[0].buildingSites = arr;
            newDoc = docs[0];
            addSite(docs[0]._id, newDoc, res);
          } else {
            res.send(
              "Building ID already exists in a different building or site, Enter unique ID or contact KONE "
            );
          }
        }
      }
    } else {
      res.send(err);
    }
  });
}
});


// List offices in a particular building
router.post("/Office", (req, res) => {
  res.set("Access-Control-Allow-Headers", "*");
  let bName = req.headers.buildingid != undefined ?  to_ascii(res,req.headers.buildingid) : to_ascii(res,"");
  if(bName != -1){
  var officeName = req.body.officeName;
  Buildingsite.find({ buildingName: bName }, (err, docs) => {
    if (!err) {
      var arr = [];
      for (var i = 0; i < docs[0].buildingSites.length; i++) {
        for (var s = 0;s < docs[0].buildingSites[i].Site[2].OfficeNames.length;s++) {
          if (docs[0].buildingSites[i].Site[2].OfficeNames[s] == officeName) {
            var obj = {
              Office_SiteAccess: docs[0].buildingSites[i].Site[0].siteName,
              Office_BuildingAccess: docs[0].buildingSites[i].Site[1].buildingId
            };
            arr.push(obj);
          }
        }
      }
      res.json(arr);
    } else {
      res.send(err);
      console.log(err);
    }
  });
}
});




//List office IDs of a building
router.get("/listOfficeId", (req, res) => {
  res.set("Access-Control-Allow-Headers", "*");
  let bName = req.headers.buildingid != undefined ?  to_ascii(res,req.headers.buildingid) : to_ascii(res,"");
  if(bName != -1){
  Buildingsite.find({ buildingName: bName }, (err, docs) => {
    if (!err) {
      var arr = [];
      for (var i = 0; i < docs[0].buildingSites.length; i++) {
        for (
          var s = 0;
          s < docs[0].buildingSites[i].Site[2].OfficeNames.length;
          s++
        ) {
          var obj = {
            OfficeName: docs[0].buildingSites[i].Site[2].OfficeNames[s],
            Office_SiteAccess: docs[0].buildingSites[i].Site[0].siteName,
            Office_BuildingAccess: docs[0].buildingSites[i].Site[1].buildingId
          };
          arr.push(obj);
        }
      }
      res.json(arr);
    } else {
      res.send(err);
      console.log(err);
    }
  });
}
});






// List (1)Location And Office Names
router.get("/listLocationAndOfficeName", (req, res) => {
  res.set("Access-Control-Allow-Headers", "*");
  let bName = req.headers.buildingid != undefined ?  to_ascii(res,req.headers.buildingid) : to_ascii(res,"");
  if(bName != -1){
  Buildingsite.find({ buildingName: bName }, (err, docs) => {
    if (!err) {
      var arr = [];
      for (var i = 0; i < docs[0].buildingSites.length; i++) {
        for (var s = 0;s < docs[0].buildingSites[i].Site[2].OfficeNames.length;s++) {
          var obj = docs[0].buildingSites[i].Site[2].OfficeNames[s];
          arr.push(obj);
        }
      }
      let toSend = {
        locationType : docs[0].locationType,
        officeNames : arr
      };

      res.json(toSend);

    } else {
      res.send(err);
      console.log(err);
    }
  });
}
});






// List all buildingIds of a particular building
router.get("/listBuildingId", (req, res) => {
  res.set("Access-Control-Allow-Headers", "*");
  console.log("header is : " +  req.headers.buildingid)
  let bName = req.headers.buildingid != undefined ?  to_ascii(res,req.headers.buildingid) : to_ascii(res,"");
  if(bName != -1){
  Buildingsite.find({ buildingName: bName }, (err, docs) => {
    if (!err) {
      var arr = [];
      for (var i = 0; i < docs[0].buildingSites.length; i++) {
        console.log(docs[0].buildingSites[i].Site[1].buildingId);
        arr = arr.concat(docs[0].buildingSites[i].Site[1].buildingId);
      }
      res.json(arr);
    } else {
      res.send(err);
      console.log(err);
    }
  });
}
});






// List Offices of a Building
router.get("/listOffice", (req, res) => {
  res.set("Access-Control-Allow-Headers", "*");
  let bName = req.headers.buildingid != undefined ?  to_ascii(res,req.headers.buildingid) : to_ascii(res,"");
  if(bName != -1){
  var arr = [];
  var officeArr = [];
  async function origanalList() {
    Buildingsite.find({ buildingName: bName }, (err, docs) => {
      if (!err) {
        for (var i = 0; i < docs[0].buildingSites.length; i++) {
          arr = arr.concat(docs[0].buildingSites[i].Site[2].OfficeNames);
        }
        arr = arr.concat(officeArr);
        arr = [...new Set(arr)];
        res.json(arr);
      } else {
        res.send(err);
      }
    });
   }
  }

  function getOfficeList(callback) {
    Offices.find((err, docs) => {
      if (!err) {
        for (var s = 0; s < docs.length; s++) {
          console.log(" pushed " + docs[s].officeName);
          officeArr.push(docs[s].officeName);
        }
        console.log("officeArr " + officeArr);
        console.log("1");
        callback();
      } else {
        console.log(err);
      }
    });
  }
  getOfficeList(origanalList);
});







// list Sites of a particular Building
router.get("/listSites", (req, res) => {
  res.set("Access-Control-Allow-Headers", "*");
  let bName = req.headers.buildingid != undefined ?  to_ascii(res,req.headers.buildingid) : to_ascii(res,"");
  if(bName != -1){
  Buildingsite.find({ buildingName: bName }, (err, docs) => {
    if (!err) {
      console.log("complete doc shown to user");
      var arr = [];
      for (var i = 0; i < docs[0].buildingSites.length; i++) {
        console.log(docs[0].buildingSites[i].Site[0].siteName);
        arr.push(docs[0].buildingSites[i].Site[0].siteName);
      }
      res.json(arr);
    } else {
      res.send(err);
      console.log(err);
    }
  });
}
});






// list 1 Building Detail
router.get("/buildingDetails", (req, res) => {
  res.set("Access-Control-Allow-Headers", "*");
  let bName = req.headers.buildingid != undefined ?  to_ascii(res,req.headers.buildingid) : to_ascii(res,"");
  if(bName != -1){
  Buildingsite.find({ buildingName: bName }, (err, docs) => {
    if (!err) {
      console.log("complete doc shown to user");
      res.set("Access-Control-Allow-Headers", "*");
      res.json(docs);
    } else {
      res.set("Access-Control-Allow-Headers", "*");
      res.send(err);
      console.log(err);
    }
  });
}
});






// create New Office
router.post("/createOffice", (req, res) => {
  res.set("Access-Control-Allow-Headers", "*");
  if (req.body._id == null) {
    console.log("inserting new record");
    insertOffice(req, res);
  } else {
    res.send("office already exists");
  }
});







// Insert New Office
function insertOffice(req, res) {
  var office = new Offices();
  office.officeName = req.body.officeName;
  office.buildingName = "kosmoone";
  office.save((err, doc) => {
    if (!err) {
      console.log("office added");
      res.send("office added \n" + office);
    } else {
      console.log("error during record insertion : " + err);
      res.send("error during record insertion : " + err);
    }
  });
}






// add / Update Existing Site
function addSite(id, newDoc, res) {
  Buildingsite.findOneAndUpdate(
    { _id: id },
    newDoc,
    { new: true },
    (err, doc) => {
      if (!err) {
        res.json(newDoc);
      } else {
        if (err.name == "ValidationError") {
          console.log("volidation error");
          res.send("validation error " + err);
        } else {
          console.log("Error during record update : " + err);
          res.send("Error during record update : " + err);
        }
      }
    }
  );
}



// text => base64
function base_64(str1, str2){
return Buffer.from((str1+":"+str2)).toString('base64');
}



// base64 => text
function to_ascii(res,str){
if(str != ""){
  str = Buffer.from(str,'base64').toString('ascii');
  if(str.includes(":office") || str.includes(":residential")){
      return str.split(":")[0];
   }else{
       res.send("buildingid header is not valid");
       return -1;
   }
}else{
    res.send("buildingid is missing");
    return -1;
    }
}



// Custom database search function
function customSearch(str , search , withinBuilding){
  str = str.toLowerCase();
  search = search.toLowerCase();
  let pushIndex = 0;;
  let idHolder;
  while(pushIndex != -1){
    pushIndex = str.indexOf("_id", pushIndex);
    if(pushIndex == -1){
      break;
    }
    idHolder = str.slice(pushIndex ,pushIndex + 29);
    str = str.slice(0,pushIndex) + str.slice(pushIndex + 30);
    let res = '';
    let insertIndex;
    for(var i = pushIndex ;  ; i++){
      pushIndex++;
      res= res + str[i];
      if(str[i] == '}'){
        str = str.slice(0, i) + idHolder + str.slice(i);
        break;
      }
    }
  }
  str = str.replace(/(?!i)(?!d)(?!:)[a-zA-Z]*:/g, '');
  console.log(str);
  let idList = [];
  let index = 0;
  while(index != -1){
   index = str.indexOf(search ,index);
   if(index == -1){
     break;
   }
   console.log(" index of search : " + index + " word is " + str.slice(index,index + search.length));
   index = str.indexOf("_id", index);
   console.log(" index of _id : "  +index +  "  id is : " + str.slice(index + 5,index + 29));
   idList.push(str.slice(index + 5,index + 29))
  }
  return idList;
}



// validate Email
function validateEmail(email) {
  var re = /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
  return re.test(String(email).toLowerCase());
}


module.exports = router;