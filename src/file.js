"use strict";

var fs = require('fs'),
	nconf = require('nconf'),
	path = require('path'),
	winston = require('winston');

var file = {};

file.saveFileToLocal = function(filename, tempPath, callback) {

	var uploadPath = path.join(nconf.get('base_dir'), nconf.get('upload_path'), filename);

	winston.info('Saving file '+ filename +' to : ' + uploadPath);

	var is = fs.createReadStream(tempPath);
	var os = fs.createWriteStream(uploadPath);

	is.on('end', function () {
		callback(null, {
			url: nconf.get('upload_url') + filename
		});
	});

	os.on('error', function (err) {
		winston.error(err.message);
		callback(err);
	});

	is.pipe(os);
};

module.exports = file;