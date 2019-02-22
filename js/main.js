requirejs.config({
  baseUrl: 'js',
  paths: {
    jquery: 'lib/jquery-3.3.1.min',
    qiscus: 'lib/qiscus-sdk-core',
    dateFns: 'lib/date_fns',
    history: 'lib/history.min',
    lodash: 'lib/lodash.min'
  },
  map: {
    '*': {
      jquery: 'jquery-mod'
    },
    'jquery-mod': {
      jquery: 'jquery'
    }
  }
})

requirejs([
  'jquery', 'service/qiscus',
  'service/route', 'service/emitter',
  'service/content',
  'pages/login', 'pages/chat-list', 'pages/chat',
  'pages/users'
], function (
  $, qiscus,
  route, emitter,
  $content,
  LoginPage, ChatList, Chat,
  Users
) {
  var currentPage = route.current || '/login'
  var routes = [LoginPage, ChatList, Chat, Users]

  // console.log('$', $)
  window.$jquery = $
  window.qiscus = qiscus

  if (!qiscus.isLogin) {
    $content.html(LoginPage())
  } else {
    $content.html(ChatList())
  }

  emitter.on('qiscus::login-success', function (authData) {
    $content.html(ChatList)
  })
  emitter.on('route::change', function (location) {
    var routecontent = routes.find(function (route) {
      return route.path === location.pathname
    })
    $content.html(routecontent(location.state))
  })
})
