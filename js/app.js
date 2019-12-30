define([
  'jquery',
  'service/qiscus', 'service/route', 'service/emitter', 'service/content',
  'pages/login', 'pages/chat-list', 'pages/chat',
  'pages/users', 'pages/create-group', 'pages/profile',
  'pages/room-info'
], function (
  $, qiscus, route, emitter, $content,
  LoginPage, ChatListPage, ChatPage, UserPage,
  CreateGroupPage, Profile,
  RoomInfoPage
) {
  window.route = route
  var routes = [
    LoginPage,
    ChatListPage,
    ChatPage,
    UserPage,
    CreateGroupPage,
    Profile,
    RoomInfoPage
  ]

  $content.html(LoginPage)
  if (!qiscus.isLogin) {
    route.replace('/login')
  }

  // emitter.on('qiscus::login-success', function () {
  //   route.replace('/chat')
  //   localStorage.setItem('authdata', JSON.stringify(qiscus.userData))
  // })
  emitter.on('route::change', function (location) {
    var content = routes.find(function (page) {
      return page.path === location.pathname
    })
    $content.html(content(location.state))
  })

  $('.widget-container').on('click', 'button.close-btn', function (event) {
    event.preventDefault()
    $('.widget-container').slideUp()
  })
  $('.toggle-widget-btn').on('click', function (event) {
    event.preventDefault()
    $('.widget-container').slideDown()
  })

  // if (localStorage['authdata'] != null) {
  //   var authdata = JSON.parse(localStorage['authdata'])
  //   qiscus.setUserWithIdentityToken({ user: authdata })
  // }
})
