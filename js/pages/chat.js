define([
  'dateFns', 'jquery',
  'service/content', 'service/route',
  'service/qiscus', 'service/emitter'
], function (dateFns, $, $content, route, qiscus, emitter) {
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

  function commentRenderer(comment) {
    var content = comment.message
    var type = comment.type
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
        <li class="comment-item ${comment.email === qiscus.user_id ? 'me' : ''}"
          data-comment-id="${comment.id}"
          data-last-comment-id="${comment.comment_before_id}"
          data-unique-id="${comment.unique_temp_id}"
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
        ${comments.map(commentRenderer).join('')}
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
      var $comments = $(data.map(commentRenderer).join(''))
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
    $content.find('.comment-list-container ul')
      .append(commentRenderer(comment))
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

    // Comment read management
    emitter.on('qiscus::comment-read', function (data) {
      var userId = data.actor
      var commentId = data.comment.id

      $content.find(`.comment-item[data-comment-id="${commentId}"]`)
        .find('i.icon')
        .removeClass('icon-message-sent')
        .addClass('icon-message-read')
    })
    emitter.on('qiscus::comment-delivered', function (data) {
      // Do something on comment delivered
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

      $commentList.append(commentRenderer(comment))
      var comment = $content.find('.comment-item[data-comment-id="' + commentId + '"]')
      comment.attr('data-unique-id', uniqueId)
      comment.get(0).scrollIntoView({
        block: 'start',
        behavior: 'smooth'
      })
      $content.find('#message-form input[name="message"]').val('')

      qiscus.sendComment(qiscus.selected.id, message, uniqueId)
        .then(function (resp) {
          comment.attr('data-comment-id', resp.id)
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
        .append(commentRenderer(comment))
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
        .append(commentRenderer(comment))
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
