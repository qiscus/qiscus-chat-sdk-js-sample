// This service is to bridge QiscusSDK with this sample app

define(['service/route', 'service/emitter'], function (route, emitter) {
  var qiscus = new QiscusSDKCore.default()
  window.qq = qiscus

  qiscus.init({
    AppId: 'sdksample',
    options: {
      loginSuccessCallback: function (authData) {
        emitter.emit('qiscus::login-success', authData)
      },
      newMessagesCallback: function (messages) {
        emitter.emit('qiscus::new-message', messages[0])
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
      }
    }
  })
  qiscus.setUser('afief@qiscus.co', 'qwe12345', 'afief-ori')

  return qiscus
})
