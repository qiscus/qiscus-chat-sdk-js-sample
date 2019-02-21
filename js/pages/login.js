define([
  'jquery', 'service/route', 'service/qiscus'
], function ($, route, qiscus) {

  function LoginPage() {
    $('#qiscus-widget').on('submit', '#LoginForm', function (event) {
      event.preventDefault()
      // route.push('/chat')
      var email = event.target['email']
      var displayName = event.target['displayname']
      qiscus.setUser(email, displayName)
        .then(function (data) {
          route.push('/chat')
        })
    })
    return `
      <div class="LoginPage">
        <img src="/img/logo.svg" class="logo">
        <form id="LoginForm">
          <div class="form-group">
            <label for="email">Email</label>
            <input id="email" type="email" name="email">
          </div>
          <div class="form-group">
            <label for="displayname">Display Name</label>
            <input id="displayname" type="text" name="displayname">
          </div>
          <div class="form-group">
            <button type="submit">Start <i class="fas fa-arrow-right"></i></button>
          </div>
        </form>
      </div>
    `
  }

  return LoginPage

})
