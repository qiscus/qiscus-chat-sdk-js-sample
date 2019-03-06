define(['history', 'service/emitter'], function (history, emitter) {
  var history = history.createMemoryHistory()
  history.listen(function (location) {
    emitter.emit('route::change', location)
  })
  return history
})
