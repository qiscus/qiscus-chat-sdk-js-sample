define([
  'jquery', 'lodash',
  'service/route',
  'service/content', 'service/qiscus'
], function ($, _, route, $content, qiscus) {
  function contactFormatter(contact) {
    return `
      <li class="contact-item"
        data-user-id="${contact.id}">
        <img src="${contact.avatarUrl}">
        <div class="name">${contact.name}</div>
      </li>
    `
  }

  var searchQuery = null
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
    return qiscus.instance.getUsers(searchQuery, nextPage, perPage, function (users) {
      isLoadingUser = false
      var users = users.map(contactFormatter).join('')
      $(users).insertBefore('.contact-list .load-more')

      // if (resp.meta.total_page === nextPage) {
      //   isAbleToLoadMore = false
      //   $content.find('.load-more').css({
      //     display: 'none'
      //   })
      // }
    })
  }, 100)

  function Users() {
    qiscus.instance.getUsers('', 1, 20, function (users) {
      var users = users.map(contactFormatter)
        .join('')
      $(users).insertBefore('.contact-list .load-more')
    })
    return `
      <div class="Users">
        <div class="toolbar">
          <button type="button" class="back-btn">
            <i class="icon icon-arrow-back"></i>
          </button>
          <div class="toolbar-title">Choose Contacts</div>
        </div>
        <button id="open-channel-btn" class="create-group-btn">
          <i class="icon icon-new-chat-group"></i> Open Channel
        </button>
        <form id="open-channel-form" class="create-group-btn" style="display:none">
          <label>Channel name:</label>
          <input type="text" name="channel-name" autofocus style="border: 1px solid rgba(0,0,0,.2);padding: 5px;margin: 5px;height: 30px;border-radius: 2px;">
        </form>
        <button id="create-group-btn" class="create-group-btn">
          <i class="icon icon-new-chat-group"></i> Create Group Chat
        </button>
        <div class="search-container">
          <i class="icon icon-search"></i>
          <input type="text" id="search-input" name="search-input" placeholder="Search">
        </div>
        <div class="contact-list-container">
          <div class="contact-list-title">Contacts</div>
          <ul class="contact-list">
            <li class="load-more">
              <button type="button">
                Load more
              </button>
            </li>
          </ul>
        </div>
      </div>
    `
  }

  window.$ = $
  window.jQuery = $
  $content
    .on('click', '.Users .back-btn', function (event) {
      event.preventDefault()
      route.push('/chat')
    })
    .on('click', '.Users li.contact-item', function (event) {
      event.preventDefault()
      var userId = $(event.currentTarget).data('user-id')
      qiscus.instance.chatUser(userId, void 0, function (room, err) {
        if (err) return console.log('error while chatting user', err)
        route.push('/chat-room', {
          roomName: room.name,
          roomAvatar: room.avatar,
          roomId: room.id,
        })
      })
    })
    .on('input', '.Users input#search-input', _.debounce(function (event) {
      searchQuery = event.target.value.length === 0
        ? null
        : event.target.value
      if (searchQuery === null) {
        isAbleToLoadMore = true
        return
      }
      return qiscus.instance.getUsers(searchQuery, void 0, void 0, function (users) {
        var users = users.map(contactFormatter).join('')
        $content.find('.contact-list')
          .empty()
          .append(users)
          .append('<li class="load-more"><button>Load more</button></li>')
      })
    }, 300))
    .on('click', '.Users #create-group-btn', function (event) {
      event.preventDefault()
      route.push('/create-group')
    })
    .on('click', '.Users #open-channel-btn', function (event) {
      event.preventDefault()
      var $form = $content.find('#open-channel-form')
      if ($form.is(':visible')) {
        $form.fadeOut()
      } else {
        $form.fadeIn()
      }
    })
    .on('click', '.Users .load-more button', function (event) {
      event.preventDefault()
      var childLength = $content.find('.contact-list').children().length - 1
      loadUser(childLength)
    })
    .on('submit', '.Users #open-channel-form', function (event) {
      event.preventDefault()
      var channelName = $('#open-channel-form input[type=text]').val()
      qiscus.instance.getChannel(channelName, function (room, error) {
        if (error) return console.log('Error while opening channel', error)
        route.push('/chat-room', {
          roomName: room.name,
          roomAvatar: room.avatarUrl,
          roomId: room.id,
        })
      })
    })
  Users.path = '/users'
  return Users
})
