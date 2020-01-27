define([
  'multi-app-id/content', 'multi-app-id/route', 'multi-app-id/emitter',
  'multi-app-id/login', 'multi-app-id/chat', 'multi-app-id/room-info',
], function (
  $content, route,
  emitter,
  Login,
  Chat,
  RoomInfo,
) {
  var routes = [Login, Chat, RoomInfo]

  emitter.on('route::change', function (location) {
    var content = routes.find(function (page) {
      return page.path === location.pathname
    })
    $content.html(content(location.state))
  })

  $content.html(Login())
})
