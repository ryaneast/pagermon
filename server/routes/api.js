var express = require('express');
var bodyParser = require('body-parser');
var router = express.Router();
var basicAuth = require('express-basic-auth');
var bcrypt = require('bcryptjs');
var passport = require('passport');
var util = require('util');
var pluginHandler = require('../plugins/pluginHandler');
var logger = require('../log');
require('../config/passport')(passport); // pass passport for configuration

var nconf = require('nconf');
var conf_file = './config/config.json';
nconf.file({file: conf_file});
nconf.load();

router.use(bodyParser.json());       // to support JSON-encoded bodies
router.use(bodyParser.urlencoded({     // to support URL-encoded bodies
  extended: true
}));

router.use(function (req, res, next) {
  res.locals.login = req.isAuthenticated();
  next();
});

var sqlite3 = require('sqlite3').verbose();
var db = new sqlite3.Database('./messages.db');
    db.configure("busyTimeout", 30000);

// defaults
var initData = {};
    initData.limit = nconf.get('messages:defaultLimit');
    initData.replaceText = nconf.get('messages:replaceText');
    initData.currentPage = 0;
    initData.pageCount = 0;
    initData.msgCount = 0;
    initData.offset = 0;

// auth variables
var HideCapcode = nconf.get('messages:HideCapcode');
var apiSecurity = nconf.get('messages:apiSecurity');


///////////////////
//               //
// GET messages  //
//               //
///////////////////

/* GET message listing. */
router.get('/messages', isLoggedIn, function(req, res, next) {
  nconf.load();
  console.time('init');
  var pdwMode = nconf.get('messages:pdwMode');
  var maxLimit = nconf.get('messages:maxLimit');
  var defaultLimit = nconf.get('messages:defaultLimit');
  initData.replaceText = nconf.get('messages:replaceText');
  if (typeof req.query.page !== 'undefined') {
    var page = parseInt(req.query.page, 10);
    if (page > 0) {
      initData.currentPage = page - 1;
    } else {
      initData.currentPage = 0;
    }
  }
  if (req.query.limit && req.query.limit <= maxLimit) {
    initData.limit = parseInt(req.query.limit, 10);
  } else {
    initData.limit = parseInt(defaultLimit, 10);
  }
  var initSql;
  if (pdwMode) {
    initSql =  "SELECT COUNT(*) AS msgcount FROM messages WHERE alias_id IN (SELECT id FROM capcodes WHERE ignore = 0);";
  } else {
    initSql = "SELECT COUNT(*) AS msgcount FROM messages WHERE alias_id IS NULL OR alias_id NOT IN (SELECT id FROM capcodes WHERE ignore = 1);";
  }
  db.get(initSql,function(err,count){
    if (err) {
      logger.main.error(err);
    } else if (count) {
      initData.msgCount = count.msgcount;
      initData.pageCount = Math.ceil(initData.msgCount/initData.limit);
      if (initData.currentPage > initData.pageCount) {
        initData.currentPage = 0;
      }
      initData.offset = initData.limit * initData.currentPage;
      if (initData.offset < 0) {
        initData.offset = 0;
      }
      initData.offsetEnd = initData.offset + initData.limit;
      console.timeEnd('init');
      console.time('sql');

      var sql;
      sql =  "SELECT messages.*, capcodes.alias, capcodes.agency, capcodes.icon, capcodes.color, capcodes.ignore, capcodes.id AS aliasMatch ";
      sql += " FROM messages";
      if(pdwMode) {
        sql += " INNER JOIN capcodes ON capcodes.id = messages.alias_id WHERE capcodes.ignore = 0";
      } else {
        sql += " LEFT JOIN capcodes ON capcodes.id = messages.alias_id WHERE capcodes.ignore = 0 OR capcodes.ignore IS NULL ";
      }
      sql += " ORDER BY messages.timestamp DESC LIMIT "+initData.limit+" OFFSET "+initData.offset+";";

      var result = [];
      db.each(sql,function(err,row){
        //outRow = JSON.parse(newrow);
        /**if (row.agency == "CFA") {
          if (row.address.includes("N")) {
            row = {
              "id": row.id,
              "address": row.address,
              "message": row.message,
              "source": row.source,
              "timestamp": row.timestamp,
              "alias_id": row.alias_id,
              "alias": row.alias,
              "agency": row.agency,
              "icon": row.icon,
              "color": "purple",
              "ignore": row.ignore,
              "aliasMatch": row.aliasMatch
            };
          }
          if (row.address.includes("E")) {

            row = {
              "id": row.id,
              "address": row.address,
              "message": row.message,
              "source": row.source,
              "timestamp": row.timestamp,
              "alias_id": row.alias_id,
              "alias": row.alias,
              "agency": row.agency,
              "icon": row.icon,
              "color": "red",
              "ignore": row.ignore,
              "aliasMatch": row.aliasMatch
            };
          }
        }
        if (row.agency == "SES") {
          if (row.address.includes("E")) {

            row = {
              "id": row.id,
              "address": row.address,
              "message": row.message,
              "source": row.source,
              "timestamp": row.timestamp,
              "alias_id": row.alias_id,
              "alias": row.alias,
              "agency": row.agency,
              "icon": row.icon,
              "color": "red",
              "ignore": row.ignore,
              "aliasMatch": row.aliasMatch
            };
          }
          if (row.address.includes("N")) {
            row = {
              "id": row.id,
              "address": row.address,
              "message": row.message,
              "source": row.source,
              "timestamp": row.timestamp,
              "alias_id": row.alias_id,
              "alias": row.alias,
              "agency": row.agency,
              "icon": row.icon,
              "color": "orange",
              "ignore": row.ignore,
              "aliasMatch": row.aliasMatch
            };
          }
        }
        if (row.agency == "AV") {
          row = {
            "id": row.id,
            "address": row.address,
            "message": row.message,
            "source": row.source,
            "timestamp": row.timestamp,
            "alias_id": row.alias_id,
            "alias": row.alias,
            "agency": row.agency,
            "icon": row.icon,
            "color": "blue",
            "ignore": row.ignore,
            "aliasMatch": row.aliasMatch
          };
        }

        if (row.address.includes("A")) {
          row = {
            "id": row.id,
            "address": row.address,
            "message": row.message,
            "source": row.source,
            "timestamp": row.timestamp,
            "alias_id": row.alias_id,
            "alias": row.alias,
            "agency": row.agency,
            "icon": row.icon,
            "color": "black",
            "ignore": row.ignore,
            "aliasMatch": row.aliasMatch
          };
        }**/
        if (row.agency == "AV") {
          if (row.EAS_type === 0) {
            row = {
              "id": row.id,
              "address": row.address,
              "message": row.message,
              "source": row.source,
              "timestamp": row.timestamp,
              "alias_id": row.alias_id,
              "alias": row.alias,
              "agency": row.agency,
              "icon": row.icon,
              "color": "blue",
              "ignore": row.ignore,
              "aliasMatch": row.aliasMatch
            };
          }
          if (row.EAS_type === 1) {
            row = {
              "id": row.id,
              "address": row.address,
              "message": row.message,
              "source": row.source,
              "timestamp": row.timestamp,
              "alias_id": row.alias_id,
              "alias": row.alias,
              "agency": row.agency,
              "icon": row.icon,
              "color": "purple",
              "ignore": row.ignore,
              "aliasMatch": row.aliasMatch
            };
          }
            if (row.EAS_type === 2) {
              row = {
                "id": row.id,
                "address": row.address,
                "message": row.message,
                "source": row.source,
                "timestamp": row.timestamp,
                "alias_id": row.alias_id,
                "alias": row.alias,
                "agency": row.agency,
                "icon": row.icon,
                "color": "black",
                "ignore": row.ignore,
                "aliasMatch": row.aliasMatch
              };
            }
          if (row.EAS_type === 3) {
            row = {
              "id": row.id,
              "address": row.address,
              "message": row.message,
              "source": row.source,
              "timestamp": row.timestamp,
              "alias_id": row.alias_id,
              "alias": row.alias,
              "agency": row.agency,
              "icon": row.icon,
              "color": "blue",
              "ignore": row.ignore,
              "aliasMatch": row.aliasMatch
            };
          }
        } else {
          if (row.EAS_type === 0) {
            row = {
              "id": row.id,
              "address": row.address,
              "message": row.message,
              "source": row.source,
              "timestamp": row.timestamp,
              "alias_id": row.alias_id,
              "alias": row.alias,
              "agency": row.agency,
              "icon": row.icon,
              "color": "red",
              "ignore": row.ignore,
              "aliasMatch": row.aliasMatch
            };
          }
          if (row.EAS_type === 1) {
            row = {
              "id": row.id,
              "address": row.address,
              "message": row.message,
              "source": row.source,
              "timestamp": row.timestamp,
              "alias_id": row.alias_id,
              "alias": row.alias,
              "agency": row.agency,
              "icon": row.icon,
              "color": "purple",
              "ignore": row.ignore,
              "aliasMatch": row.aliasMatch
            };
          }
            if (row.EAS_type === 2) {
              row = {
                "id": row.id,
                "address": row.address,
                "message": row.message,
                "source": row.source,
                "timestamp": row.timestamp,
                "alias_id": row.alias_id,
                "alias": row.alias,
                "agency": row.agency,
                "icon": row.icon,
                "color": "black",
                "ignore": row.ignore,
                "aliasMatch": row.aliasMatch
              };
            }
          if (row.EAS_type === 3) {
            row = {
              "id": row.id,
              "address": row.address,
              "message": row.message,
              "source": row.source,
              "timestamp": row.timestamp,
              "alias_id": row.alias_id,
              "alias": row.alias,
              "agency": row.agency,
              "icon": row.icon,
              "color": "grey",
              "ignore": row.ignore,
              "aliasMatch": row.aliasMatch
            };
          }
        }
        if (HideCapcode) {
          if (!req.isAuthenticated()) {
            row = {
              "id": row.id,
              "message": row.message,
              "source": row.source,
              "timestamp": row.timestamp,
              "alias_id": row.alias_id,
              "alias": row.alias,
              "agency": row.agency,
              "icon": row.icon,
              "color": row.color,
              "ignore": row.ignore,
              "aliasMatch": row.aliasMatch
            };
          }
        }
        if (err) {
          logger.main.error(err);
        } else if (row) {
          result.push(row);
        } else {
          logger.main.info('empty results');
        }
      },function(err,rowCount){
        if (err) {
          console.timeEnd('sql');
          logger.main.error(err);
          res.status(500).send(err);
        } else if (rowCount > 0) {
          console.timeEnd('sql');
          //var limitResults = result.slice(initData.offset, initData.offsetEnd);
          console.time('send');
          res.status(200).json({'init': initData, 'messages': result});
          console.timeEnd('send');
        } else {
          res.status(200).json({'init': {}, 'messages': []});
        }
      });
    } else {
      logger.main.info('empty results');
    }
  });
});

router.get('/messages/:id', isLoggedIn, function(req, res, next) {
  nconf.load();
  var pdwMode = nconf.get('messages:pdwMode');
  var id = req.params.id;
  var sql =  "SELECT messages.*, capcodes.alias, capcodes.agency, capcodes.icon, capcodes.color, capcodes.ignore, capcodes.id AS aliasMatch ";
      sql += " FROM messages";
      sql += " LEFT JOIN capcodes ON capcodes.id = messages.alias_id ";
      sql += " WHERE messages.id = "+id;
  db.serialize(() => {
    db.get(sql,function(err,row){
      if (err) {
        res.status(500).send(err);
      } else {
        /**if (row.agency == "CFA") {
          if (row.address.includes("N")) {
            row = {
              "id": row.id,
              "address": row.address,
              "message": row.message,
              "source": row.source,
              "timestamp": row.timestamp,
              "alias_id": row.alias_id,
              "alias": row.alias,
              "agency": row.agency,
              "icon": row.icon,
              "color": "purple",
              "ignore": row.ignore,
              "aliasMatch": row.aliasMatch
            };
          }
          if (row.address.includes("E")) {

            row = {
              "id": row.id,
              "address": row.address,
              "message": row.message,
              "source": row.source,
              "timestamp": row.timestamp,
              "alias_id": row.alias_id,
              "alias": row.alias,
              "agency": row.agency,
              "icon": row.icon,
              "color": "red",
              "ignore": row.ignore,
              "aliasMatch": row.aliasMatch
            };
          }
        }
        if (row.agency == "SES") {
          if (row.address.includes("E")) {

            row = {
              "id": row.id,
              "address": row.address,
              "message": row.message,
              "source": row.source,
              "timestamp": row.timestamp,
              "alias_id": row.alias_id,
              "alias": row.alias,
              "agency": row.agency,
              "icon": row.icon,
              "color": "red",
              "ignore": row.ignore,
              "aliasMatch": row.aliasMatch
            };
          }
          if (row.address.includes("N")) {
            row = {
              "id": row.id,
              "address": row.address,
              "message": row.message,
              "source": row.source,
              "timestamp": row.timestamp,
              "alias_id": row.alias_id,
              "alias": row.alias,
              "agency": row.agency,
              "icon": row.icon,
              "color": "orange",
              "ignore": row.ignore,
              "aliasMatch": row.aliasMatch
            };
          }
        }
        if (row.agency == "AV") {
          row = {
            "id": row.id,
            "address": row.address,
            "message": row.message,
            "source": row.source,
            "timestamp": row.timestamp,
            "alias_id": row.alias_id,
            "alias": row.alias,
            "agency": row.agency,
            "icon": row.icon,
            "color": "blue",
            "ignore": row.ignore,
            "aliasMatch": row.aliasMatch
          };
        }

        if (row.address.includes("A")) {
          row = {
            "id": row.id,
            "address": row.address,
            "message": row.message,
            "source": row.source,
            "timestamp": row.timestamp,
            "alias_id": row.alias_id,
            "alias": row.alias,
            "agency": row.agency,
            "icon": row.icon,
            "color": "black",
            "ignore": row.ignore,
            "aliasMatch": row.aliasMatch
          };
        }**/
        if (row.EAS_type === 0) {
          row = {
            "id": row.id,
            "address": row.address,
            "message": row.message,
            "source": row.source,
            "timestamp": row.timestamp,
            "alias_id": row.alias_id,
            "alias": row.alias,
            "agency": row.agency,
            "icon": row.icon,
            "color": "red",
            "ignore": row.ignore,
            "aliasMatch": row.aliasMatch
          };
        }
        if (row.EAS_type === 1) {
          row = {
            "id": row.id,
            "address": row.address,
            "message": row.message,
            "source": row.source,
            "timestamp": row.timestamp,
            "alias_id": row.alias_id,
            "alias": row.alias,
            "agency": row.agency,
            "icon": row.icon,
            "color": "purple",
            "ignore": row.ignore,
            "aliasMatch": row.aliasMatch
          };
        }
        if (row.EAS_type === 2) {
          row = {
            "id": row.id,
            "address": row.address,
            "message": row.message,
            "source": row.source,
            "timestamp": row.timestamp,
            "alias_id": row.alias_id,
            "alias": row.alias,
            "agency": row.agency,
            "icon": row.icon,
            "color": "black",
            "ignore": row.ignore,
            "aliasMatch": row.aliasMatch
          };
        }
        if (row.EAS_type === 3) {
          row = {
            "id": row.id,
            "address": row.address,
            "message": row.message,
            "source": row.source,
            "timestamp": row.timestamp,
            "alias_id": row.alias_id,
            "alias": row.alias,
            "agency": row.agency,
            "icon": row.icon,
            "color": "grey",
            "ignore": row.ignore,
            "aliasMatch": row.aliasMatch
          };
        }
        if (HideCapcode) {
          if (!req.isAuthenticated()) {
            row = {
              "id": row.id,
              "message": row.message,
              "source": row.source,
              "timestamp": row.timestamp,
              "alias_id": row.alias_id,
              "alias": row.alias,
              "agency": row.agency,
              "icon": row.icon,
              "color": row.color,
              "ignore": row.ignore,
              "aliasMatch": row.aliasMatch
            };
          }
        }
        if(row.ignore == 1) {
          res.status(200).json({});
        } else {
          if(pdwMode && !row.alias) {
            res.status(200).json({});
          } else {
            res.status(200).json(row);
          }
        }
      }
    });
  });
});

/* GET message search */
router.get('/messageSearch', isLoggedIn, function(req, res, next) {
  nconf.load();
  console.time('init');
  var pdwMode = nconf.get('messages:pdwMode');
  var maxLimit = nconf.get('messages:maxLimit');
  var defaultLimit = nconf.get('messages:defaultLimit');
  initData.replaceText = nconf.get('messages:replaceText');

  if (typeof req.query.page !== 'undefined') {
    var page = parseInt(req.query.page, 10);
    if (page > 0) {
      initData.currentPage = page - 1;
    } else {
      initData.currentPage = 0;
    }
  }
  if (req.query.limit && req.query.limit <= maxLimit) {
    initData.limit = parseInt(req.query.limit, 10);
  } else {
    initData.limit = parseInt(defaultLimit, 10);
  }

  var query;
  var agency;
  var address;
  // dodgy handling for unexpected results
  if (typeof req.query.q !== 'undefined') { query = req.query.q;
  } else { query = ''; }
  if (typeof req.query.agency !== 'undefined') { agency = req.query.agency;
  } else { agency = ''; }
  if (typeof req.query.address !== 'undefined') { address = req.query.address;
  } else { address = ''; }
  var sql;

  // set select commands based on query type
  // address can be address or source field
  if (query != '') {
    sql = `SELECT messages.*, capcodes.alias, capcodes.agency, capcodes.icon, capcodes.color, capcodes.ignore, capcodes.id AS aliasMatch
    FROM messages_search_index
    LEFT JOIN messages ON messages.id = messages_search_index.rowid `;
  } else {
    sql = `SELECT messages.*, capcodes.alias, capcodes.agency, capcodes.icon, capcodes.color, capcodes.ignore, capcodes.id AS aliasMatch 
    FROM messages `;
  }
  if(pdwMode) {
    sql += " INNER JOIN capcodes ON capcodes.id = messages.alias_id";
  } else {
    sql += " LEFT JOIN capcodes ON capcodes.id = messages.alias_id ";
  }
  sql += ' WHERE';
  if(query != '') {
    sql += ` messages_search_index MATCH ?`;
  } else {
    if(address != '')
      sql += ` messages.address LIKE "${address}" OR messages.source = "${address}" OR `;
    if(agency != '')
      sql += ` messages.alias_id IN (SELECT id FROM capcodes WHERE agency = "${agency}" AND ignore = 0) OR `;
    sql += ' messages.id IS ?';
  }
  
  sql += " ORDER BY messages.timestamp DESC;";

  console.timeEnd('init');
  console.time('sql');

  var rows = [];
  db.each(sql,query,function(err,row){
    if (err) {
      logger.main.error(err);
    } else if (row) {
      /**if (row.agency == "CFA") {
        if (row.address.includes("N")) {
          row = {
            "id": row.id,
            "address": row.address,
            "message": row.message,
            "source": row.source,
            "timestamp": row.timestamp,
            "alias_id": row.alias_id,
            "alias": row.alias,
            "agency": row.agency,
            "icon": row.icon,
            "color": "purple",
            "ignore": row.ignore,
            "aliasMatch": row.aliasMatch
          };
        }
        if (row.address.includes("E")) {

          row = {
            "id": row.id,
            "address": row.address,
            "message": row.message,
            "source": row.source,
            "timestamp": row.timestamp,
            "alias_id": row.alias_id,
            "alias": row.alias,
            "agency": row.agency,
            "icon": row.icon,
            "color": "red",
            "ignore": row.ignore,
            "aliasMatch": row.aliasMatch
          };
        }
      }
      if (row.agency == "SES") {
        if (row.address.includes("E")) {

          row = {
            "id": row.id,
            "address": row.address,
            "message": row.message,
            "source": row.source,
            "timestamp": row.timestamp,
            "alias_id": row.alias_id,
            "alias": row.alias,
            "agency": row.agency,
            "icon": row.icon,
            "color": "red",
            "ignore": row.ignore,
            "aliasMatch": row.aliasMatch
          };
        }
        if (row.address.includes("N")) {
          row = {
            "id": row.id,
            "address": row.address,
            "message": row.message,
            "source": row.source,
            "timestamp": row.timestamp,
            "alias_id": row.alias_id,
            "alias": row.alias,
            "agency": row.agency,
            "icon": row.icon,
            "color": "orange",
            "ignore": row.ignore,
            "aliasMatch": row.aliasMatch
          };
        }
      }
      if (row.agency == "AV") {
        row = {
          "id": row.id,
          "address": row.address,
          "message": row.message,
          "source": row.source,
          "timestamp": row.timestamp,
          "alias_id": row.alias_id,
          "alias": row.alias,
          "agency": row.agency,
          "icon": row.icon,
          "color": "blue",
          "ignore": row.ignore,
          "aliasMatch": row.aliasMatch
        };
      }

      if (row.address.includes("A")) {
        row = {
          "id": row.id,
          "address": row.address,
          "message": row.message,
          "source": row.source,
          "timestamp": row.timestamp,
          "alias_id": row.alias_id,
          "alias": row.alias,
          "agency": row.agency,
          "icon": row.icon,
          "color": "black",
          "ignore": row.ignore,
          "aliasMatch": row.aliasMatch
        };
      }**/
      if (row.EAS_type === 0) {
        row = {
          "id": row.id,
          "address": row.address,
          "message": row.message,
          "source": row.source,
          "timestamp": row.timestamp,
          "alias_id": row.alias_id,
          "alias": row.alias,
          "agency": row.agency,
          "icon": row.icon,
          "color": "red",
          "ignore": row.ignore,
          "aliasMatch": row.aliasMatch
        };
      }
      if (row.EAS_type === 1) {
        row = {
          "id": row.id,
          "address": row.address,
          "message": row.message,
          "source": row.source,
          "timestamp": row.timestamp,
          "alias_id": row.alias_id,
          "alias": row.alias,
          "agency": row.agency,
          "icon": row.icon,
          "color": "purple",
          "ignore": row.ignore,
          "aliasMatch": row.aliasMatch
        };
      }
      if (row.EAS_type === 2) {
        row = {
          "id": row.id,
          "address": row.address,
          "message": row.message,
          "source": row.source,
          "timestamp": row.timestamp,
          "alias_id": row.alias_id,
          "alias": row.alias,
          "agency": row.agency,
          "icon": row.icon,
          "color": "black",
          "ignore": row.ignore,
          "aliasMatch": row.aliasMatch
        };
      }
      if (row.EAS_type === 3) {
        row = {
          "id": row.id,
          "address": row.address,
          "message": row.message,
          "source": row.source,
          "timestamp": row.timestamp,
          "alias_id": row.alias_id,
          "alias": row.alias,
          "agency": row.agency,
          "icon": row.icon,
          "color": "grey",
          "ignore": row.ignore,
          "aliasMatch": row.aliasMatch
        };
      }
      if (HideCapcode) {
        if (!req.isAuthenticated()) {
          row = {
            "id": row.id,
            "message": row.message,
            "source": row.source,
            "timestamp": row.timestamp,
            "alias_id": row.alias_id,
            "alias": row.alias,
            "agency": row.agency,
            "icon": row.icon,
            "color": row.color,
            "ignore": row.ignore,
            "aliasMatch": row.aliasMatch
          };
        }
      }
      if (pdwMode) {
        if (row.ignore == 0)
          rows.push(row);
      } else {
        if (!row.ignore || row.ignore == 0)
          rows.push(row);
      }
    } else {
      logger.main.info('empty results');
    }
  },function(err,rowCount){
    if (err) {
      console.timeEnd('sql');
      logger.main.error(err);
      res.status(500).send(err);
    } else if (rowCount > 0) {
      console.timeEnd('sql');
      var result = rows;
      console.time('initEnd');
      initData.msgCount = result.length;
      initData.pageCount = Math.ceil(initData.msgCount/initData.limit);
      if (initData.currentPage > initData.pageCount) {
        initData.currentPage = 0;
      }
      initData.offset = initData.limit * initData.currentPage;
      if (initData.offset < 0) {
        initData.offset = 0;
      }
      initData.offsetEnd = initData.offset + initData.limit;
      var limitResults = result.slice(initData.offset, initData.offsetEnd);

      console.timeEnd('initEnd');
      res.json({'init': initData, 'messages': limitResults});
    } else {
      console.timeEnd('sql');
      res.status(200).json({'init': {}, 'messages': []});
    }
  });
});

///////////////////
//               //
// GET capcodes  //
//               //
///////////////////


// capcodes aren't pagified at the moment, this should probably be removed
router.get('/capcodes/init', isLoggedIn, function(req, res, next) {
  //set current page if specifed as get variable (eg: /?page=2)
  if (typeof req.query.page !== 'undefined') {
    var page = parseInt(req.query.page, 10);
    if (page > 0)
      initData.currentPage = page - 1;
  }
  db.serialize(() => {
    db.get("SELECT id FROM capcodes ORDER BY id DESC LIMIT 1", [], function(err, row) {
      if (err) {
        logger.main.error(err);
      } else {
        initData.msgCount = parseInt(row['id'], 10);
        //console.log(initData.msgCount);
        initData.pageCount = Math.ceil(initData.msgCount/initData.limit);
        var offset = initData.limit * initData.currentPage;
        initData.offset = initData.msgCount - offset;
        if (initData.offset < 0) {
          initData.offset = 0;
        }
        res.json(initData);
      }
    });
  });
});

// all capcode get methods are only used in admin area, so lock down to logged in users as they may contain sensitive data

router.get('/capcodes', isLoggedIn, function(req, res, next) {
  db.serialize(() => {
    db.all("SELECT * from capcodes ORDER BY REPLACE(address, '_', '%')",function(err,rows){
      if (err) return next(err);
      res.json(rows);
    });
  });
});

router.get('/capcodes/:id', isLoggedIn, function(req, res, next) {
  var id = req.params.id;
  db.serialize(() => {
    db.get("SELECT * from capcodes WHERE id=?", id, function(err, row){
      if (err) {
        res.status(500);
        res.send(err);
      } else {
        if (row) {
          row.pluginconf = parseJSON(row.pluginconf);
          res.status(200);
          res.json(row);
        } else {
          row = {
            "id": "",
            "address": "",
            "alias": "",
            "agency": "",
            "icon": "question",
            "color": "black",
            "ignore": 0,
            "pluginconf": {}
          };
          res.status(200);
          res.json(row);
        }
      }
    });
  });
});

router.get('/capcodeCheck/:id', isLoggedIn, function(req, res, next) {
  var id = req.params.id;
  db.serialize(() => {
    db.get("SELECT * from capcodes WHERE address=?", id, function(err, row){
      if (err) {
        res.status(500);
        res.send(err);
      } else {
        if (row) {
          row.pluginconf = parseJSON(row.pluginconf);
          res.status(200);
          res.json(row);
        } else {
          row = {
            "id": "",
            "address": "",
            "alias": "",
            "agency": "",
            "icon": "question",
            "color": "black",
            "ignore": 0,
            "pluginconf": {}
          };
          res.status(200);
          res.json(row);
        }
      }
    });
  });
});

router.get('/capcodes/agency/:id', isLoggedIn, function(req, res, next) {
  var id = req.params.id;
  db.serialize(() => {
    db.all("SELECT * from capcodes WHERE agency LIKE ?", id, function(err,rows){
      if (err) {
        res.status(500);
        res.send(err);
      } else {
        res.status(200);
        res.json(rows);
      }
    });
  });
});

//////////////////////////////////
//
// POST calls below
//
//////////////////////////////////
router.post('/messages', isLoggedIn, function(req, res, next) {
  nconf.load();
  if (req.body.address && req.body.message) {
    var filterDupes = nconf.get('messages:duplicateFiltering');
    var dupeLimit = nconf.get('messages:duplicateLimit') || 0; // default 0
    var dupeTime = nconf.get('messages:duplicateTime') || 0; // default 0
    var pdwMode = nconf.get('messages:pdwMode');
    var data = req.body;
        data.pluginData = {};

    // send data to pluginHandler before proceeding
    logger.main.debug('beforeMessage start');
    pluginHandler.handle('message', 'before', data, function(response) {
      logger.main.debug(util.format('%o',response));
      logger.main.debug('beforeMessage done');
      if (response && response.pluginData) {
        // only set data to the response if it's non-empty and still contains the pluginData object
        data = response;
      }
      if (data.pluginData.ignore) {
        // stop processing
        res.status(200);
        return res.send('Ignoring filtered');
      }
      db.serialize(() => {
        var address = data.address || '0000000';
        var message = data.message.replace(/["]+/g, '') || 'null';
        var datetime = data.datetime || 1;
        var timeDiff = datetime - dupeTime;
        var source = data.source || 'UNK';
        var EAStype = data.EAS_type;
        
        var dupeCheck = 'SELECT * FROM messages WHERE ';
        if (dupeLimit != 0 || dupeTime != 0) {
          dupeCheck += 'id IN ( SELECT id FROM messages ';
          if (dupeTime != 0) {
            dupeCheck += 'WHERE timestamp > '+timeDiff+' ';
          }
          if (dupeLimit != 0) {
            dupeCheck += 'ORDER BY id DESC LIMIT '+dupeLimit;
          }
          dupeCheck +=' ) AND message LIKE "'+message+'" AND address="'+address+'";';
        } else {
          dupeCheck += 'message LIKE "'+message+'" AND address="'+address+'";';
        }
  
        db.get(dupeCheck, [], function (err, row) {
          if (err) {
            res.status(500).send(err);
          } else {
            if (row && filterDupes) {
              logger.main.info(util.format('Ignoring duplicate: %o', message));
              res.status(200);
              res.send('Ignoring duplicate');
            } else {
              db.get("SELECT id, ignore FROM capcodes WHERE ? LIKE address ORDER BY REPLACE(address, '_', '%') DESC LIMIT 1", address, function(err,row) {
                var insert;
                var alias_id = null;
  
                if (err) { logger.main.error(err) }
                if (row) {
                  if (row.ignore == '1') {
                    insert = false;
                    logger.main.info('Ignoring filtered address: '+address+' alias: '+row.id);
                  } else {
                    insert = true;
                    alias_id = row.id;
                  }
                } else {

                  if (EAStype == 0) {
                    if (new RegExp(/(F[0-9]{9})/).test(message)) {
                      db.run("INSERT INTO capcodes (id, address, alias, agency, color, icon, ignore, pluginconf) VALUES (NULL, $mesAddress, $mesAlias, $mesAgency, $mesColor, $mesIcon, $mesIgnore, $mesPluginconf);", {
                        $mesAddress: address,
                        $mesAlias: "Unknown",
                        $mesAgency: "CFA",
                        $mesColor: "red",
                        $mesIcon: "fire",
                        $mesIgnore: 0,
                        $mesPluginconf: "{}"
                      }, function(err) {
                        if (err) {
                          console.log(err);
                        }
                      });
                    } else if (new RegExp(/(E[0-9]{11})/).test(message) || new RegExp(/(J[0-9]{11})/).test(message)) {
                      db.run("INSERT INTO capcodes (id, address, alias, agency, color, icon, ignore, pluginconf) VALUES (NULL, $mesAddress, $mesAlias, $mesAgency, $mesColor, $mesIcon, $mesIgnore, $mesPluginconf);", {
                        $mesAddress: address,
                        $mesAlias: "Unknown",
                        $mesAgency: "AV",
                        $mesColor: "blue",
                        $mesIcon: "medkit",
                        $mesIgnore: 0,
                        $mesPluginconf: "{}"
                      }, function(err) {
                        if (err) {
                          console.log(err);
                        }
                      });
                    }
                  }

                  if (EAStype == 3) {
                    if (new RegExp(/(E[0-9]{11})/).test(message) || new RegExp(/(J[0-9]{11})/).test(message)) {
                      db.run("INSERT INTO capcodes (id, address, alias, agency, color, icon, ignore, pluginconf) VALUES (NULL, $mesAddress, $mesAlias, $mesAgency, $mesColor, $mesIcon, $mesIgnore, $mesPluginconf);", {
                        $mesAddress: address,
                        $mesAlias: "Unknown",
                        $mesAgency: "AV",
                        $mesColor: "blue",
                        $mesIcon: "medkit",
                        $mesIgnore: 0,
                        $mesPluginconf: "{}"
                      }, function(err) {
                        if (err) {
                          console.log(err);
                        }
                      });
                    }
                  }

                  if (EAStype == 1) {
                    if (new RegExp(/(S[0-9]{11})/).test(message)) {
                      db.run("INSERT INTO capcodes (id, address, alias, agency, color, icon, ignore, pluginconf) VALUES (NULL, $mesAddress, $mesAlias, $mesAgency, $mesColor, $mesIcon, $mesIgnore, $mesPluginconf);", {
                        $mesAddress: address,
                        $mesAlias: "Unknown",
                        $mesAgency: "SES",
                        $mesColor: "orange",
                        $mesIcon: "tree",
                        $mesIgnore: 0,
                        $mesPluginconf: "{}"
                      }, function (err) {
                        if (err) {
                          console.log(err);
                        }
                      });
                    }
                  }

                  insert = true;
                }

                // overwrite alias_id if set from plugin
                if (data.pluginData.aliasId) {
                  alias_id = data.pluginData.aliasId;
                }

                if (insert == true) {
                  db.run("INSERT INTO messages (address, message, timestamp, source, alias_id, EAS_type) VALUES ($mesAddress, $mesBody, $mesDT, $mesSource, $aliasId, $EAStype);", {
                    $mesAddress: address,
                    $mesBody: message,
                    $mesDT: datetime,
                    $mesSource: source,
                    $aliasId: alias_id,
                    $EAStype: EAStype
                  }, function(err){
                    if (err) {
                      res.status(500).send(err);
                    } else {
                      // emit the full message
                      var sql =  "SELECT messages.*, capcodes.alias, capcodes.agency, capcodes.icon, capcodes.color, capcodes.ignore, capcodes.id AS aliasMatch, capcodes.pluginconf FROM messages";
                      if(pdwMode) {
                          sql += " INNER JOIN capcodes ON capcodes.id = messages.alias_id ";
                      } else {
                          sql += " LEFT JOIN capcodes ON capcodes.id = messages.alias_id ";
                      }
                          sql += " WHERE messages.id = "+this.lastID;
                      var reqLastID = this.lastID;
                      db.get(sql,function(err,row){
                        if (err) {
                          res.status(500).send(err);
                        } else {
                          if(row) {
                            /**if (row.agency == "CFA") {
                              if (row.address.includes("N")) {
                                row = {
                                  "id": row.id,
                                  "address": row.address,
                                  "message": row.message,
                                  "source": row.source,
                                  "timestamp": row.timestamp,
                                  "alias_id": row.alias_id,
                                  "alias": row.alias,
                                  "agency": row.agency,
                                  "icon": row.icon,
                                  "color": "purple",
                                  "ignore": row.ignore,
                                  "aliasMatch": row.aliasMatch
                                };
                              }
                              if (row.address.includes("E")) {

                                row = {
                                  "id": row.id,
                                  "address": row.address,
                                  "message": row.message,
                                  "source": row.source,
                                  "timestamp": row.timestamp,
                                  "alias_id": row.alias_id,
                                  "alias": row.alias,
                                  "agency": row.agency,
                                  "icon": row.icon,
                                  "color": "red",
                                  "ignore": row.ignore,
                                  "aliasMatch": row.aliasMatch
                                };
                              }
                            }
                            if (row.agency == "SES") {
                              if (row.address.includes("E")) {

                                row = {
                                  "id": row.id,
                                  "address": row.address,
                                  "message": row.message,
                                  "source": row.source,
                                  "timestamp": row.timestamp,
                                  "alias_id": row.alias_id,
                                  "alias": row.alias,
                                  "agency": row.agency,
                                  "icon": row.icon,
                                  "color": "red",
                                  "ignore": row.ignore,
                                  "aliasMatch": row.aliasMatch
                                };
                              }
                              if (row.address.includes("N")) {
                                row = {
                                  "id": row.id,
                                  "address": row.address,
                                  "message": row.message,
                                  "source": row.source,
                                  "timestamp": row.timestamp,
                                  "alias_id": row.alias_id,
                                  "alias": row.alias,
                                  "agency": row.agency,
                                  "icon": row.icon,
                                  "color": "orange",
                                  "ignore": row.ignore,
                                  "aliasMatch": row.aliasMatch
                                };
                              }
                            }
                            if (row.agency == "AV") {
                              row = {
                                "id": row.id,
                                "address": row.address,
                                "message": row.message,
                                "source": row.source,
                                "timestamp": row.timestamp,
                                "alias_id": row.alias_id,
                                "alias": row.alias,
                                "agency": row.agency,
                                "icon": row.icon,
                                "color": "blue",
                                "ignore": row.ignore,
                                "aliasMatch": row.aliasMatch
                              };
                            }

                            if (row.address.includes("A")) {
                              row = {
                                "id": row.id,
                                "address": row.address,
                                "message": row.message,
                                "source": row.source,
                                "timestamp": row.timestamp,
                                "alias_id": row.alias_id,
                                "alias": row.alias,
                                "agency": row.agency,
                                "icon": row.icon,
                                "color": "black",
                                "ignore": row.ignore,
                                "aliasMatch": row.aliasMatch
                              };
                            }**/
                            if (row.agency == "AV") {
                              if (row.EAS_type === 0) {
                                row = {
                                  "id": row.id,
                                  "address": row.address,
                                  "message": row.message,
                                  "source": row.source,
                                  "timestamp": row.timestamp,
                                  "alias_id": row.alias_id,
                                  "alias": row.alias,
                                  "agency": row.agency,
                                  "icon": row.icon,
                                  "color": "blue",
                                  "ignore": row.ignore,
                                  "aliasMatch": row.aliasMatch
                                };
                              }
                              if (row.EAS_type === 1) {
                                row = {
                                  "id": row.id,
                                  "address": row.address,
                                  "message": row.message,
                                  "source": row.source,
                                  "timestamp": row.timestamp,
                                  "alias_id": row.alias_id,
                                  "alias": row.alias,
                                  "agency": row.agency,
                                  "icon": row.icon,
                                  "color": "purple",
                                  "ignore": row.ignore,
                                  "aliasMatch": row.aliasMatch
                                };
                              }
                              if (row.EAS_type === 2) {
                                row = {
                                  "id": row.id,
                                  "address": row.address,
                                  "message": row.message,
                                  "source": row.source,
                                  "timestamp": row.timestamp,
                                  "alias_id": row.alias_id,
                                  "alias": row.alias,
                                  "agency": row.agency,
                                  "icon": row.icon,
                                  "color": "black",
                                  "ignore": row.ignore,
                                  "aliasMatch": row.aliasMatch
                                };
                              }
                              if (row.EAS_type === 3) {
                                row = {
                                  "id": row.id,
                                  "address": row.address,
                                  "message": row.message,
                                  "source": row.source,
                                  "timestamp": row.timestamp,
                                  "alias_id": row.alias_id,
                                  "alias": row.alias,
                                  "agency": row.agency,
                                  "icon": row.icon,
                                  "color": "blue",
                                  "ignore": row.ignore,
                                  "aliasMatch": row.aliasMatch
                                };
                              }
                            } else {
                              if (row.EAS_type === 0) {
                                row = {
                                  "id": row.id,
                                  "address": row.address,
                                  "message": row.message,
                                  "source": row.source,
                                  "timestamp": row.timestamp,
                                  "alias_id": row.alias_id,
                                  "alias": row.alias,
                                  "agency": row.agency,
                                  "icon": row.icon,
                                  "color": "red",
                                  "ignore": row.ignore,
                                  "aliasMatch": row.aliasMatch
                                };
                              }
                              if (row.EAS_type === 1) {
                                row = {
                                  "id": row.id,
                                  "address": row.address,
                                  "message": row.message,
                                  "source": row.source,
                                  "timestamp": row.timestamp,
                                  "alias_id": row.alias_id,
                                  "alias": row.alias,
                                  "agency": row.agency,
                                  "icon": row.icon,
                                  "color": "purple",
                                  "ignore": row.ignore,
                                  "aliasMatch": row.aliasMatch
                                };
                              }
                              if (row.EAS_type === 2) {
                                row = {
                                  "id": row.id,
                                  "address": row.address,
                                  "message": row.message,
                                  "source": row.source,
                                  "timestamp": row.timestamp,
                                  "alias_id": row.alias_id,
                                  "alias": row.alias,
                                  "agency": row.agency,
                                  "icon": row.icon,
                                  "color": "black",
                                  "ignore": row.ignore,
                                  "aliasMatch": row.aliasMatch
                                };
                              }
                              if (row.EAS_type === 3) {
                                row = {
                                  "id": row.id,
                                  "address": row.address,
                                  "message": row.message,
                                  "source": row.source,
                                  "timestamp": row.timestamp,
                                  "alias_id": row.alias_id,
                                  "alias": row.alias,
                                  "agency": row.agency,
                                  "icon": row.icon,
                                  "color": "grey",
                                  "ignore": row.ignore,
                                  "aliasMatch": row.aliasMatch
                                };
                              }
                            }
                            // send data to pluginHandler after processing
                            row.pluginData = data.pluginData;
                            if (row.pluginconf) {
                              row.pluginconf = parseJSON(row.pluginconf);
                            } else {
                              row.pluginconf = {};
                            }
                            logger.main.debug('afterMessage start');
                            pluginHandler.handle('message', 'after', row, function(response) {
                              logger.main.debug(util.format('%o',response));
                              logger.main.debug('afterMessage done');
                              // remove the pluginconf object before firing socket message
                              delete row.pluginconf;
                              if (HideCapcode || apiSecurity) {
                                //Emit full details to the admin socket
                                req.io.of('adminio').emit('messagePost', row);
                                //Only emit to normal socket if HideCapcode is on and ApiSecurity is off.
                                if (HideCapcode && !apiSecurity) {
                                  // Emit No capcode to normal socket
                                  row = {
                                    "id": row.id,
                                    "message": row.message,
                                    "source": row.source,
                                    "timestamp": row.timestamp,
                                    "alias_id": row.alias_id,
                                    "alias": row.alias,
                                    "agency": row.agency,
                                    "icon": row.icon,
                                    "color": row.color,
                                    "ignore": row.ignore,
                                    "aliasMatch": row.aliasMatch
                                  };
                                  req.io.emit('messagePost', row);
                                }
                              } else {
                                //Just emit - No Security enabled
                                req.io.emit('messagePost', row);
                              }
                            });
                          }
                          res.status(200).send(''+reqLastID);
                        }
                      });
                            }
                        });
                } else {
                    res.status(200);
                    res.send('Ignoring filtered');
                }
              });
            }
          }
        });
      });
    });
  } else {
    res.status(500).json({message: 'Error - address or message missing'});
  }
});

router.post('/capcodes', isLoggedIn, function(req, res, next) {
  nconf.load();
  var updateRequired = nconf.get('database:aliasRefreshRequired');
  if (req.body.address && req.body.alias) {
    var id = req.body.id || null;
    var address = req.body.address || 0;
    var alias = req.body.alias || 'null';
    var agency = req.body.agency || 'null';
    var color = req.body.color || 'black';
    var icon = req.body.icon || 'question';
    var ignore = req.body.ignore || 0;
    var pluginconf = JSON.stringify(req.body.pluginconf) || "{}";
    db.serialize(() => {
      db.run("REPLACE INTO capcodes (id, address, alias, agency, color, icon, ignore, pluginconf) VALUES ($mesID, $mesAddress, $mesAlias, $mesAgency, $mesColor, $mesIcon, $mesIgnore, $mesPluginconf);", {
        $mesID: id,
        $mesAddress: address,
        $mesAlias: alias,
        $mesAgency: agency,
        $mesColor: color,
        $mesIcon: icon,
        $mesIgnore: ignore,
        $mesPluginconf : pluginconf
      }, function(err){
        if (err) {
          res.status(500).send(err);
        } else {
          res.status(200);
          res.send(''+this.lastID);
          if (!updateRequired || updateRequired == 0) {
            nconf.set('database:aliasRefreshRequired', 1);
            nconf.save();
          }
        }
      });
      logger.main.debug(util.format('%o', req.body || 'no request body'));
    });
  } else {
    res.status(500).json({message: 'Error - address or alias missing'});
  }
});

router.post('/capcodes/:id', isLoggedIn, function(req, res, next) {
  var id = req.params.id || req.body.id || null;
  nconf.load();
  var updateRequired = nconf.get('database:aliasRefreshRequired');
  if (id == 'deleteMultiple') {
    // do delete multiple
    var idList = req.body.deleteList || [0, 0];
    if (!idList.some(isNaN)) {
      logger.main.info('Deleting: '+idList);
      db.serialize(() => {
        db.run(inParam('DELETE FROM capcodes WHERE id IN (?#)', idList), idList, function(err){
          if (err) {
            res.status(500).send(err);
          } else {
            res.status(200).send({'status': 'ok'});
            if (!updateRequired || updateRequired == 0) {
              nconf.set('database:aliasRefreshRequired', 1);
              nconf.save();
            }
          }
        });
      });
    } else {
      res.status(500).send({'status': 'id list contained non-numbers'});
    }
  } else {
    if (req.body.address && req.body.alias) {
      if (id == 'new')
        id = null;
      var address = req.body.address || 0;
      var alias = req.body.alias || 'null';
      var agency = req.body.agency || 'null';
      var color = req.body.color || 'black';
      var icon = req.body.icon || 'question';
      var ignore = req.body.ignore || 0;
      var pluginconf = JSON.stringify(req.body.pluginconf) || "{}";
      var updateAlias = req.body.updateAlias || 0;
      console.time('insert');
      db.serialize(() => {
        //db.run("UPDATE tbl SET name = ? WHERE id = ?", [ "bar", 2 ]);
        db.run("REPLACE INTO capcodes (id, address, alias, agency, color, icon, ignore, pluginconf) VALUES ($mesID, $mesAddress, $mesAlias, $mesAgency, $mesColor, $mesIcon, $mesIgnore, $mesPluginconf);", {
          $mesID: id,
          $mesAddress: address,
          $mesAlias: alias,
          $mesAgency: agency,
          $mesColor: color,
          $mesIcon: icon,
          $mesIgnore: ignore,
          $mesPluginconf : pluginconf
        }, function(err){
          if (err) {
            console.timeEnd('insert');
            res.status(500).send(err);
          } else {
            console.timeEnd('insert');
            if (updateAlias == 1) {
              console.time('updateMap');
              db.run("UPDATE messages SET alias_id = (SELECT id FROM capcodes WHERE messages.address LIKE address ORDER BY REPLACE(address, '_', '%') DESC LIMIT 1);", function(err){
                if (err) { logger.main.error(err); console.timeEnd('updateMap'); }
                else { console.timeEnd('updateMap'); }
              });
            } else {
              if (!updateRequired || updateRequired == 0) {
                nconf.set('database:aliasRefreshRequired', 1);
                nconf.save();
              }
            }
            res.status(200).send({'status': 'ok', 'id': this.lastID});
          }
        });
        logger.main.debug(util.format('%o',req.body || 'request body empty'));
      });
    } else {
      res.status(500).json({message: 'Error - address or alias missing'});
    }
  }
});

router.delete('/capcodes/:id', isLoggedIn, function(req, res, next) {
  // delete single alias
  var id = parseInt(req.params.id, 10);
  nconf.load();
  var updateRequired = nconf.get('database:aliasRefreshRequired');
  logger.main.info('Deleting '+id);
  db.serialize(() => {
    //db.run("UPDATE tbl SET name = ? WHERE id = ?", [ "bar", 2 ]);
    db.run("DELETE FROM capcodes WHERE id=?", id, function(err){
      if (err) {
        res.status(500).send(err);
      } else {
        res.status(200).send({'status': 'ok'});
        if (!updateRequired || updateRequired == 0) {
          nconf.set('database:aliasRefreshRequired', 1);
          nconf.save();
        }
      }
    });
    logger.main.debug(util.format('%o',req.body || 'request body empty'));
  });
});

router.post('/capcodeRefresh', isLoggedIn, function(req, res, next) {
  nconf.load();
  console.time('updateMap');
  db.run("UPDATE messages SET alias_id = (SELECT id FROM capcodes WHERE messages.address LIKE address ORDER BY REPLACE(address, '_', '%') DESC LIMIT 1);", function(err){
    if (err) { logger.main.error(err); console.timeEnd('updateMap'); }
    else {
      console.timeEnd('updateMap');
      nconf.set('database:aliasRefreshRequired', 0);
      nconf.save();
      res.status(200).send({'status': 'ok'});
    }
  });
});

router.use([handleError]);

module.exports = router;

function inParam (sql, arr) {
  return sql.replace('?#', arr.map(()=> '?' ).join(','));
}

// route middleware to make sure a user is logged in
function isLoggedIn(req, res, next) {
  if (req.method == 'GET') { 
    if (apiSecurity || req.url.match(/capcodes/)) { //checkc if Secure mode is on, or if the route is a capcode route
      if (req.isAuthenticated()) {
        // if user is authenticated in the session, carry on
        return next();
      } else {
        //logger.main.debug('Basic auth failed, attempting API auth');
        passport.authenticate('localapikey', { session: false, failWithError: true })(req, res, next),
          function (next) {
            next();
          },
          function (res) {
            return res.status(401).json({ error: 'Authentication failed.' });
          }
        }
    } else {
      return next();
    }
  } else if (req.method == 'POST') { //Check if user is authenticated for POST methods
    if (req.isAuthenticated()) {
      return next();
    } else {
      passport.authenticate('localapikey', { session: false, failWithError: true }) (req,res,next),
        function (next) {
          next();
        },
        function (res) {
          return res.status(401).json({ error: 'Authentication failed.' });
        }
    }
  }
}

function handleError(err,req,res,next){
  var output = {
    error: {
      name: err.name,
      message: err.message,
      text: err.toString()
    }
  };
  var statusCode = err.status || 500;
  res.status(statusCode).json(output);
}

function parseJSON(json) {
  var parsed;
  try {
    parsed = JSON.parse(json)
  } catch (e) {
    // ignore errors
  }
  return parsed;
}
