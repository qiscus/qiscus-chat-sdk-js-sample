define([
  'dateFns',
  'service/qiscus',
  'service/content',
  'service/route'
], function (dateFns, qiscus, content, route) {
  function Toolbar() {
    return `
      <div class="Toolbar">
        <button type="button" class="avatar-btn">
          <img src="/img/img-empty-avatar.svg">
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
    var lastComment = room.last_comment_message.startsWith('[file]') ?
      'File attachment' :
      room.last_comment_message
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

  function RoomList(rooms) {
    $('#qiscus-widget').on('click', '.room-item', function (event) {
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
    return `
      <div class="ChatList">
        ${Toolbar()}
        <ul class="room-list">
        ${rooms.map(roomFormatter).join('')}
        </ul>
      </div>
    `
  }

  function ChatList() {
    var rooms = []
    qiscus.loadRoomList()
      .then(function (rooms) {
        if (rooms.length === 0) content.html(Empty())
        else content.html(RoomList(rooms))
      })

    if (rooms.length === 0) return Empty()
  }

  ChatList.path = '/chat'
  return ChatList
})
