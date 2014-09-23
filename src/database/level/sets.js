"use strict";

var async = require('async');

module.exports = function(db, module) {
	var helpers = module.helpers.level;

	module.setAdd = function(key, value, callback) {
		module.getListRange(key, 0, -1, function(err, set) {
			if (set.indexOf(value) === -1) {
				module.listAppend(key, value, callback);
			} else {
				if (typeof callback === 'function') {
					callback(null, []); // verify if it sends back true on redis?
				}
			}
		});
	};

	module.setRemove = function(key, value, callback) {
		module.getListRange(key, 0, -1, function(err, set) {
			module.set(key, set.splice(set.indexOf(value), 1), callback);
		});
	};

	module.isSetMember = function(key, value, callback) {
		module.getListRange(key, 0, -1, function(err, set) {
			callback(err, set.indexOf(value) !== -1);
		});
	};

	module.isSetMembers = function(key, values, callback) {
		var members = {};

		async.each(values, function(value, next) {
			module.isSetMember(key, value, function(err, isMember) {
				members[key] = isMember;
			});
		}, function(err) {
			callback(err, members);
		});
	};

	module.isMemberOfSets = function(sets, value, callback) {
		helpers.iterator('isSetMember', sets, value, callback);
	};

	module.getSetMembers = function(key, callback) {
		module.getListRange(key, 0, -1, function(err, set) {
			callback(err, set);
		});
	};

	module.getSetsMembers = function(keys, callback) {
		throw new Error('not-implemented');
	};

	module.setCount = function(key, callback) {
		module.getListRange(key, 0, -1, function(err, set) {
			callback(err, set.length);
		});
	};

	module.setRemoveRandom = function(key, callback) {
		// how random is this? well, how random are the other implementations of this?
		// imo rename this to setRemoveOne

		module.getListRange(key, 1, -1, function(err, set) {
			module.set(key, set, callback);
		});
	};
};