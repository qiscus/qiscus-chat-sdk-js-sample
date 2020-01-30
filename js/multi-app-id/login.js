define([
  'jquery', 'multi-app-id/route', 'multi-app-id/content', 'multi-app-id/qiscus',
  'service/html',
], function ($, route, $content, Qiscus, html) {


  function LoginPage () {

    // For some reason, jquery.on('submit') are very slow
    // and did not want to call qiscus.setUser
    document.addEventListener('submit', function (event) {
      if (event.target.id === 'LoginForm-appId') {
        event.preventDefault()
        var appId = event.target['app-id'].value
        var userId = event.target['user-id'].value
        var userKey = event.target['user-key'].value
        var username = userId
        var userTarget = event.target['user-target'].value

        var baseUrl = 'https://dragongo.qiscus.com'
        var brokerUrl = 'wss://realtime-stage.qiscus.com:1886/mqtt'
        // Qiscus.setup(appId)
        // Qiscus.enableDebugMode(true)
        Qiscus.setupWithCustomServer(appId, baseUrl, brokerUrl)
        window.Qiscus = Qiscus

        Qiscus.setUser(userId, userKey, username, null, null, function (user, error) {
          if (error) return console.error('Error when login', error)

          Qiscus.chatUser(userTarget, null, function (room, error) {
            if (error) return console.error('Error when getting room detail', error)
            route.push('/chat-room', { roomId: room.id })
          })
        })
      }
    })
    return html`
      <div class="LoginPage">
        <!--<img src="/img/logo.svg" class="logo" alt="qiscus-logo" />-->
        <form id="LoginForm-appId">
          <div class="form-group">
            <label for="app-id">App ID</label>
            <!--<input name="app-id" type="text" value="qiscus-sa-0ywcivq7nxn" autocomplete="off" />-->
            <input name="app-id" type="text" value="dragongo" autocomplete="off" />
          </div>
          <div class="form-group">
            <label for="userId">User ID</label>
            <input type="text" name="user-id" value="guest-1001" autocomplete="off" />
          </div>
          <div class="form-group">
            <label for="user-key">User Key</label>
            <input type="password" name="user-key" value="passkey" />
          </div>
          <div class="form-group">
            <label for="user-target">User Target</label>
            <input type="text" name="user-target" value="guest-1002" />
          </div>
          <div class="form-group">
            <button type="submit">
              Start <i class="fas fa-arrow-right"></i>
            </button>
          </div>
        </form>
      </div>
    `
  }

  LoginPage.path = '/login'

  return LoginPage
})
