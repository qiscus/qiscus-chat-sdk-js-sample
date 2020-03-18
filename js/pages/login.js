define([
  'jquery', 'service/route', 'service/content', 'service/qiscus',
  'service/html'
], function ($, route, $content, qiscus, html) {

  function LoginPage(state) {
    // For some reason, jquery.on('submit') are very slow
    // and did not want to call qiscus.setUser
    document.addEventListener('submit', function (event) {
      if (event.target.id === 'LoginForm') {
        event.preventDefault()
        var userId = $('#user-id').val()
        var username = $('#username').val()
        var userKey = $('#user-key').val()
        qiscus.setUser(userId, userKey, username)
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
            <label for="username">Username</label>
            <input id="username" type="text" name="username" value="guest-101" autocomplete="off" />
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
