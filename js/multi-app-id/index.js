define([
  'multi-app-id/content', 'multi-app-id/route', 'multi-app-id/emitter',
  'multi-app-id/login', 'multi-app-id/chat',
], function ($content, route, emitter, Login, Chat) {
  var routes = [Login, Chat]

  emitter.on('route::change', function (location) {
    var content = routes.find(function (page) {
      return page.path === location.pathname
    })
    $content.html(content(location.state))
  })

  $content.html(Login())
})
