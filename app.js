(function() {
  'use strict';
  
  var http = require('http');
  var util = require('util');
  var express = require('express');
  var fs = require('fs');
  var async = require('async');
  var _ = require('lodash');
  var basicAuth = require('express-basic-auth');
  var config = require(__dirname + '/config.json');
  
  var port = config.port;
  var app = express();
  var httpServer = http.createServer(app);
  httpServer.listen(port, () => {
    console.log('Server is listening on port ' + port);
  });
  
  app.use(basicAuth({
    users: config.users
  }));

  app.get('/:organization/vcards', (req, res) => {
    var organization = req.params.organization;
    if (!organization || !config.organizations[organization] || !config.organizations[organization].vcards) {
      res.status(404).send("Not found");
      return;
    }
    
    var path = config.organizations[organization].vcards;
    
    fs.readdir(path, (err, filenames) => {
      var files = _.filter(filenames, (filename) => {
        return filename.endsWith('.vcard');
      });
      
      var statCalls = files.map((filename) => {
        return (callback) => {
          var fullname = util.format("%s/%s", path, filename);
          fs.stat(fullname, (err, stat) => {
            if (err) {
              callback(err);
            } else {
              callback(null, {
                fullname: fullname,
                stat: stat
              });
            }
          }); 
        }
      });
      
      async.parallel(statCalls, (err, files) => {
        if (err) {
          res.status(500).send(err);
        } else {
          files.sort((file1, file2) => {
            return file2.stat.mtime - file1.stat.mtime;
          });
          
          if (files.length) {
            fs.readFile(files[0].fullname, (dataErr, fileData) => {
              if (dataErr) {
                res.status(500).send(dataErr);
              } else {
                res.status(200)
                  .contentType('text/vcard')
                  .send(fileData);
              }
            });
          } else {
            res.status(404).send("Not found");
          }
        }
      });
    });
    
  });
  
}).call(this);