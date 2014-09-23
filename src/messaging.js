'use strict';

var db = require('./database'),
	async = require('async'),
	winston = require('winston'),
	user = require('./user'),
	plugins = require('./plugins'),
	meta = require('./meta'),
	utils = require('../public/src/utils'),
	notifications = require('./notifications'),
	userNotifications = require('./user/notifications');


(function(Messaging) {

	function sortUids(fromuid, touid) {
		return [fromuid, touid].sort();
	}

	Messaging.addMessage = function(fromuid, touid, content, callback) {
		var uids = sortUids(fromuid, touid);

		db.incrObjectField('global', 'nextMid', function(err, mid) {
			if (err) {
				return callback(err);
			}
			var timestamp = Date.now();
			var message = {
				content: content,
				timestamp: timestamp,
				fromuid: fromuid,
				touid: touid
			};

			async.waterfall([
				function(next) {
					plugins.fireHook('filter:messaging.save', message, next);
				},
				function(message, next) {
					db.setObject('message:' + mid, message, next);
				}
			], function(err) {
				if (err) {
					return callback(err);
				}

				async.parallel([
					async.apply(addToRecent, fromuid, message),
					async.apply(db.sortedSetAdd, 'messages:uid:' + uids[0] + ':to:' + uids[1], timestamp, mid),
					async.apply(Messaging.updateChatTime, fromuid, touid),
					async.apply(Messaging.updateChatTime, touid, fromuid),
					async.apply(Messaging.markRead, fromuid, touid),
					async.apply(Messaging.markUnread, touid, fromuid),
				], function(err, results) {
					if (err) {
						return callback(err);
					}

					async.waterfall([
						function(next) {
							getMessages([mid], fromuid, touid, true, next);
						},
						function(messages, next) {
							Messaging.isNewSet(fromuid, touid, mid, function(err, isNewSet) {
								if (err) {
									return next(err);
								}
								messages[0].newSet = isNewSet;
								next(null, messages ? messages[0] : null);
							});
						}
					], callback);
				});
			});
		});
	};

	function addToRecent(fromuid, message, callback) {
		db.listPrepend('messages:recent:' + fromuid, message.content, function(err) {
			if (err) {
				return callback(err);
			}

			db.listTrim('messages:recent:' + fromuid, 0, 9, callback);
		});
	}

	Messaging.getMessages = function(fromuid, touid, isNew, callback) {
		var uids = sortUids(fromuid, touid);

		db.getSortedSetRevRange('messages:uid:' + uids[0] + ':to:' + uids[1], 0, (meta.config.chatMessagesToDisplay || 50) - 1, function(err, mids) {
			if (err) {
				return callback(err);
			}

			if (!Array.isArray(mids) || !mids.length) {
				return callback(null, []);
			}

			mids.reverse();

			getMessages(mids, fromuid, touid, isNew, callback);
		});

		// Mark any chat notifications pertaining to this chat as read
		notifications.markReadByUniqueId(fromuid, 'chat_' + touid + '_' + fromuid, function(err) {
			if (err) {
				winston.error('[messaging] Could not mark notifications related to this chat as read: ' + err.message);
			}

			userNotifications.pushCount(fromuid);
		});
	};

	function getMessages(mids, fromuid, touid, isNew, callback) {
		user.getMultipleUserFields([fromuid, touid], ['uid', 'username', 'userslug', 'picture'], function(err, userData) {
			if(err) {
				return callback(err);
			}

			var keys = mids.map(function(mid) {
				return 'message:' + mid;
			});

			async.waterfall([
				async.apply(db.getObjects, keys),
				function(messages, next) {
					async.map(messages, function(message, next) {
						var self = parseInt(message.fromuid, 10) === parseInt(fromuid, 10);
						message.fromUser = self ? userData[0] : userData[1];
						message.toUser = self ? userData[1] : userData[0];
						message.timestampISO = utils.toISOString(message.timestamp);
						message.self = self ? 1 : 0;
						message.newSet = false;

						Messaging.parse(message.content, message.fromuid, fromuid, userData[1], userData[0], isNew, function(result) {
							message.content = result;
							next(null, message);
						});
					}, next);
				},
				function(messages, next) {
					// Add a spacer in between messages with time gaps between them
					messages = messages.map(function(message, index) {
						// Compare timestamps with the previous message, and check if a spacer needs to be added
						if (index > 0 && parseInt(message.timestamp, 10) > parseInt(messages[index-1].timestamp, 10) + (1000*60*5)) {
							// If it's been 5 minutes, this is a new set of messages
							message.newSet = true;
						}

						return message;
					});

					next(undefined, messages);
				}
			], callback);
		});
	}

	Messaging.parse = function (message, fromuid, myuid, toUserData, myUserData, isNew, callback) {
		plugins.fireHook('filter:post.parse', message, function(err, parsed) {
			if (err) {
				return callback(message);
			}

			var messageData = {
				message: message,
				parsed: parsed,
				fromuid: fromuid,
				myuid: myuid,
				toUserData: toUserData,
				myUserData: myUserData,
				isNew: isNew,
				parsedMessage: parsed
			};

			plugins.fireHook('filter:messaging.parse', messageData, function(err, messageData) {
				callback(messageData.parsedMessage);
			});
		});
	};

	Messaging.isNewSet = function(fromuid, touid, mid, callback) {
		var uids = sortUids(fromuid, touid),
			setKey = 'messages:uid:' + uids[0] + ':to:' + uids[1];

		async.waterfall([
			async.apply(db.sortedSetRank, setKey, mid),
			function(index, next) {
				if (index > 0) {
					db.getSortedSetRange(setKey, index-1, index, next);
				} else {
					next(null, true);
				}
			},
			function(mids, next) {
				if (typeof mids !== 'boolean') {
					db.getObjects(['message:' + mids[0], 'message:' + mids[1]], next);
				} else {
					next(null, mids);
				}
			},
			function(messages, next) {
				if (typeof messages !== 'boolean') {
					next(null, parseInt(messages[1].timestamp, 10) > parseInt(messages[0].timestamp, 10) + (1000*60*5));
				} else {
					next(null, messages);
				}
			}
		], callback);
	};

	Messaging.updateChatTime = function(uid, toUid, callback) {
		callback = callback || function() {};
		db.sortedSetAdd('uid:' + uid + ':chats', Date.now(), toUid, callback);
	};

	Messaging.getRecentChats = function(uid, start, end, callback) {
		db.getSortedSetRevRange('uid:' + uid + ':chats', start, end, function(err, uids) {
			if(err) {
				return callback(err);
			}

			db.isSortedSetMembers('uid:' + uid + ':chats:unread', uids, function(err, unreadUids) {
				if (err) {
					return callback(err);
				}

				user.isOnline(uids, function(err, users) {
					if (err) {
						return callback(err);
					}

					users.forEach(function(user, index) {
						if (user) {
							user.unread = unreadUids[index];
						}
					});

					users = users.filter(function(user) {
						return !!user.uid;
					});
					callback(null, users);
				});
			});
		});
	};

	Messaging.getUnreadCount = function(uid, callback) {
		db.sortedSetCard('uid:' + uid + ':chats:unread', callback);
	};

	Messaging.markRead = function(uid, toUid, callback) {
		db.sortedSetRemove('uid:' + uid + ':chats:unread', toUid, callback);
	};

	Messaging.markUnread = function(uid, toUid, callback) {
		db.sortedSetAdd('uid:' + uid + ':chats:unread', Date.now(), toUid, callback);
	};

	/*
	todo #1798 -- this utility method creates a room name given an array of uids.

	Messaging.uidsToRoom = function(uids, callback) {
		uid = parseInt(uid, 10);
		if (typeof uid === 'number' && Array.isArray(roomUids)) {
			var room = 'chat_';

			room = room + roomUids.map(function(uid) {
				return parseInt(uid, 10);
			}).sort(function(a, b) {
				return a-b;
			}).join('_');

			callback(null, room);
		} else {
			callback(new Error('invalid-uid-or-participant-uids'));
		}
	};*/

	Messaging.verifySpammer = function(uid, callback) {
		var messagesToCompare = 10;

		db.getListRange('messages:recent:' + uid, 0, messagesToCompare - 1, function(err, msgs) {
			var total = 0;

			for (var i = 0, ii = msgs.length - 1; i < ii; ++i) {
				total += areTooSimilar(msgs[i], msgs[i+1]) ? 1 : 0;
			}

			var isSpammer = total === messagesToCompare - 1;
			if (isSpammer) {
				db.delete('messages:recent:' + uid);
			}

			callback(err, isSpammer);
		});
	};

	// modified from http://en.wikibooks.org/wiki/Algorithm_Implementation/Strings/Levenshtein_distance
	function areTooSimilar(a, b) {
		var matrix = [];

		for(var i = 0; i <= b.length; i++){
			matrix[i] = [i];
		}

		for(var j = 0; j <= a.length; j++){
			matrix[0][j] = j;
		}

		for(i = 1; i <= b.length; i++){
			for(j = 1; j <= a.length; j++){
				if(b.charAt(i-1) === a.charAt(j-1)){
					matrix[i][j] = matrix[i-1][j-1];
				} else {
					matrix[i][j] = Math.min(matrix[i-1][j-1] + 1,
					Math.min(matrix[i][j-1] + 1,
					matrix[i-1][j] + 1));
				}
			}
		}

		return (matrix[b.length][a.length] / b.length < 0.1);
	}

}(exports));
