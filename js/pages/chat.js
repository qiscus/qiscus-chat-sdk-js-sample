define([
  'dateFns', 'jquery', 'lodash',
  'service/content', 'service/route',
  'service/qiscus', 'service/emitter'
], function (dateFns, $, _, $content, route, qiscus, emitter) {
  var isAbleToScroll = false

  function Toolbar(name, avatar) {
    var isGroup = qiscus.selected.room_type === 'group'
    var participants = (function () {
      var limit = 3
      var overflowCount = qiscus.selected.participants.length - limit
      var participants = qiscus.selected.participants
      .slice(0, limit)
      .map(it => it.username.split(' ')[0])
      if (qiscus.selected.participants.length <= limit) return participants.join(', ')
      return participants.concat(`and ${overflowCount} others.`).join(', ')
    })()
    return `
      <div class="ToolbarChatRoom">
        <button type="button" class="btn-icon" id="chat-toolbar-btn">
          <i class="icon icon-arrow-back"></i>
        </button>
        <img class="avatar" src="${avatar}">
        <button class="room-meta">
          <div class="room-name">${name}</div>
          ${ isGroup
            ? `<small class="online-status participant-list">${participants}</small>`
            : `<small class="online-status">Online</small>`}
        </button>
      </div>
    `
  }

  function Empty() {
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

  function AttachmentCaptioning(file) {
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

  function CommentItem(comment) {
    var content = comment.message
    var type = comment.type
    var isMe = comment.email == qiscus.user_id
    if (type === 'upload') {
      var thumbnailURL = URL.createObjectURL(comment.file)
      var caption = comment.caption
      content = `
        <a href="${fileURL}" style="position:relative; ${caption ? 'height:80%;' : ''}" target="_blank">
          <div class="upload-overlay">
            <div class="progress">
              <div class="progress-inner"></div>
            </div>
          </div>
          <img class="image-preview" src="${thumbnailURL}">
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
    if (type === 'custom' && comment.payload.type === 'image' &&
      typeof (comment.payload.content) !== 'string') {
      var fileURL = comment.payload.content.url
      var thumbnailURL = getAttachmentURL(fileURL).thumbnailURL
      var type = 'image'
      var caption = comment.payload.content.caption
      caption = caption.length === 0 ? null : caption
      content = `
        <a href="${fileURL}" target="_blank" style="${caption ? 'height:80%' : ''}">
          <img class="image-preview" src="${thumbnailURL}">
        </a>
        <div class="image-caption ${caption ? '' : 'hidden'}">
          ${caption}
        </div>
      `
    } else if (type === 'custom' && comment.payload.type === 'file' && typeof (comment.payload.content) !== 'string') {
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
    }
    return `
        <li class="comment-item ${isMe ? 'me' : ''}"
          data-comment-id="${comment.id}"
          data-last-comment-id="${comment.comment_before_id}"
          data-unique-id="${comment.unique_temp_id}"
          data-comment-timestamp="${comment.unix_timestamp}"
          data-comment-type="${type}">
          <div class="message-container">
            ${content}
          </div>
          <div class="message-meta">
            <div class="message-time">
              ${dateFns.format(comment.timestamp, 'HH:mm')}
            </div>
            <i class="icon icon-message-${comment.status}"></i>
          </div>
          ${isMe ? `<div class="message-deleter">
            <button type="button" data-comment-id="${comment.unique_temp_id}">
              Delete
            </button>
          </div>` : ''}
        </li>
      `
  }

  function getAttachmentURL(fileURL) {
    var thumbnailURL = fileURL.replace('upload', 'upload/w_320,h_320,c_limit')
    return {
      origin: fileURL,
      thumbnailURL: thumbnailURL
    }
  }

  function CommentList(comments) {
    return `
      <ul>
        <li class="load-more">
          <button type="button" class="load-more-btn">Load more</button>
        </li>
        ${comments.map(CommentItem).join('')}
      </ul>
    `
  }

  function openAttachment(event) {
    if (event != null) event.preventDefault()
    $content.find('.attachment-overlay').show()
    $content.find('ul.attachment-picker-container')
      .slideDown(200)
  }

  function closeAttachment(event) {
    if (event != null) event.preventDefault()
    $content.find('.attachment-overlay').hide()
    $content.find('ul.attachment-picker-container')
      .slideUp(200)
  }

  function loadComment(lastCommentId) {
    return qiscus.loadComments(qiscus.selected.id, {
      last_comment_id: lastCommentId
    }).then(function (data) {
      var $comments = $(data.map(CommentItem).join(''))
      $comments.insertAfter('.load-more')

      var lastCommentId = $comments.first().data('last-comment-id')
      if (lastCommentId === 0) {
        $content.find('.load-more').addClass('hidden')
      }
    })
  }

  var attachmentPreviewURL = null
  var attachmentImage = null
  var attachmentFile = null
  emitter.on('qiscus::new-message', function (comment) {
    // Skip if comment already there
    if ($content.find(`.comment-item[data-unique-id="${comment.unique_temp_id}"]`).length !== 0) return

    var $comment = $(CommentItem(comment))
    $content.find('.comment-list-container ul')
      .append($comment)
    if (isAbleToScroll) {
      $comment.get(0).scrollIntoView({ behavior: 'smooth' })
    }
  })

  // Online status management
  emitter.on('qiscus::online-presence', function (data) {
    var $onlineStatus = $content.find('small.online-status')
    var lastOnline = dateFns.isSameDay(data.lastOnline, new Date()) ?
      dateFns.format(data.lastOnline, 'hh:mm') :
      dateFns.format(data.lastOnline, 'D/M/YY')

    if (data.isOnline) {
      $onlineStatus
        .removeClass('--offline')
        .text('Online')
    } else {
      $onlineStatus
        .addClass('--offline')
        .text(`Last online on ${lastOnline}`)
    }

  })

  // Comment read management
  emitter.on('qiscus::comment-read', function (data) {
    console.log('qiscus::comment-read', data)
    var userId = data.actor
    var commentTimestamp = data.comment.unix_timestamp
    var commentId = data.comment.id

    $content.find(`.comment-item[data-comment-id="${commentId}"]`)
      .find('i.icon')
      .removeClass('icon-message-sent')
      .addClass('icon-message-read')

    $content.find('.comment-item')
      .each(function () {
        var $el = $(this)
        var timestamp = Number($el.attr('data-comment-timestamp'))
        if (timestamp <= commentTimestamp) {
          // mark as read
          $el.find('i.icon')
            .removeClass('icon-message-sent')
            .removeClass('icon-message-delivered')
            .addClass('icon-message-read')
        }
      })
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
  emitter.on('qiscus::comment-delivered', function (event) {
    var commentId = event.comment.id
    var commentTimestamp = event.comment.unix_timestamp

    $content.find(`.comment-item[data-comment-id="${commentId}"]`)
      .find('i.icon')
      .removeClass('icon-message-sent')
      .addClass('icon-message-delivered')
    $content.find('.comment-item')
      .each(function () {
        var $el = $(this)
        var timestamp = Number($el.attr('data-comment-timestamp'))
        if (timestamp <= commentTimestamp) {
          $el.find('i.icon')
            .removeClass('icon-message-sent')
            .addClass('icon-message-delivered')
        }
      })
  })

  $('#qiscus-widget')
    .on('click', '.Chat #chat-toolbar-btn', function (event) {
      event.preventDefault()
      qiscus.exitChatRoom()
      route.push('/chat')
    })
    .on('submit', '.Chat #message-form', function (event) {
      event.preventDefault()
      var message = event.currentTarget['message'].value
      if (message == null || message.length === 0) return
      var timestamp = new Date()
      var uniqueId = timestamp.getTime()
      var commentId = timestamp.getTime()
      var comment = {
        id: commentId,
        unique_temp_id: commentId,
        message: message,
        type: 'text',
        email: qiscus.user_id,
        timestamp: timestamp,
        status: 'sending'
      }

      // if empty state change into list comment state
      var $commentList = $content.find('.comment-list-container ul')
      if ($commentList.length === 0) {
        $content.find('.comment-list-container').html(CommentList([]))
        $commentList = $content.find('.comment-list-container ul')
      }

      $commentList.append(CommentItem(comment))
      var comment = $content.find('.comment-item[data-comment-id="' + commentId + '"]')
      comment.attr('data-unique-id', uniqueId)
      if (isAbleToScroll) {
        comment.get(0).scrollIntoView({
          block: 'start',
          behavior: 'smooth'
        })
      }
      $content.find('#message-form input[name="message"]').val('')

      qiscus.sendComment(qiscus.selected.id, message, uniqueId)
        .then(function (resp) {
          comment.attr('data-comment-id', resp.id)
          comment.attr('data-last-comment-id', resp.comment_before_id)
          comment.attr('data-comment-timestamp', resp.unix_timestamp)
          comment.find('i.icon')
            .removeClass('icon-message-sending')
            .addClass('icon-message-sent')
        })
        .catch(function () {
          comment.find('i.icon')
            .removeClass('icon-message-sending')
            .addClass('icon-message-failed')
        })
    })
    .on('click', '.Chat #attachment-cancel', closeAttachment)
    .on('click', '.Chat #attachment-btn', openAttachment)
    .on('click', '.Chat #attachment-image', function (event) {
      event.preventDefault()
      $('#qiscus-widget').find('#input-image').click()
    })
    .on('click', '.Chat #attachment-file', function (event) {
      event.preventDefault()
      $('#qiscus-widget').find('#input-file').click()
    })
    .on('change', '#input-image', function (event) {
      var file = Array.from(event.currentTarget.files).pop()
      if (attachmentPreviewURL != null) URL.revokeObjectURL(attachmentPreviewURL)
      attachmentPreviewURL = URL.createObjectURL(file)
      attachmentImage = file
      closeAttachment()
      var $attachmentCaptioning = $content.find('.AttachmentCaptioning')
      $attachmentCaptioning
        .slideDown()
      $attachmentCaptioning
        .find('.attachment-preview')
        .attr('src', attachmentPreviewURL)
      $content.find('.file-name')
        .text(file.name)
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
        email: qiscus.user_id,
        timestamp: timestamp,
        status: 'sending',
        file: file,
        caption: caption
      }
      $content.find('.comment-list-container ul')
        .append(CommentItem(comment))
      var $comment = $(`.comment-item[data-unique-id="${uniqueId}"]`)
      var $progress = $comment.find('.progress-inner')
      $comment.get(0).scrollIntoView({
        behavior: 'smooth'
      })

      qiscus.upload(file, function (error, progress, fileURL) {
        if (error) return console.log('failed uploading image', error)
        if (progress) {
          $progress
            .css({
              width: `${progress.percent}%`
            })
        }
        if (fileURL) {
          var roomId = qiscus.selected.id
          var text = `Send Image`
          var type = 'custom'
          var payload = JSON.stringify({
            type: 'image',
            content: {
              url: fileURL,
              caption: caption,
              file_name: file.name,
              size: file.size
            }
          })
          qiscus.sendComment(roomId, text, uniqueId, type, payload)
            .then(function (resp) {
              $comment
                .attr('data-comment-id', resp.id)
                .attr('data-comment-type', 'image')
                .find('i.icon')
                .removeClass('icon-message-sending')
                .addClass('icon-message-sent')
              $comment
                .find('.upload-overlay')
                .remove()
              var url = getAttachmentURL(resp.payload.content.url)
              $comment
                .find('a')
                .attr('href', url.origin)
              var objectURL = $comment
                .find('img')
                .attr('src')
              URL.revokeObjectURL(objectURL)
              $comment.find('img').attr('src', url.thumbnailURL)
            })
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
        file: file
      }

      $content.find('.comment-list-container ul')
        .append(CommentItem(comment))
      var $comment = $(`.comment-item[data-unique-id=${uniqueId}]`)
      var $progress = $comment.find('.progress-inner')
      $comment.get(0).scrollIntoView({
        behavior: 'smooth'
      })

      qiscus.upload(file, function (error, progress, fileURL) {
        if (error) return console.log('failed uploading file', error)
        if (progress) {
          $progress.css({
            width: `${progress.percent}%`
          })
        }
        if (fileURL) {
          var roomId = qiscus.selected.id
          var text = 'Send Attachment'
          var type = 'custom'
          var payload = JSON.stringify({
            type: 'file',
            content: {
              url: fileURL,
              caption: '',
              file_name: file.name,
              size: file.size
            }
          })
          qiscus.sendComment(roomId, text, uniqueId, type, payload)
            .then(function (resp) {
              $comment
                .attr('data-comment-id', resp.id)
                .attr('data-comment-type', 'file')
                .find('i.icon.icon-message-sending')
                .removeClass('icon-message-sending')
                .addClass('icon-message-sent')
              $comment
                .find('.upload-overlay')
                .remove()
              var url = getAttachmentURL(resp.payload.content.url)
              $comment
                .find('a')
                .attr('href', url.origin)
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
      var lastCommentId = $commentList.children().get(1).dataset['lastCommentId']
      loadComment(lastCommentId)
    })
    .on('click', '.Chat .room-meta', function (event) {
      event.preventDefault()
      route.push('/room-info', { roomId: qiscus.selected.id })
    })
    .on('keydown', '.Chat input#message', _.throttle(function (event) {
      qiscus.publishTyping(qiscus.selected.id)
    }, 300))
    .on('click', '.Chat .message-deleter button', function (event) {
      event.preventDefault()
      var $el = $(this)
      var commentId = $(this).attr('data-comment-id')
      var $comment = $el.closest('.comment-item')
      qiscus.deleteComment(qiscus.selected.id, [commentId])
        .then(function (resp) {
          console.log('success deleting comment', resp)
          $comment.remove()
        })
        .catch(function (err) {
          console.error('failed deleting comment', err)
        })
    })

  function Chat(state) {
    qiscus.loadComments(qiscus.selected.id)
      .then(function (comments) {
        // Here we replace all messages data with the newly messages data
        $content.find('.comment-list-container')
          .removeClass('--empty')
          .html(CommentList(comments))

        // Apply scroll into bottom with animation
        var $commentList = $content.find('.comment-list-container ul')
        var element = $commentList
          .children()
          .last()
        element.get(0).scrollIntoView({
          behavior: 'smooth',
          block: 'start'
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

        $('.comment-list-container ul').on('scroll', _.debounce(function () {
          var $root = $(this)
          var $$root = $root.get(0)

          var total = Math.ceil($root.scrollTop() + $root.height())
          var required = $$root.scrollHeight

          var offset = 50 // CommentItem height
          isAbleToScroll = !(required - offset >= total)
        }, 300))
      })
    return `
      <div class="Chat">
        ${Toolbar(state.roomName, state.roomAvatar)}
        ${Empty()}
        ${AttachmentCaptioning({ url: '#', name: '' })}
        <form id="message-form" class="message-form">
          <button type="button" id="attachment-btn">
            <i class="icon icon-attachment"></i>
          </button>
          <input autocomplete="off" type="text" placeholder="Type your message" id="message" name="message">
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
