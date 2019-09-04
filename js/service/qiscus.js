/* globals QiscusSDKCore */
// This service is to bridge QiscusSDK with this sample app

define(['service/emitter'], function (emitter) {
  var qiscus = new QiscusSDKCore()

  var appId = 'sdksample'

  qiscus.init({
    AppId: appId,
    sync: 'http',
    mqttURL: 'http://asomer.com',
    options: {
      loginSuccessCallback: function (authData) {
        emitter.emit('qiscus::login-success', authData)
      },
      newMessagesCallback: function (messages) {
        messages.forEach(it => emitter.emit('qiscus::new-message', it))
      },
      presenceCallback: function (data) {
        var isOnline = data.split(':')[0] === '1'
        var lastOnline = new Date(Number(data.split(':')[1]))
        emitter.emit('qiscus::online-presence', {
          isOnline: isOnline,
          lastOnline: lastOnline
        })
      },
      commentReadCallback: function (data) {
        emitter.emit('qiscus::comment-read', data)
      },
      commentDeliveredCallback: function (data) {
        emitter.emit('qiscus::comment-delivered', data)
      },
      typingCallback: function (data) {
        emitter.emit('qiscus::typing', data)
      }
    }
  })
  // qiscus.debugMode = true
  // qiscus.debugMQTTMode = true

  return qiscus
})
