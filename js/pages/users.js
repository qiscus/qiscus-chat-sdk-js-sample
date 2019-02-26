define([
  'jquery', 'lodash',
  'service/route',
  'service/content', 'service/qiscus'
], function ($, _, route, $content, qiscus) {
  function contactFormatter(contact) {
    return `
      <li class="contact-item"
        data-user-id="${contact.email}">
        <img src="${contact.avatar_url}">
        <div class="name">${contact.username}</div>
      </li>
    `
  }

  var searchQuery = null

  $content
    .on('click', '.Users .back-btn', function (event) {
      event.preventDefault()
      route.push('/chat')
    })
    .on('click', 'li.contact-item', function (event) {
      event.preventDefault()
      var userId = $(event.currentTarget).data('user-id')
      qiscus.chatTarget(userId)
        .then(function (room) {
          console.log('room', room)
          route.push('/chat-room', {
            roomName: room.name,
            roomAvatar: room.avatar
          })
        })
    })
    .on('input', 'input#search-input', _.debounce(function (event) {
      searchQuery = event.target.value.length === 0
        ? null
        : event.target.value
      return qiscus.getUsers(searchQuery)
        .then(function (resp) {
          var users = resp.users.map(contactFormatter).join('')
          $content.find('.contact-list')
            .empty()
            .append(users)
            .append('<li class="scrollspy">Loading ...</li>')
        })
    }, 300))


  var isLoadingUser = false
  var isAbleToLoadMore = true
  var totalUser = 0
  var loadUser = _.debounce(function loadUser(currentLength) {
    if (isLoadingUser) return
    if (!isAbleToLoadMore) return

    var perPage = 20
    var currentPage = Math.ceil(currentLength / perPage)
    var nextPage = currentPage + 1

    isLoadingUser = true
    return qiscus.getUsers(searchQuery, nextPage)
      .then(function (resp) {
        isLoadingUser = false
        var users = resp.users.map(contactFormatter).join('')
        $(users).insertBefore('.contact-list .scrollspy')

        if (resp.meta.total_page === nextPage) {
          isAbleToLoadMore = false
          $content.find('.scrollspy').css({
            display: 'none'
          })
        }
      })

  }, 100)

  function Users() {
    qiscus.getUsers()
      .then(function (resp) {
        var users = resp.users.map(contactFormatter)
          .join('')
        $(users).insertBefore('.contact-list .scrollspy')

        $content.find('.contact-list').on('scroll', function (event) {
          var py = event.currentTarget
          var sy = $(py).find('.scrollspy').get(0)

          var offset = (sy.offsetTop - (py.offsetHeight + sy.scrollHeight + sy.offsetHeight)) - 10
          var scrollTop = Math.round(py.scrollTop)
          var shouldLoadMore = scrollTop > offset
          var childLength = py.children.length - 1
          if (shouldLoadMore) {
            loadUser(childLength)
          }
        })
      })
    return `
      <div class="Users">
        <div class="toolbar">
          <button type="button" class="back-btn">
            <i class="icon icon-arrow-back"></i>
          </button>
          <div class="toolbar-title">Choose Contacts</div>
        </div>
        <div class="search-container">
          <i class="icon icon-search"></i>
          <input type="text" id="search-input" name="search-input" placeholder="Search">
        </div>
        <div class="contact-list-container">
          <div class="contact-list-title">Contacts</div>
          <ul class="contact-list">
            <li class="scrollspy">Loading ...</li>
          </ul>
        </div>
      </div>
    `
  }

  Users.path = '/users'
  return Users
})
