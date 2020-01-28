/* globals QiscusSDK, R */
// This service is to bridge QiscusSDK with this sample app

define(['service/emitter'], function(emitter) {
  var Qiscus = QiscusSDK.instance

  // Get appId from location.search otherwise use sdksample
  var result = R.pipe(
    R.split('?'),
    R.filter(it => it.length !== 0),
    R.map(R.split('=')),
    R.fromPairs,
  )(location.search)
  var appId = result.appId || 'sdksample'

  var baseUrl = 'https://dragongo.qiscus.com'
  var brokerUrl = 'wss://realtime-stage.qiscus.com:1886/mqtt'
  Qiscus.setup(appId)
  QiscusSDK.instance.enableDebugMode(true, function () {
    console.log('debug mode enabled')
  })
  // QiscusSDK.instance.setupWithCustomServer(appId, baseUrl, brokerUrl)
  // QiscusSDK.instance.enableDebugMode(true)
  // QiscusSDK.instance.setup(appId)

  window.Qiscus = QiscusSDK.instance
  return QiscusSDK
})
