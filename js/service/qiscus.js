// This service is to bridge QiscusSDK with this sample app

define(['service/emitter'], function (emitter) {
  var qiscus = new QiscusSDKCore()

  const appId = 'sdksample'

  qiscus.init({
    AppId: appId,
    options: {
      loginSuccessCallback: function (authData) {
        emitter.emit('qiscus::login-success', authData)
      },
      newMessagesCallback: function (messages) {
        emitter.emit('qiscus::new-message', messages[0])
        console.log('on:new-messages', messages)
      },
      presenceCallback: function (data) {
        var isOnline = data.split(':')[0] === '1'
        var lastOnline = new Date(Number(data.split(':')[1]))
        emitter.emit('qiscus::online-presence', {
          isOnline: isOnline,
          lastOnline: lastOnline
        })
        console.log('on:presence', isOnline, lastOnline)
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
