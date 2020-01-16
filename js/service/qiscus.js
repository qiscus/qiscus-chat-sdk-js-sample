/* globals QiscusSDK, R */
// This service is to bridge QiscusSDK with this sample app

define(['service/emitter'], function(emitter) {

  // Get appId from location.search otherwise use sdksample
  var result = R.pipe(
    R.split('?'),
    R.filter(it => it.length !== 0),
    R.map(R.split('=')),
    R.fromPairs,
  )(location.search)
  var appId = result.appId || 'sdksample'
  // var QiscusSDK = QiscusSDKCore

  // QiscusSDK.instance.enableDebugMode(true)
  QiscusSDK.instance.setup(appId)

  QiscusSDK.instance.onMessageDeleted(function (message) {
    console.log('qiscus.on-message-deleted', message)
  })

  QiscusSDK.instance.onUserOnlinePresence(function (data) {
    console.log('qiscus.on-user-online-presence', data)
  })
  QiscusSDK.instance.onUserTyping(function (data) {
    console.log('qiscus.on-user-typing', data)
  })

  // region Translate
  // var translateApiKey = 'your-google-cloud-api-key'
  // QTranslate.translate(QiscusSDK.instance, translateApiKey, {
  //   targetLang: 'zh'
  // })
  // endregion

  QiscusSDK.instance.intercept(QiscusSDK.Interceptor.MESSAGE_BEFORE_SENT, function (message) {
    message.extras = {
      ...message.extras,
      interceptedBeforeSent: true
    }
    return message
  })
  QiscusSDK.instance.intercept(QiscusSDK.Interceptor.MESSAGE_BEFORE_RECEIVED, function (message) {
    message.extras = {
      ...message.extras,
      interceptedBeforeReceived: true
    }
    return message
  })

  // Qiscus.instance.noop({
  //   AppId: appId,
  //   options: {
  //     loginSuccessCallback: function(authData) {
  //       emitter.emit('qiscus::login-success', authData)
  //     },
  //     newMessagesCallback: function(messages) {
  //       messages.forEach(function(it) {
  //         emitter.emit('qiscus::new-message', it)
  //       })
  //     },
  //     presenceCallback: function(data) {
  //       var isOnline = data.split(':')[0] === '1'
  //       var lastOnline = new Date(Number(data.split(':')[1]))
  //       emitter.emit('qiscus::online-presence', {
  //         isOnline: isOnline,
  //         lastOnline: lastOnline,
  //       })
  //     },
  //     commentReadCallback: function(data) {
  //       emitter.emit('qiscus::comment-read', data)
  //     },
  //     commentDeliveredCallback: function(data) {
  //       emitter.emit('qiscus::comment-delivered', data)
  //     },
  //     typingCallback: function(data) {
  //       emitter.emit('qiscus::typing', data)
  //     },
  //   },
  // })
  // qiscus.debugMode = true
  // qiscus.debugMQTTMode = true

  // var conv = new showdown.Converter()

  // Here is an implementation of interceptor for semi translate
  // qiscus.intercept(Qiscus.Interceptor.MESSAGE_BEFORE_SENT, function(message) {
  //   return message
  // })
  // qiscus.intercept(Qiscus.Interceptor.MESSAGE_BEFORE_RECEIVED, async function(
  //   message
  // ) {
  //   const content = message.message.replace(/(qis)(cus)/im, function(_, $1, $2) {
  //     return `**${$1.toLowerCase()}**${$2.toLowerCase()}`
  //   })
  //
  //   Object.assign(message, {
  //     message: conv.makeHtml(content),
  //     extras: Object.assign(message.extras || {}, { before_received: true }),
  //   })
  //   return message
  // })

  return QiscusSDK
})
