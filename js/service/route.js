define(['history', 'service/emitter'], function (history, emitter) {
  var history = history.createMemoryHistory()
  window.hist = history
  history.listen(function (location) {
    emitter.emit('route::change', location)
  })
  return history
})
