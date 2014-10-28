

'use strict';

var async = require('async'),
	db = require('../database');



module.exports = function(Topics) {
	var terms = {
		day: 86400000,
		week: 604800000,
		month: 2592000000,
		year: 31104000000
	};

	Topics.getRecentTopics = function(uid, start, end, callback) {
		async.waterfall([
			function(next) {
				db.getSortedSetRevRange('topics:recent', start, end, next);
			},
			function(tids, next) {
				Topics.getTopics('topics:recent', uid, tids, next);
			},
			function(data, next) {
				data.nextStart = end + 1;
				next(null, data);
			}
		], callback);
	};

	Topics.getLatestTopics = function(uid, start, end, term, callback) {
		Topics.getLatestTids(start, end, term, function(err, tids) {
			if (err) {
				return callback(err);
			}

			Topics.getTopics('topics:recent', uid, tids, function(err, data) {
				if (err) {
					return callback(err);
				}

				data.nextStart = end + 1;
				callback(null, data);
			});
		});
	};

	Topics.getLatestTids = function(start, end, term, callback) {
		var since = terms.day;
		if (terms[term]) {
			since = terms[term];
		}

		var count = parseInt(end, 10) === -1 ? end : end - start + 1;

		db.getSortedSetRevRangeByScore('topics:recent', start, count, Infinity, Date.now() - since, callback);
	};

	Topics.updateTimestamp = function(tid, timestamp, callback) {
		async.parallel([
			function(next) {
				Topics.updateRecent(tid, timestamp, next);
			},
			function(next) {
				Topics.setTopicField(tid, 'lastposttime', timestamp, next);
			}
		], callback);
	};

	Topics.updateRecent = function(tid, timestamp, callback) {
		callback = callback || function() {};
		db.sortedSetAdd('topics:recent', timestamp, tid, callback);
	};

	Topics.removeRecent = function(tid, callback) {
		db.sortedSetRemove('topics:recent', tid, callback);
	};
};
