define([
  'jquery', 'dateFns', 'lodash',
  'service/qiscus',
  'service/content',
  'service/route',
  'service/emitter'
], function ($, dateFns, _, qiscus, $content, route, emitter) {
  function Toolbar() {
    return `
      <div class="Toolbar">
        <button id="profile-btn" type="button" class="avatar-btn">
          <img src="${qiscus.userData.avatar_url}">
        </button>
        <div class="toolbar-title">Conversations</div>
        <button type="button" class="chat-btn">
          <i class="icon icon-new-chat"></i>
        </button>
      </div>
    `
  }

  function Empty() {
    return `
      <div class="ChatList">
        ${Toolbar()}
        <div class="empty-content-container">
          <img src="/img/img-empty-chat.svg" class="empty-logo">
          <div class="empty-title">Oops!!</div>
          <p class="empty-description">
            You don't have any conversation. <br>
            Lets send a message to your contact
          </p>
          <button type="button" class="start-chat">
            Start Chat
          </button>
        </div>
      </div>
    `
  }

  function getTime(lastMessageTime) {
    if (dateFns.isSameDay(lastMessageTime, new Date())) {
      return dateFns.format(lastMessageTime, 'HH:mm')
    } else {
      return dateFns.format(lastMessageTime, 'DD/MM/YYYY')
    }
  }

  function roomFormatter(room) {
    var lastComment = room.last_comment_message.startsWith('[file]')
      ? 'File attachment'
      : room.last_comment_message
    var unreadCountClass = room.count_notif > 0 ? 'room-unread-count' : 'room-unread-count hidden'
    return `
      <li class="room-item"
        data-room-id="${room.id}"
        data-room-name="${room.name}"
        data-room-avatar="${room.avatar}">
        <img class="room-avatar" src="${room.avatar}">
        <div class="room-data-container">
          <div class="room-content">
            <div class="room-name">${room.name}</div>
            <div class="room-last-message">${lastComment}</div>
          </div>
          <div class="room-meta">
            <div class="room-time">${getTime(room.last_comment_message_created_at)}</div>
            <div class="${unreadCountClass}">${room.count_notif}</div>
          </div>

        </div>
      </li>
    `
  }

  $content
    .on('click', '.ChatList .room-item', function (event) {
      event.preventDefault()
      var target = $(event.currentTarget)
      var roomId = target.data('room-id')
      var roomName = target.data('room-name')
      var roomAvatar = target.data('room-avatar')
      qiscus.getRoomById(roomId)
        .then(function (data) {
          route.push('/chat-room', {
            roomId: roomId,
            roomName: roomName,
            roomAvatar: roomAvatar
          })
        })
    })
    .on('click', '.ChatList .chat-btn', function (event) {
      event.preventDefault()
      route.push('/users')
    })
    .on('click', '.ChatList .start-chat', function (event) {
      event.preventDefault()
      route.push('/users')
    })
    .on('click', '.ChatList #profile-btn', function (event) {
      route.push('/profile')
    })
    .on('click', '.ChatList .load-more button', function (event) {
      event.preventDefault()
      var childLength = $content.find('.room-list')
        .children()
        .length - 1 // minus load-more button
      loadRooms(childLength)
    })
  emitter.on('qiscus::new-message', function (comment) {
    var roomId = comment.room_id
    var $room = $content.find(`.room-item[data-room-id="${roomId}"]`)
    $room.find('.room-last-message')
      .text(comment.message)
    var $unreadCount = $room.find('.room-unread-count')
    var lastUnreadCount = Number($unreadCount.text())
    $unreadCount
      .removeClass('hidden')
      .text(lastUnreadCount + 1)
    $content.find('.ChatList .room-list')
      .prepend($room.detach())
  })

  function RoomList(rooms) {
    return `
      <div class="ChatList">
        ${Toolbar()}
        <ul class="room-list">
          ${rooms.map(roomFormatter).join('')}
          <li class="load-more">
            <button type="button">
              Load more
            </button>
          </li>
        </ul>
      </div>
    `
  }

  var isLoadingRooms = false
  var isAbleToLoadRoom = true
  var loadRooms = _.debounce(function loadRooms(currentLength) {
    if (isLoadingRooms || !isAbleToLoadRoom) return

    var perPage = 10
    var currentPage = Math.ceil(currentLength / perPage)
    var nextPage = currentPage + 1

    isLoadingRooms = true
    return qiscus.loadRoomList({
      page: nextPage,
      limit: perPage
    }).then(function (roomData) {
      isLoadingRooms = false
      if (roomData.length < perPage) {
        isAbleToLoadRoom = false
        $content.find('.room-list .scrollspy').hide()
      }
      var rooms = roomData.map(roomFormatter).join('')
      $(rooms).insertBefore('.room-list .scrollspy')
    })
  }, 100)

  function ChatList() {
    qiscus.loadRoomList()
      .then(function (rooms) {
        if (rooms.length === 0) $content.html(Empty())
        else $content.html(RoomList(rooms))
      })

    return Empty()
  }

  ChatList.path = '/chat'
  return ChatList
})
