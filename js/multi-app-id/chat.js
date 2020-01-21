define([
  'dateFns',
  'jquery',
  'lodash',
  'multi-app-id/content',
  'multi-app-id/route',
  'multi-app-id/qiscus',
  'multi-app-id/emitter',
], function (dateFns, $, _, $content, route, qiscus, emitter) {
  var isAbleToScroll = false
  var room = null
  var currentUser = () => JSON.parse(localStorage.getItem('chat::user'))

  function Toolbar (roomId) {
    var isGroup = false
    var participants = ''
    var avatar = ''
    var name = ''
    qiscus
      .getChatRooms([roomId], 1, false, true, function (rooms, err) {
        if (err) return console.log('error when getting room info', err)
        var room_ = rooms.pop()
        room = room_
        qiscus.subscribeChatRoom(room)

        participants = (function () {
          var limit = 3
          var overflowCount = room.participants.length - limit
          var participants = room.participants
            .slice(0, limit)
            .map(function (it) {
              return it.name.split(' ')[0]
            })
          if (room.participants.length <= limit)
            return participants.join(', ')
          return participants.concat('and ' + overflowCount + ' others.')
            .join(', ')
        })()
        isGroup = room.type === 'group'
        avatar = room.avatarUrl
        name = room.name
        var $toolbar = $content.find('.ToolbarChatRoom')
        $toolbar.find('img.avatar').attr('src', avatar)
        $toolbar.find('.room-name').text(name)
        if (isGroup) {
          $toolbar.find('.online-status')
            .addClass('participant-list')
            .text(participants)
        }
      })

    return `
      <div class="ToolbarChatRoom">
        <button type="button" class="btn-icon" id="chat-toolbar-btn">
          <i class="icon icon-arrow-back"></i>
        </button>
        <img class="avatar" src="${avatar}" />
        <button class="room-meta">
          <div class="room-name">${name}</div>
          ${
      isGroup
        ? `<small class="online-status participant-list">${participants}</small>`
        : `<small class="online-status">Online</small>`
    }
        </button>
      </div>
    `
  }

  function Empty () {
    return `
      <div class="comment-list-container --empty">
        <img src="/img/img-empty-message.svg">
        <div class="empty-title">Send a message!</div>
        <p class="empty-description">
          Great discussion start from greeting
          each others first
        </p>
      </div>
    `
  }

  function AttachmentCaptioning (file) {
    return `
      <div class="AttachmentCaptioning" style="display:none">
        <div class="toolbar">
          <button type="button" class="btn-icon" id="attachment-toolbar-btn">
            <i class="icon icon-arrow-back"></i>
          </button>
          <div class="file-name">${file.name}</div>
        </div>
        <div class="image-preview-container">
          <img class="attachment-preview" src="${file.url}">
        </div>
        <form class="caption-form-container">
          <input type="text" id="caption-input" name="caption-input" placeholder="Add caption to your image">
          <button type="submit" id="caption-submit-btn">
            <i class="icon icon-send"></i>
          </button>
        </form>
      </div>
    `
  }

  function CommentItem (comment) {
    var content = comment.text
    var type = comment.type
    var isMe = comment.sender.id === currentUser().id
    if (type === 'upload') {
      var thumbnailURL = URL.createObjectURL(comment.file)
      var caption = comment.caption
      content = `
        <a href="${fileURL}" style="position:relative; ${
        caption ? 'height:80%;' : ''
      }" target="_blank">
          <div class="upload-overlay">
            <div class="progress">
              <div class="progress-inner"></div>
            </div>
          </div>
          <img class="image-preview" src="${thumbnailURL}" alt="preview">
        </a>
        <div class="image-caption ${caption ? '' : 'hidden'}">
          ${caption}
        </div>
      `
    }
    if (type === 'upload-file') {
      var filename = comment.file.name
      content = `
        <a href="#" style="position:relative;" target="_blank">
          <div class="upload-overlay">
            <div class="progress">
              <div class="progress-inner"></div>
            </div>
          </div>
          <div class="comment-file">
            <i class="icon icon-attachment-file"></i><div class="filename">${filename}</div>
          </div>
        </a>
      `
    }
    if (
      type === 'custom' &&
      comment.payload.type === 'image' &&
      typeof comment.payload.content !== 'string'
    ) {
      var fileURL = comment.payload.content.url
      var thumbnailURL = getAttachmentURL(fileURL).thumbnailURL
      var caption = comment.payload.content.caption
      caption = caption.length === 0 ? null : caption
      content = `
        <a href="${fileURL}" target="_blank" style="${
        caption ? 'height:80%' : ''
      }">
          <img class="image-preview" src="${thumbnailURL}" alt="preview">
        </a>
        <div class="image-caption ${caption ? '' : 'hidden'}">
          ${caption}
        </div>
      `
    } else if (
      type === 'custom' &&
      comment.payload.type === 'file' &&
      typeof comment.payload.content !== 'string'
    ) {
      var fileURL = comment.payload.content.url
      var filename = comment.payload.content.file_name
      type = 'file'
      content = `
        <a href="${fileURL}" target="_blank">
          <div class="comment-file">
            <i class="icon icon-attachment-file"></i><div class="filename">${filename}</div>
          </div>
        </a>
      `
    } else if (type === 'file_attachment') {
      var fileURL = comment.payload.url
      var filename = comment.payload.file_name
      var attachmentURL = getAttachmentURL(fileURL)
      var thumbnailURL = attachmentURL.thumbnailURL
      var isImage = attachmentURL.isImage
      var caption = comment.payload.caption
      caption = caption.length === 0 ? null : caption
      type = 'file'
      content = `
        <a href="${fileURL}" target="_blank"
          style="${caption ? 'height:80%' : ''}">
          ${!isImage ? (
        `<div class="comment-file">
              <i class="icon icon-attachment-file"></i><div class="filename">${filename}</div>
            </div>`
      ) : ''}
          ${isImage
        ? `<img class="image-preview" src="${thumbnailURL}" alt="preview">`
        : ''}
        </a>
        ${isImage ? (
        `<div class="image-caption ${caption ? '' : 'hidden'}">
            ${caption}
          </div>`
      ) : ''}
      `
    }
    if (type === 'date') {
      return `
        <li class="comment-item date"
          data-comment-id="${comment.id}"
          data-last-comment-id="${comment.previousMessageId}"
          data-unique-id="${comment.uniqueId}"
          data-comment-timestamp="${comment.timestamp}"
          data-comment-type="${type}">
          <div class="message-container date">${content}</div>
        </li>
      `
    }
    return `
        <li class="comment-item ${isMe ? 'me' : ''}"
          data-comment-id="${comment.id}"
          data-last-comment-id="${comment.previousMessageId}"
          data-unique-id="${comment.uniqueId}"
          data-comment-timestamp="${comment.timestamp}"
          data-status="${comment.status}"
          data-time="${comment.timestamp.getTime()}"
          data-comment-type="${type}">
          <div class="message-container">
            ${content}
          </div>
          <div class="message-meta">
            <div class="message-time">
              ${dateFns.format(comment.timestamp, 'HH:mm')} | ${comment.timestamp.getTime()}
            </div>
            <i class="icon icon-message-${comment.status}"></i>
          </div>
          ${
      isMe
        ? `<div class="message-deleter">
            <button type="button" data-comment-id="${comment.uniqueId}">
              Delete
            </button>
          </div>`
        : ''
    }
        </li>
      `
  }

  function getAttachmentURL (fileURL) {
    var thumbnailURL = fileURL.replace('upload', 'upload/w_320,h_320,c_limit')
    var reImage = /\S+(jpe?g|gif|png|svg)/ig
    return {
      origin: fileURL,
      thumbnailURL: thumbnailURL,
      isImage: reImage.test(thumbnailURL),
    }
  }

  function commentListFormatter (comments) {
    var _comments = []
    for (var i = 0; i < comments.length; i++) {
      var comment = comments[i]
      var lastComment = comments[i - 1]
      var commentDate = new Date(comment.timestamp)
      comment.date = commentDate
      var lastCommentDate =
        lastComment == null ? null : new Date(lastComment.timestamp)
      var isSameDay = dateFns.isSameDay(commentDate, lastCommentDate)
      var showDate = lastComment != null && !isSameDay

      // clone comment object because we need it property later
      var dateComment = Object.assign({}, comment)
      dateComment.type = 'date'
      dateComment.text = dateFns.format(dateComment.timestamp, 'DD MMM YYYY')
      // FIXME: invalid comment date
      if (i === 0 || showDate) _comments.push(dateComment)
      _comments.push(comment)
    }
    return _comments.sort((a, b) => a.date - b.date)
  }

  function createDateComment (date) {
    return {
      type: 'date',
      message: dateFns.format(date, 'DD MMM YYYY'),
    }
  }

  function CommentList (comments) {
    return `
      <ul id="comment-list-container">
        <li class="load-more">
          <button type="button" class="load-more-btn">Load more</button>
        </li>
        ${commentListFormatter(comments)
      .map(CommentItem)
      .join('')}
      </ul>
    `
  }

  function openAttachment (event) {
    if (event != null) event.preventDefault()
    $content.find('.attachment-overlay').show()
    $content.find('ul.attachment-picker-container').slideDown(200)
  }

  function closeAttachment (event) {
    if (event != null) event.preventDefault()
    $content.find('.attachment-overlay').hide()
    $content.find('ul.attachment-picker-container').slideUp(200)
  }

  function loadComment (lastCommentId) {
    var limit = 20
    return qiscus
      .instance
      .getPreviousMessagesById(room.id, limit, lastCommentId || 0,
        function (messages, err) {
          if (err) return console.log('error while getting comments', err)
          if (messages.length == 0) return
          var comments = commentListFormatter(messages)
          var $comments = $(comments.map(CommentItem).join(''))
          $comments.insertAfter('.load-more')

          var lastCommentId = messages[0].previousMessageId
          if (lastCommentId === 0) {
            $content.find('.load-more').addClass('hidden')
          }
        })
  }

  var attachmentPreviewURL = null
  var attachmentImage = null
  var attachmentFile = null

  // Online status management
  emitter.on('qiscus::online-presence', function (data) {
    var $onlineStatus = $content.find('small.online-status')
    var lastOnline = dateFns.isSameDay(data.lastOnline, new Date())
      ? dateFns.format(data.lastOnline, 'hh:mm')
      : dateFns.format(data.lastOnline, 'D/M/YY')

    if (data.isOnline) {
      $onlineStatus.removeClass('--offline').text('Online')
    } else {
      $onlineStatus.addClass('--offline').text(`Last online on ${lastOnline}`)
    }
  })

  var typingTimeoutId = -1
  var lastValue = null
  emitter.on('qiscus::typing', function (event) {
    var roomId = event.room_id
    if (qiscus.selected == null) return
    if (Number(roomId) !== qiscus.selected.id) return
    if (qiscus.selected.room_type !== 'single') return
    var $onlineStatus = $content.find('.room-meta .online-status')
    lastValue = $onlineStatus.text()
    $onlineStatus.text('Typing ...')

    if (typingTimeoutId !== -1) clearTimeout(typingTimeoutId)
    typingTimeoutId = setTimeout(function () {
      $onlineStatus.text(lastValue)
      clearTimeout(typingTimeoutId)
      typingTimeoutId = -1
    }, 1000)
  })

  $content
    .on('click', '.Chat #chat-toolbar-btn', function (event) {
      event.preventDefault()
      qiscus.unsubscribeChatRoom(room)
      qiscus.clearUser()
      route.replace('/login')
    })
    .on('submit', '.Chat #message-form', function (event) {
      event.preventDefault()
      var message = event.currentTarget['message'].value
      if (message == null || message.length === 0) return
      var timestamp = new Date()
      var uniqueId = timestamp.getTime().toString()
      var commentId = timestamp.getTime()
      var comment = {
        id: commentId,
        uniqueId: commentId,
        text: message,
        type: 'text',
        sender: {
          id: currentUser().id,
          name: currentUser().name,
        },
        timestamp: timestamp,
        status: 'sending',
      }

      // if empty state change into list comment state
      var $commentList = $content.find('.comment-list-container ul')
      if ($commentList.length === 0) {
        $content.find('.comment-list-container').html(CommentList([]))
        $commentList = $content.find('.comment-list-container ul')
      }

      $commentList.append(CommentItem(comment))
      var comment = $content.find(
        '.comment-item[data-comment-id="' + commentId + '"]',
      )
      comment.attr('data-unique-id', uniqueId)
      if (isAbleToScroll) {
        comment.get(0).scrollIntoView({
          block: 'start',
          behavior: 'smooth',
        })
      }
      $content.find('#message-form input[name="message"]').val('')

      qiscus
        .sendMessage(room.id, {
          payload: {},
          extras: {},
          type: 'text',
          message: message,
        }, function (message, err) {
          if (err) {
            comment
              .find('i.icon')
              .removeClass('icon-message-sending')
              .addClass('icon-message-failed')
            return console.log('error when sending message', err)
          }
          comment.attr('data-unique-id', message.uniqueId)
          comment.attr('data-comment-id', message.id)
          comment.attr('data-last-comment-id', message.previousMessageId)
          comment.attr('data-comment-timestamp', message.timestamp)
          comment.find('i.icon')
            .removeClass('icon-message-sending')
            .addClass('icon-message-sent')
          comment.find('.message-container').html(message.text)
        })
    })
    .on('click', '.Chat #attachment-cancel', closeAttachment)
    .on('click', '.Chat #attachment-btn', openAttachment)
    .on('click', '.Chat #attachment-image', function (event) {
      event.preventDefault()
      $('#qiscus-widget')
        .find('#input-image')
        .click()
    })
    .on('click', '.Chat #attachment-file', function (event) {
      event.preventDefault()
      $('#qiscus-widget')
        .find('#input-file')
        .click()
    })
    .on('change', '#input-image', function (event) {
      var file = Array.from(event.currentTarget.files).pop()
      if (attachmentPreviewURL != null)
        URL.revokeObjectURL(attachmentPreviewURL)
      attachmentPreviewURL = URL.createObjectURL(file)
      attachmentImage = file
      closeAttachment()
      var $attachmentCaptioning = $content.find('.AttachmentCaptioning')
      $attachmentCaptioning.slideDown()
      $attachmentCaptioning
        .find('.attachment-preview')
        .attr('src', attachmentPreviewURL)
      $content.find('.file-name').text(file.name)
    })
    .on('submit', '.Chat .caption-form-container', function (event) {
      event.preventDefault()
      closeAttachment()
      $content.find('.AttachmentCaptioning').slideUp()

      var file = Array.from($('#input-image').get(0).files).pop()
      var caption = event.currentTarget['caption-input'].value.trim()

      var timestamp = new Date()
      var uniqueId = timestamp.getTime()
      var commentId = timestamp.getTime()
      var comment = {
        id: commentId,
        uniqueId: uniqueId,
        unique_temp_id: uniqueId,
        message: message,
        type: 'upload',
        email: currentUser().id,
        timestamp: timestamp,
        status: 'sending',
        file: file,
        caption: caption,
        sender: currentUser(),
      }
      $content.find('.comment-list-container ul').append(CommentItem(comment))
      var $comment = $(`.comment-item[data-unique-id="${uniqueId}"]`)
      var $progress = $comment.find('.progress-inner')
      $comment.get(0).scrollIntoView({
        behavior: 'smooth',
      })

      qiscus.sendFileMessage(room.id, caption, file,
        function (error, progress, message) {
          if (error) return console.log('failed uploading image', error)
          if (progress) {
            $progress.css({
              width: `${progress}`,
            })
          }
          if (message) {
            $comment
              .attr('data-comment-id', resp.id)
              .attr('data-comment-type', 'image')
              .find('i.icon')
              .removeClass('icon-message-sending')
              .addClass('icon-message-sent')
            $comment.find('.upload-overlay').remove()
            var url = getAttachmentURL(resp.payload.url)
            $comment.find('a').attr('href', url.origin)
            var objectURL = $comment.find('img').attr('src')
            URL.revokeObjectURL(objectURL)
            $comment.find('img').attr('src', url.thumbnailURL)
          }
        })
    })
    .on('change', '#input-file', function (event) {
      closeAttachment()

      var file = Array.from(event.currentTarget.files).pop()
      var timestamp = new Date()
      var uniqueId = timestamp.getTime()
      var commentId = timestamp.getTime()
      var comment = {
        id: commentId,
        uniqueId: uniqueId,
        unique_temp_id: uniqueId,
        message: 'Send Attachment',
        type: 'upload-file',
        email: qiscus.user_id,
        timestamp: timestamp,
        status: 'sending',
        file: file,
      }

      $content.find('.comment-list-container ul').append(CommentItem(comment))
      var $comment = $(`.comment-item[data-unique-id=${uniqueId}]`)
      var $progress = $comment.find('.progress-inner')
      $comment.get(0).scrollIntoView({
        behavior: 'smooth',
      })

      qiscus.upload(file, function (error, progress, fileURL) {
        if (error) return console.log('failed uploading file', error)
        if (progress) {
          $progress.css({
            width: `${progress.percent}%`,
          })
        }
        if (fileURL) {
          var roomId = qiscus.selected.id
          var text = 'Send Attachment'
          var type = 'file_attachment'
          var payload = JSON.stringify({
            url: fileURL,
            caption: '',
            file_name: file.name,
            size: file.size,
          })
          qiscus
            .sendComment(roomId, text, uniqueId, type, payload)
            .then(function (resp) {
              $comment
                .attr('data-comment-id', resp.id)
                .attr('data-comment-type', 'file')
                .find('i.icon.icon-message-sending')
                .removeClass('icon-message-sending')
                .addClass('icon-message-sent')
              $comment.find('.upload-overlay').remove()
              var url = getAttachmentURL(resp.payload.url)
              $comment.find('a').attr('href', url.origin)
            })
            .catch(function (error) {
              console.log('failed sending comment', error)
            })
        }
      })
    })
    .on('click', '.Chat #attachment-toolbar-btn', function (event) {
      event.preventDefault()
      $content.html(Chat(route.location.state))
    })
    .on('click', '.Chat .load-more-btn', function (event) {
      event.preventDefault()
      var $commentList = $content.find('.comment-list-container ul')
      var lastCommentId = $commentList.children().get(1).dataset[
        'lastCommentId'
        ]
      loadComment(parseInt(lastCommentId))
    })
    .on('click', '.Chat .room-meta', function (event) {
      event.preventDefault()
      route.push('/room-info', { roomId: room.id })
    })
    .on(
      'keydown',
      '.Chat input#message',
      _.throttle(function () {
        qiscus.publishTyping(1)
      }, 300),
    )
    .on('click', '.Chat .message-deleter button', function (event) {
      event.preventDefault()
      var $el = $(this)
      var commentId = $(this).attr('data-comment-id')
      var $comment = $el.closest('.comment-item')
      qiscus.deleteMessages([commentId], function (messages, err) {
        if (err) return console.log('error while deleting message', err)
        $comment.remove()
      })
    })

  function Chat () {
    var state = route.location.state
    var roomId = state.roomId
    var limit = 10
    // var limit = 100
    var messageId = 0

    qiscus
      .getNextMessagesById(roomId, limit, messageId,
        function (messages, error) {
          if (error) return console.error('Error when loading message',
            error.message)

          $content
            .find('.comment-list-container')
            .removeClass('--empty')
            .html(CommentList(messages))

          // Apply scroll into bottom with animation
          var $commentList = $content.find('.comment-list-container ul')
          var element = $commentList.children().last()
          element.get(0).scrollIntoView({
            behavior: 'smooth',
            block: 'start',
          })

          // Disable load more if it was the first comment
          var firstComment = $commentList.children().get(1)
          if (firstComment == null) {
            $content.find('.load-more').addClass('hidden')
          } else {
            var lastCommentId = firstComment.dataset.lastCommentId
            if (Number(lastCommentId) === 0) {
              $content.find('.load-more').addClass('hidden')
            }
          }

          var $commentListContainer = $('.comment-list-container ul')
          window.$commentListContainer = $commentListContainer
          $commentListContainer.on(
            'scroll',
            _.debounce(function () {
              var $root = $(this)
              var $$root = $root.get(0)

              var total = Math.ceil($root.scrollTop() + $root.height())
              var required = $$root.scrollHeight

              var offset = 50 // CommentItem height
              isAbleToScroll = !(required - offset >= total)

              // Mark comment as read if it appear in the viewport
              var $lastComment = $commentListContainer.find(
                '.comment-item:not(.me)').last()
              var status = $lastComment.attr('data-status')
              var isRead = status === 'read'

              if (isAbleToScroll && !isRead) {
                var messageId = Number($lastComment.attr('data-comment-id'))
                qiscus.markAsRead(roomId, messageId,
                  function (data, err) {
                    console.log('Done marking as read')
                  })
              }
            }, 300),
          )
        })
    qiscus.onMessageReceived(function (message) {

      // skip if it is owned message
      if (message.sender.id === currentUser().id) return

      // Skip if comment room_id are not matched current room id
      if (message.chatRoomId !== roomId) return

      // Skip if comment already there
      var comments_ = $content.find(
        `.comment-item[data-unique-id="${message.uniqueId}"]`)
      if (comments_.length !== 0) return

      var $comment = $(CommentItem(message))
      $content.find('.comment-list-container ul').append($comment)
      if (isAbleToScroll) {
        $comment.get(0).scrollIntoView({ behavior: 'smooth' })
      }
    })
    qiscus.onMessageDelivered(function (message) {
      var commentId = message.id

      $content
        .find(`.comment-item[data-comment-id="${commentId}"]`)
        .find('i.icon')
        .removeClass('icon-message-sent')
        .addClass('icon-message-delivered')
      var commentItems = $content.find('.comment-item')
      var targetIdx = Array.from(commentItems)
        .findIndex(it => it.dataset['commentId'] === String(commentId))
      $content.find('.comment-item').each(function (idx) {
        if (idx >= targetIdx) return

        $(this)
          .find('i.icon')
          .removeClass('icon-message-sent')
          .addClass('icon-message-delivered')
      })
    })
    qiscus.onMessageRead(function (message) {
      var commentId = message.id

      $content
        .find(`.comment-item[data-comment-id="${commentId}"]`)
        .find('i.icon')
        .removeClass('icon-message-sent')
        .addClass('icon-message-read')
      $content
        .find(`.comment-item[data-comment-id=${commentId}]`)
        .attr('data-status', 'read')
      var commentItems = $content.find('.comment-item')
      var targetIdx = Array.from(commentItems)
        .findIndex(it => it.dataset['commentId'] === String(commentId))

      $content.find('.comment-item').each(function (idx) {
        if (idx >= targetIdx) return

        $(this)
          .attr('data-status', 'read')
        $(this)
          .find('i.icon')
          .removeClass('icon-message-sent')
          .removeClass('icon-message-delivered')
          .addClass('icon-message-read')
      })
    })
    return `
      <div class="Chat" data-room-id="${roomId}">
        ${Toolbar(roomId)}
        ${Empty()}
        ${AttachmentCaptioning({ url: '#', name: '' })}
        <form id="message-form" class="message-form">
          <button type="button" id="attachment-btn">
            <i class="icon icon-attachment"></i>
          </button>
          <input autofocus autocomplete="off" type="text" placeholder="Type your message" id="message" name="message">
          <button type="submit">
            <i class="icon icon-send"></i>
          </button>
        </form>
        <div class="attachment-overlay" style="display:none"></div>
        <ul class="attachment-picker-container" style="display:none">
          <li>
            <button type="button" class="attachment-btn" id="attachment-image">
              <i class="icon icon-attachment-image"></i> Image from Gallery
            </button>
          </li>
          <li>
            <button type="button" class="attachment-btn" id="attachment-file">
              <i class="icon icon-attachment-file"></i> File / Document
            </button>
          </li>
          <li>
            <button type="button" class="attachment-btn" id="attachment-cancel">
              <i class="icon icon-attachment-cancel"></i> Cancel
            </button>
          </li>
        </ul>
      </div>
    `
  }

  Chat.path = '/chat-room'
  return Chat
})
