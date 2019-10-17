/* globals QiscusSDKCore */
// This service is to bridge QiscusSDK with this sample app

define(['service/emitter'], function(emitter) {
  var Qiscus = QiscusSDKCore
  var qiscus = new QiscusSDKCore()

  var appId = 'sdksample'

  qiscus.init({
    AppId: appId,
    options: {
      loginSuccessCallback: function(authData) {
        emitter.emit('qiscus::login-success', authData)
      },
      newMessagesCallback: function(messages) {
        messages.forEach(function(it) {
          emitter.emit('qiscus::new-message', it)
        })
      },
      presenceCallback: function(data) {
        var isOnline = data.split(':')[0] === '1'
        var lastOnline = new Date(Number(data.split(':')[1]))
        emitter.emit('qiscus::online-presence', {
          isOnline: isOnline,
          lastOnline: lastOnline,
        })
      },
      commentReadCallback: function(data) {
        emitter.emit('qiscus::comment-read', data)
      },
      commentDeliveredCallback: function(data) {
        emitter.emit('qiscus::comment-delivered', data)
      },
      typingCallback: function(data) {
        emitter.emit('qiscus::typing', data)
      },
    },
  })
  // qiscus.debugMode = true
  // qiscus.debugMQTTMode = true

  var conv = new showdown.Converter()

  // Here is an implementatio of interceptor for semi translate
  qiscus.intercept(Qiscus.Interceptor.MESSAGE_BEFORE_SENT, function(message) {
    return message
  })
  qiscus.intercept(Qiscus.Interceptor.MESSAGE_BEFORE_RECEIVED, async function(
    message
  ) {
    let content = message.message.replace(/(qis)(cus)/im, function(_, $1, $2) {
      return `**${$1.toLowerCase()}**${$2.toLowerCase()}`
    })

    Object.assign(message, {
      message: conv.makeHtml(content),
      extras: Object.assign(message.extras || {}, { before_received: true }),
    })
    return message
  })

  const sleep = time => new Promise(res => setTimeout(res, time))

  return qiscus
})
