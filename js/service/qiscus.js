/* globals QiscusSDKCore */
// This service is to bridge QiscusSDK with this sample app
function escapeHTML(str) {
	return str;
}
function format(str) {
	return str;
}

class Comment {
	constructor(comment) {
		this.id = comment.id;
		this.before_id = comment.comment_before_id;
		this.message = escapeHTML(comment.message);
		this.username_as = comment.username_as || comment.username;
		this.username_real = comment.username_real || comment.email;
		this.email = this.username_real;
		this.user_extras = comment.user_extras;
		this.date = format(comment.timestamp, 'YYYY-MM-DD');
		this.time = format(comment.timestamp, 'HH:mm');
		this.timestamp = comment.timestamp;
		this.unique_id = comment.unique_temp_id || comment.unique_id;
		this.unique_temp_id = comment.unique_temp_id || comment.unique_id;
		this.avatar = comment.user_avatar_url;
		this.room_id = comment.room_id;
		this.isChannel = comment.is_public_channel;
		this.unix_timestamp = comment.unix_timestamp;
		this.extras = comment.extras;

		/* comment status */
		this.is_deleted = comment.is_deleted;
		this.isPending = false;
		this.isFailed = false;
		this.isDelivered = false;
		this.isRead = false;
		this.isSent = false;
		this.attachment = null;
		this.payload = comment.payload;
		this.status = comment.status;

		// manage comment type
		if (comment.type === 'reply') {
			comment.payload.replied_comment_message = escapeHTML(comment.payload.replied_comment_message);
			comment.payload.text = escapeHTML(comment.payload.text);
		}

		// supported comment type text, account_linking, buttons
		// let supported_comment_type = [
		//   'text','account_linking','buttons','reply','system_event','card', 'custom', 'contact_person', 'location',
		//   'carousel'
		// ];
		this.type = comment.type;
		this.subtype = comment.type === 'custom' ? comment.payload.type : null;
		// comment status
		// comment status
		if (comment.status === 'sent') {
			this.markAsSent();
		} else if (comment.status === 'delivered') {
			this.markAsDelivered();
		} else if (comment.status === 'read') {
			this.markAsRead();
		}
	}
	isAttachment(message) {
		return message.substring(0, '[file]'.length) === '[file]';
	}
	isImageAttachment(message) {
		return this.isAttachment(message) && message.match(/\.(jpg|jpeg|gif|png)/i) != null;
	}
	attachUniqueId(uniqueId) {
		this.unique_id = uniqueId;
	}
	getAttachmentURI(message) {
		if (!this.isAttachment(message)) return;
		const messageLength = message.length;
		const beginIndex = '[file]'.length;
		const endIndex = messageLength - '[/file]'.length;
		return message.substring(beginIndex, endIndex).trim();
	}
	setAttachment(attachment) {
		this.attachment = attachment;
	}
	markAsPending() {
		this.isPending = true;
		this.isDelivered = false;
		this.status = 'pending';
	}
	markAsSent() {
		this.isSent = true;
		this.isPending = false;
		this.isFailed = false;
		this.status = 'sent';
	}
	markAsDelivered({ actor, activeActorId } = {}) {
		if (actor === activeActorId) return;
		if (this.isRead || this.status === 'read') return;
		this.isSent = true;
		this.isRead = false;
		this.isDelivered = true;
		this.status = 'delivered';
	}
	markAsRead({ actor, activeActorId } = {}) {
		if (actor === activeActorId) return;
		this.isPending = false;
		this.isSent = true;
		this.isDelivered = true;
		this.isRead = true;
		this.status = 'read';
	}
	markAsFailed() {
		this.isFailed = true;
		this.isPending = false;
		this.isStatus = 'failed';
	}
	// usually called when there's new comment with the same id
	// we just need to update its content
	update(data) {
		// update properties that usually change
		this.id = data.id;
		this.before_id = data.comment_before_id;
		this.message = escapeHTML(data.message);
		/* comment status */
		if (data.payload) this.payload = data.payload;
		if (data.status) this.status = data.status;

		// manage comment type
		if (data.type === 'reply') {
			this.payload.replied_comment_message = escapeHTML(data.payload.replied_comment_message);
			this.payload.text = escapeHTML(data.payload.text);
		}

		// comment status
		if (data.status === 'sent') {
			this.markAsSent();
		} else if (data.status === 'delivered') {
			this.markAsDelivered();
		} else if (data.status === 'read') {
			this.markAsRead();
		}
	}
}

define(['service/emitter', 'jquery'], function (emitter, $) {
	var Qiscus = QiscusSDKCore;
	var qiscus = new QiscusSDKCore();

	console.log('inside qiscus');
	window.getJwt = qiscus.getJwt = async function getJwt() {
		const nonce = await qiscus.getNonce().then((it) => it.nonce);

		const response = await fetch('http://localhost:8000/get-jwt', {
			method: 'POST',
			body: JSON.stringify({ nonce }),
			headers: {
				['content-type']: 'application/json',
			},
			mode: 'cors',
		}).then((it) => it.json());

		return response;
	};

	// var appId = 'sdksample';
	var appId = window.APP_ID;

	// qiscus.debugMode = true;
	qiscus.debugMQTTMode = true;
	// window.qiscus = qiscus
	qiscus.init({
		AppId: appId,
		options: {
			loginSuccessCallback: function (authData) {
				console.log('@login-success', authData);
				emitter.emit('qiscus::login-success', authData);
				qiscus.realtimeAdapter.mqtt.on('connect', function () {
					console.log('TIMEIT', '@mqtt.connect', new Date().toISOString());
				});
			},
			newMessagesCallback: function (messages) {
				messages.forEach(function (it) {
					emitter.emit('qiscus::new-message', it);
				});
			},
			presenceCallback: function (data) {
				var isOnline = data.split(':')[0] === '1';
				var lastOnline = new Date(Number(data.split(':')[1]));
				emitter.emit('qiscus::online-presence', {
					isOnline: isOnline,
					lastOnline: lastOnline,
				});
			},
			commentReadCallback: function (data) {
				emitter.emit('qiscus::comment-read', data);
			},
			commentDeliveredCallback: function (data) {
				emitter.emit('qiscus::comment-delivered', data);
			},
			typingCallback: function (data) {
				emitter.emit('qiscus::typing', data);
			},
			commentDeletedCallback: function (data) {
				emitter.emit('qiscus::comment-deleted', data);
			},
			roomClearedCallback: function (data) {
				console.log('@room-cleared', data)
			},
			roomChangedCallback: function (data) {
				console.log('@room-changed', data)
			},
			onReconnectCallback: function (data) {
				console.log('@reconnect', data)
			},
		},
	});
	console.log('TIMEIT', new Date().toISOString());
	console.log('qiscus.isInit', qiscus.isInit, new Date().toISOString());

	QiscusSDKCore.prototype._generateUniqueId = function () {
		return `javascript-${Date.now()}`;
	};
	QiscusSDKCore.prototype.generateMessage = function ({ roomId, text, extras }) {
		const id = Date.now();
		const comment = new Comment({
			id,
			message: text,
			room_id: roomId,
			extras: extras,
			timestamp: new Date(),
			unique_id: this._generateUniqueId(),
			before_id: 0,
			username: this.userData.username,
			email: this.userData.email,
			status: 'pending',
			type: 'text',
		});
		return comment;
	};

	showdown.extension('only-inline-stuff', function () {
		return [
			{
				type: 'output',
				filter: function (text) {
					// remove paragraphs
					text = text.replace(/<\/?p[^>]*>/g, '');

					// remove code (if you want)
					// text = text.replace(/<\/?code[^>]*>/g, '');

					//add other stuff here that you want to remove
					// text = text.replace(, '');
					return text;
				},
			},
		];
	});
	var conv = new showdown.Converter({ extensions: ['only-inline-stuff'] });

	// Here is an implementation of interceptor for semi translate
	/*
  qiscus.intercept(Qiscus.Interceptor.MESSAGE_BEFORE_SENT, function (message) {
    return message;
  });
  qiscus.intercept(Qiscus.Interceptor.MESSAGE_BEFORE_RECEIVED, async function (
    message
  ) {
    const content = message.message.replace(/(qis)(cus)/im, function (
      _,
      $1,
      $2
    ) {
      return `**${$1.toLowerCase()}**${$2.toLowerCase()}`;
    });

    Object.assign(message, {
      message: conv.makeHtml(content),
      extras: Object.assign(message.extras || {}, { before_received: true }),
    });
    return message;
  });
  */

	return qiscus;
});
