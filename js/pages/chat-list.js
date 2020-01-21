define([
  'jquery', 'dateFns', 'lodash',
  'service/qiscus',
  'service/content',
  'service/route',
  'service/emitter',
  'service/html',
], function ($, dateFns, _, Qiscus, $content, route, emitter, html) {
  var newMessageIds = []
  var currentUser = () => Qiscus.instance.currentUser

  function Toolbar () {
    return html`
      <div class="Toolbar">
        <button id="profile-btn" type="button" class="avatar-btn">
          <img src="${currentUser().avatarUrl}" />
        </button>
        <div class="toolbar-title">Conversations</div>
        <button type="button" class="chat-btn">
          <i class="icon icon-new-chat"></i>
        </button>
      </div>
    `
  }

  function Empty () {
    return html`
      <div class="ChatList">
        ${Toolbar()}
        <div class="empty-content-container">
          <img src="/img/img-empty-chat.svg" class="empty-logo" />
          <div class="empty-title">Oops!!</div>
          <p class="empty-description">
            You don't have any conversation. <br />
            Lets send a message to your contact
          </p>
          <button type="button" class="start-chat">
            Start Chat
          </button>
        </div>
      </div>
    `
  }

  function getTime (lastMessageTime) {
    if (dateFns.isSameDay(lastMessageTime, new Date())) {
      return dateFns.format(lastMessageTime, 'HH:mm')
    } else {
      return dateFns.format(lastMessageTime, 'DD/MM/YYYY')
    }
  }

  function roomFormatter (room) {
    var lastComment = room.lastMessage.text.startsWith('[file]')
      ? 'File attachment'
      : room.lastMessage.text
    var unreadCountClass = room.unreadCount > 0
      ? 'room-unread-count'
      : 'room-unread-count hidden'
    return html`
      <li class="room-item"
        data-room-id="${room.id}"
        data-room-name="${room.name}"
        data-room-avatar="${room.avatarUrl}">
        <img class="room-avatar" src="${room.avatarUrl}" />
        <div class="room-data-container">
          <div class="room-content">
            <div class="room-name">${room.name}</div>
            <div class="room-last-message">${lastComment}</div>
          </div>
          <div class="room-meta">
            <div class="room-time">${getTime(room.lastMessage.timestamp)}</div>
            <div class="${unreadCountClass}">${room.unreadCount}</div>
          </div>
        </div>
      </li>
    `
  }

  $content
    .on('click', '.ChatList .room-item', function (event) {
      event.preventDefault()
      newMessageIds.length = 0
      var target = $(event.currentTarget)
      var roomId = target.data('room-id')
      var roomName = target.data('room-name')
      var roomAvatar = target.data('room-avatar')
      Qiscus.instance.getChatRoomWithMessages(roomId, function (room, error) {
        if (error) return console.error('Error when getting room', error.message)
        route.push('/chat-room', {
          roomId: roomId,
          roomName: roomName,
          roomAvatar: roomAvatar,
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
    .on('click', '.ChatList #profile-btn', function () {
      route.push('/profile')
    })
    .on('click', '.ChatList .load-more button', function (event) {
      event.preventDefault()
      var childLength = $content.find('.room-list')
        .children()
        .length - 1 // minus load-more button
      loadRooms(childLength)
    })

  Qiscus.instance.onMessageReceived(function (message) {
    var roomTarget = message.chatRoomId
    var $room = $content.find(`.room-item[data-room-id=${roomTarget}]`)
    $room.find('.room-last-message')
      .html(message.text)
    var $unreadCount = $room.find('.room-unread-count')
    var lastUnreadCount = Number($unreadCount.text())
    $unreadCount.removeClass('hidden')
      .text(lastUnreadCount + 1)
    $content.find('.ChatList .room-list')
      .prepend($room.detach())
  })

  function RoomList (rooms) {
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
  var loadRooms = _.debounce(function loadRooms (currentLength) {
    if (isLoadingRooms || !isAbleToLoadRoom) return

    var perPage = 10
    var currentPage = Math.ceil(currentLength / perPage)
    var nextPage = currentPage + 1

    isLoadingRooms = true
    Qiscus.instance.getAllChatRooms(
      false,
      false,
      false,
      nextPage,
      perPage,
      function (rooms, error) {
        if (error) console.error('Error when load more room', error)
        isLoadingRooms = false
        if (rooms.length < perPage) {
          isAbleToLoadRoom = false
          $content.find('.room-list .scrollspy').hide()
        }
        var rooms_ = rooms.map(roomFormatter).join('')
        $(rooms_).insertBefore('.room-list .scrollspy')
      }
    )
  }, 100)

  function ChatList () {
    var showParticipant = true
    var showRemoved = false
    var showEmpty = false
    var page = 1
    var limit = 10
    Qiscus.instance.getAllChatRooms(
      showParticipant, showRemoved, showEmpty,
      page, limit, function (rooms, error) {
        if (error) console.error('Error when getting room list', error)
        if (rooms.length === 0) $content.html(Empty())
        else $content.html(RoomList(rooms))
      })

    return Empty()
  }

  ChatList.path = '/chat'
  return ChatList
})
