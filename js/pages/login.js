define([
  'jquery', 'service/route', 'service/content', 'service/qiscus'
], function ($, route, $content, qiscus) {

  function doLogin(userId, userKey, displayName) {
    qiscus.setUser(userId, userKey, displayName)
  }
  function LoginPage(state) {
    // For some reason, jquery.on('submit') are very slow
    // and did not want to call qiscus.setUser
    document.addEventListener('submit', function (event) {
      if (event.target.id === 'LoginForm') {
        event.preventDefault()
        var userId = $('#user-id').val()
        var userKey = $('#user-key').val()
        var displayName = $('#displayname').val()
        doLogin(userId, userKey, displayName)
      }
    })
    return `
      <div class="LoginPage">
        <img src="/img/logo.svg" class="logo">
        <form id="LoginForm">
          <div class="form-group">
            <label for="userId">User ID</label>
            <input id="user-id" type="text" name="user-id" value="afief">
          </div>
          <div class="form-group">
            <label for="user-key">User Key</label>
            <input id="user-key" type="password" name="user-key" value="qwe12345">
          </div>
          <div class="form-group">
            <label for="displayname">Display Name</label>
            <input id="displayname" type="text" name="displayname" value="afief-test-1">
          </div>
          <div class="form-group">
            <button type="submit" id="submit-login-btn">Start <i class="fas fa-arrow-right"></i></button>
          </div>
        </form>
      </div>
    `
  }
  LoginPage.path = '/login'

  return LoginPage
})
