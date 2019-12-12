define([
  'jquery', 'service/route', 'service/content', 'service/qiscus',
  'service/html'
], function ($, route, $content, Qiscus, html) {

  function LoginPage() {
    // For development only to bypass login
    Qiscus.instance
      .setUser('guest-1001', 'passkey', 'guest-1001', undefined, undefined, function (user, error) {
        if (error) return console.error('Error when login', error)
        localStorage.setItem('chat::user', JSON.stringify(user))
        route.push('/chat')
      })
    // For some reason, jquery.on('submit') are very slow
    // and did not want to call qiscus.setUser
    document.addEventListener('submit', function (event) {
      if (event.target.id === 'LoginForm') {
        event.preventDefault()
        var userId = $('#user-id').val()
        var userKey = $('#user-key').val()
        Qiscus.instance
          .setUser(userId, userKey, userId, undefined, undefined, function (user, error) {
            if (error) return console.error('Error when login', error)
            localStorage.setItem('chat::user', JSON.stringify(user))
            route.push('/chat')
          })
      }
    })
    return html`
      <div class="LoginPage">
        <img src="/img/logo.svg" class="logo" alt="qiscus-logo" />
        <form id="LoginForm">
          <div class="form-group">
            <label for="userId">User ID</label>
            <input id="user-id" type="text" name="user-id" value="guest-101" autocomplete="off" />
          </div>
          <div class="form-group">
            <label for="user-key">User Key</label>
            <input id="user-key" type="password" name="user-key" value="passkey" />
          </div>
          <div class="form-group">
            <button type="submit" id="submit-login-btn">
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
