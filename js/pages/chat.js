define([
  'dateFns',
  'jquery',
  'lodash',
  'service/content',
  'service/route',
  'service/qiscus',
  'service/emitter',
], function (dateFns, $, _, $content, route, qiscus, emitter) {
  var isAbleToScroll = false;
  var room = null;
  var commentList = (window.commentList = {});

  var currentUser = function () {
    return qiscus.instance.currentUser;
  };

  function Toolbar(roomId) {
    var isGroup = false;
    var participants = '';
    var avatar = '';
    var name = '';
    qiscus.instance.getChatRooms(
      [roomId],
      1,
      false,
      true,
      function (rooms, err) {
        if (err) return console.log('error when getting room info', err);
        room = rooms.pop();
        var targetUser = room.participants
          .filter(function (user) {
            return user.id !== currentUser().id;
          })
          .shift();
        if (targetUser != null) {
          qiscus.instance.subscribeUserOnlinePresence(targetUser.id);
        }
        qiscus.instance.subscribeChatRoom(room);

        participants = (function () {
          var limit = 3;
          var overflowCount = room.participants.length - limit;
          var participants = room.participants
            .slice(0, limit)
            .map(function (it) {
              return it.name.split(' ')[0];
            });
          if (room.participants.length <= limit) return participants.join(', ');
          return participants
            .concat('and ' + overflowCount + ' others.')
            .join(', ');
        })();
        isGroup = room.type === 'group';
        avatar = room.avatarUrl;
        name = room.name;
        var $toolbar = $content.find('.ToolbarChatRoom');
        $toolbar.find('img.avatar').attr('src', avatar);
        $toolbar.find('.room-name').text(name);
        if (isGroup) {
          $toolbar
            .find('.online-status')
            .addClass('participant-list')
            .text(participants);
        }
      }
    );

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
    `;
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
    `;
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
    `;
  }

  function CommentItem(comment) {
    var content = comment.text;
    var type = comment.type;
    var isMe = comment.sender.id === currentUser().id;
    console.log(type);

    if (type === 'reply') {
      console.log('is reply');
      content = `
        <div class="replied-message-container">
        ${comment.payload.replied_comment_message}
        </div>
        <div class="replied-original-message">
        ${comment.text}
        </div>
      `;
    }

    if (type === 'upload') {
      var thumbnailURL = URL.createObjectURL(comment.file);
      var caption = comment.caption;
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
      `;
    }
    if (type === 'upload-file') {
      var filename = comment.file.name;
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
      `;
    }
    if (
      type === 'custom' &&
      comment.payload.type === 'image' &&
      typeof comment.payload.content !== 'string'
    ) {
      var fileURL = comment.payload.content.url;
      var thumbnailURL = getAttachmentURL(fileURL).thumbnailURL;
      var caption = comment.payload.content.caption;
      caption = caption.length === 0 ? null : caption;
      content = `
        <a href="${fileURL}" target="_blank" style="${
        caption ? 'height:80%' : ''
      }">
          <img class="image-preview" src="${thumbnailURL}" alt="preview">
        </a>
        <div class="image-caption ${caption ? '' : 'hidden'}">
          ${caption}
        </div>
      `;
    } else if (
      type === 'custom' &&
      comment.payload.type === 'file' &&
      typeof comment.payload.content !== 'string'
    ) {
      var fileURL = comment.payload.content.url;
      var filename = comment.payload.content.file_name;
      type = 'file';
      content = `
        <a href="${fileURL}" target="_blank">
          <div class="comment-file">
            <i class="icon icon-attachment-file"></i><div class="filename">${filename}</div>
          </div>
        </a>
      `;
    } else if (type === 'file_attachment') {
      var fileURL = comment.payload.url;
      var filename = comment.payload.file_name;
      var attachmentURL = getAttachmentURL(fileURL);
      var thumbnailURL = attachmentURL.thumbnailURL;
      var isImage = attachmentURL.isImage;
      var caption = comment.payload.caption;
      caption = caption.length === 0 ? null : caption;
      type = 'file';
      content = `
        <a href="${fileURL}" target="_blank"
          style="${caption ? 'height:80%' : ''}">
          ${
            !isImage
              ? `<div class="comment-file">
              <i class="icon icon-attachment-file"></i><div class="filename">${filename}</div>
            </div>`
              : ''
          }
          ${
            isImage
              ? `<img class="image-preview" src="${thumbnailURL}" alt="preview">`
              : ''
          }
        </a>
        ${
          isImage
            ? `<div class="image-caption ${caption ? '' : 'hidden'}">
            ${caption}
          </div>`
            : ''
        }
      `;
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
      `;
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
              ${dateFns.format(
                comment.timestamp,
                'HH:mm'
              )} | ${comment.timestamp.getTime()}
            </div>
            <i class="icon icon-message-${comment.status}"></i>
          </div>
          ${
            isMe
              ? `<div class="message-deleter">
            <button type="button" data-action="delete" data-comment-id="${comment.uniqueId}">
              Delete
            </button>
            <button type="button" data-action="reply" data-comment-id="${comment.id}">
              Reply
            </button>
          </div>`
              : `<div class="message-deleter">
            <button type="button" data-action="reply" data-comment-id="${comment.id}">
              Reply
            </button>
              </div>`
          }
        </li>
      `;
  }

  function getAttachmentURL(fileURL) {
    var thumbnailURL = fileURL
      .replace('upload', 'upload/w_320,h_320,c_limit')
      .replace(/\.\w+$/, '.png');
    var reImage = /\S+(jpe?g|gif|png|svg)/gi;
    return {
      origin: fileURL,
      thumbnailURL: thumbnailURL,
      isImage: reImage.test(thumbnailURL),
    };
  }

  function commentListFormatter(comments) {
    var _comments = [];
    for (var i = 0; i < comments.length; i++) {
      var comment = comments[i];
      var lastComment = comments[i - 1];
      var commentDate = new Date(comment.timestamp);
      comment.date = commentDate;
      var lastCommentDate =
        lastComment == null ? null : new Date(lastComment.timestamp);
      var isSameDay = dateFns.isSameDay(commentDate, lastCommentDate);
      var showDate = lastComment != null && !isSameDay;

      // clone comment object because we need it property later
      var dateComment = Object.assign({}, comment);
      dateComment.type = 'date';
      dateComment.text = dateFns.format(dateComment.timestamp, 'DD MMM YYYY');
      // FIXME: invalid comment date
      if (i === 0 || showDate) _comments.push(dateComment);
      _comments.push(comment);
    }
    return _comments.sort((a, b) => a.date - b.date);
  }

  function createDateComment(date) {
    return {
      type: 'date',
      message: dateFns.format(date, 'DD MMM YYYY'),
    };
  }

  function CommentList(comments) {
    return `
      <ul id="comment-list-container">
        <li class="load-more">
          <button type="button" class="load-more-btn">Load more</button>
        </li>
        ${commentListFormatter(comments).map(CommentItem).join('')}
      </ul>
    `;
  }

  function openAttachment(event) {
    if (event != null) event.preventDefault();
    $content.find('.attachment-overlay').show();
    $content.find('ul.attachment-picker-container').slideDown(200);
  }

  function closeAttachment(event) {
    if (event != null) event.preventDefault();
    $content.find('.attachment-overlay').hide();
    $content.find('ul.attachment-picker-container').slideUp(200);
  }

  function loadComment(lastCommentId) {
    var limit = 20;
    return qiscus.instance.getPreviousMessagesById(
      room.id,
      limit,
      lastCommentId || 0,
      function (messages, err) {
        if (err) return console.log('error while getting comments', err);
        if (messages.length == 0) return;

        messages.forEach((message) => {
          commentList[message.uniqueId] = message;
        });

        var comments = commentListFormatter(messages);
        var $comments = $(comments.map(CommentItem).join(''));
        $comments.insertAfter('.load-more');

        var lastCommentId = messages[0].previousMessageId;
        if (lastCommentId === 0) {
          $content.find('.load-more').addClass('hidden');
        }
      }
    );
  }

  function sortMessage() {
    $content.find('ul#comment-list-container').html(
      $content.find('.comment-item').sort(function (a, b) {
        var timestampA = $(a).attr('data-timestamp');
        var timestampB = $(b).attr('data-timestamp');
        return Number(timestampA) - Number(timestampB);
      })
    );
  }
  function renderReplyForm(repliedMessage) {
    return `
      <div class="reply-form-container" data-comment-unique-id="${repliedMessage.uniqueId}">
        <div>${repliedMessage.text}</div>
        <button id="close-reply" type="button" class="close-reply-btn">x</button>
      </div>
    `;
  }

  var attachmentPreviewURL = null;
  var attachmentImage = null;
  var attachmentFile = null;

  // Online status management
  qiscus.instance.onUserOnlinePresence(function (userId, isOnline, lastSeen) {
    var $onlineStatus = $content.find('small.online-status');
    var lastOnline = dateFns.isSameDay(lastSeen, new Date())
      ? dateFns.format(lastSeen, 'HH:mm')
      : dateFns.format(lastSeen, 'D/M/YY');
    if (isOnline) {
      $onlineStatus.removeClass('--offline').text('Online');
    } else {
      $onlineStatus.addClass('--offline').text(`Last online on ${lastOnline}`);
    }
  });

  var lastValue = null;
  var typingTimeoutId = -1;
  var typingText = 'Typing ...';
  qiscus.instance.onUserTyping(
    _.debounce(function (userId) {
      if (userId === currentUser().id) return;

      var $onlineStatus = $content.find('.room-meta .online-status');
      if ($onlineStatus.text() !== typingText) {
        lastValue = $onlineStatus.text();
      }
      $onlineStatus.text(typingText);
      if (typingTimeoutId !== -1) clearTimeout(typingTimeoutId);
      typingTimeoutId = setTimeout(function () {
        $onlineStatus.text(lastValue);
        clearTimeout(typingTimeoutId);
        typingTimeoutId = -1;
      }, 1000);
    }),
    1000
  );

  qiscus.instance.onMessageDeleted(function (message) {
    var uniqueId = message.uniqueId;
    $content.find(`.comment-item[data-unique-id=${uniqueId}]`).remove();
  });

  qiscus.instance.onChatRoomCleared(function (roomId) {
    if (room != null && roomId === room.id) {
      $content.find('.comment-item').remove();
      $content.html(Initial(roomId));
    }
  });

  var $parent = $content.parent();
  $parent.on('change', '#input-image-1', function (event) {
    var file = Array.from(event.currentTarget.files).pop();
    if (attachmentPreviewURL != null) URL.revokeObjectURL(attachmentPreviewURL);
    attachmentPreviewURL = URL.createObjectURL(file);
    attachmentImage = file;
    closeAttachment();
    var $attachmentCaptioning = $content.find('.AttachmentCaptioning');
    $attachmentCaptioning.slideDown();
    $attachmentCaptioning
      .find('.attachment-preview')
      .attr('src', attachmentPreviewURL);
    $content.find('.file-name').text(file.name);
  });
  $parent.on('change', '#input-file-1', function (event) {
    closeAttachment();

    var file = Array.from(event.currentTarget.files).pop();
    var timestamp = new Date();
    var uniqueId = timestamp.getTime();
    var commentId = timestamp.getTime();
    var comment = {
      id: commentId,
      uniqueId: uniqueId,
      unique_temp_id: uniqueId,
      message: 'Send Attachment',
      type: 'upload-file',
      email: qiscus.instance.currentUser.id,
      timestamp: timestamp,
      status: 'sending',
      file: file,
      sender: qiscus.instance.currentUser,
    };

    $content.find('.comment-list-container ul').append(CommentItem(comment));
    var $comment = $(`.comment-item[data-unique-id=${uniqueId}]`);
    var $progress = $comment.find('.progress-inner');
    $comment.get(0).scrollIntoView({
      behavior: 'smooth',
    });

    qiscus.instance.sendFileMessage(
      room.id,
      '',
      file,
      function (error, progress, message) {
        if (error) return console.log('failed uploading file', error);
        if (progress) {
          $progress.css({
            width: `${progress}%`,
          });
        }
        if (message) {
          $comment
            .attr('data-comment-id', message.id)
            .attr('data-unique-id', message.uniqueId)
            .attr('data-comment-type', 'file')
            .find('i.icon.icon-message-sending')
            .removeClass('icon-message-sending')
            .addClass('icon-message-sent');
          $comment.find('.upload-overlay').remove();
          $comment.find('a').attr('href', message.payload.url);
        }
      }
    );
  });

  $content
    .on('click', '.Chat #chat-toolbar-btn', function (event) {
      event.preventDefault();
      qiscus.instance.unsubscribeChatRoom(room);
      route.push('/chat');
    })
    .on('submit', '.Chat #message-form', function (event) {
      event.preventDefault();
      var $form = $(event.currentTarget);
      var message = event.currentTarget['message'].value;
      if (message == null || message.length === 0) return;

      var $reply = $form.prev();
      var isReply = $reply.hasClass('reply-form-container');
      var replyCommentUniqueId = $reply.data('comment-unique-id');
      var replyComment = commentList[replyCommentUniqueId];

      var comment = isReply
        ? qiscus.instance.generateReplyMessage({
            roomId: room.id,
            repliedMessage: replyComment,
            text: message,
          })
        : qiscus.instance.generateMessage({
            roomId: room.id,
            text: message,
          });

      var uniqueId = comment.uniqueId;
      var commentId = comment.id;

      // if empty state change into list comment state
      var $commentList = $content.find('.comment-list-container ul');
      if ($commentList.length === 0) {
        $content.find('.comment-list-container').html(CommentList([]));
        $commentList = $content.find('.comment-list-container ul');
      }

      $commentList.append(CommentItem(comment));
      var $comment = $content.find(
        '.comment-item[data-comment-id="' + commentId + '"]'
      );
      $comment.attr('data-unique-id', uniqueId);
      if (isAbleToScroll) {
        $comment.get(0).scrollIntoView({
          block: 'start',
          behavior: 'smooth',
        });
      }
      $content.find('#message-form input[name="message"]').val('');

      qiscus.instance.sendMessage(
        room.id,
        {
          payload: comment.payload,
          extras: comment.extras,
          type: comment.type,
          message: comment.text,
        },
        function (message, err) {
          if (err) {
            $comment
              .find('i.icon')
              .removeClass('icon-message-sending')
              .addClass('icon-message-failed');
            return console.log('error when sending message', err);
          }
          $comment.attr('data-unique-id', message.uniqueId);
          $comment.attr('data-comment-id', message.id);
          $comment.attr('data-last-comment-id', message.previousMessageId);
          $comment.attr('data-comment-timestamp', message.timestamp);
          $comment
            .find('i.icon')
            .removeClass('icon-message-sending')
            .addClass('icon-message-sent');
          // $comment.find('.message-container').html(message.text);
          if (isReply) $reply.remove();
          commentList[message.uniqueId] = message;
        }
      );
    })
    .on('click', '.Chat #attachment-cancel', closeAttachment)
    .on('click', '.Chat #attachment-btn', openAttachment)
    .on('click', '.Chat #attachment-image', function (event) {
      event.preventDefault();
      $parent.find('#input-image-1').click();
    })
    .on('click', '.Chat #attachment-file', function (event) {
      event.preventDefault();
      $parent.find('#input-file-1').click();
    })
    .on('submit', '.Chat .caption-form-container', function (event) {
      event.preventDefault();
      closeAttachment();
      $content.find('.AttachmentCaptioning').slideUp();

      var file = Array.from($('#input-image-1').get(0).files).pop();
      var caption = event.currentTarget['caption-input'].value.trim();

      var timestamp = new Date();
      var uniqueId = timestamp.getTime();
      var commentId = timestamp.getTime();
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
      };
      $content.find('.comment-list-container ul').append(CommentItem(comment));
      var $comment = $content.find(
        `.comment-item[data-unique-id="${uniqueId}"]`
      );
      var $progress = $comment.find('.progress-inner');
      $comment.get(0).scrollIntoView({
        behavior: 'smooth',
      });

      qiscus.instance.sendFileMessage(
        room.id,
        caption,
        file,
        function (error, progress, message) {
          if (error) return console.log('failed uploading image', error);
          if (progress) {
            $progress.css({
              width: `${progress}`,
            });
          }
          if (message) {
            $comment
              .attr('data-comment-id', message.id)
              .attr('data-unique-id', message.uniqueId)
              .attr('data-comment-type', 'image')
              .find('i.icon')
              .removeClass('icon-message-sending')
              .addClass('icon-message-sent');
            $comment.find('.upload-overlay').remove();
            var url = getAttachmentURL(message.payload.url);
            $comment.find('a').attr('href', url.origin);
            var objectURL = $comment.find('img').attr('src');
            URL.revokeObjectURL(objectURL);
            $comment.find('img').attr('src', url.thumbnailURL);
          }
        }
      );
    })
    .on('click', '.Chat #attachment-toolbar-btn', function (event) {
      event.preventDefault();
      $content.html(Chat(route.location.state));
    })
    .on('click', '.Chat .load-more-btn', function (event) {
      event.preventDefault();
      var $commentList = $content.find('.comment-list-container ul');
      var lastCommentId = $commentList.children().get(1).dataset[
        'lastCommentId'
      ];
      loadComment(parseInt(lastCommentId));
    })
    .on('click', '.Chat .room-meta', function (event) {
      event.preventDefault();
      route.push('/room-info', { roomId: room.id });
    })
    .on(
      'keydown',
      '.Chat input#message',
      _.throttle(function () {
        qiscus.instance.publishTyping(room.id, true);
      }, 300)
    )
    .on(
      'click',
      '.Chat .message-deleter button[data-action="delete"]',
      function (event) {
        event.preventDefault();
        var $el = $(this);
        var $comment = $el.closest('.comment-item');
        var uniqueId = $comment.attr('data-unique-id');
        qiscus.instance.deleteMessages([uniqueId], function (messages, err) {
          if (err) return console.log('error while deleting message', err);
          $comment.remove();
        });
      }
    )
    .on(
      'click',
      '.Chat .message-deleter button[data-action="reply"]',
      function (event) {
        event.preventDefault();
        var uniqueId = $(event.currentTarget)
          .parents('.comment-item')
          .data('unique-id');
        var comment = commentList[uniqueId];
        if (comment == null) {
          console.log('comment are null');
          return false;
        }
        var replyComment = qiscus.instance.generateReplyMessage({
          roomId: room.id,
          text: 'Something',
          repliedMessage: comment,
        });
        console.log('comment:', replyComment);
        var dom = renderReplyForm(comment);
        $(dom).insertBefore('#message-form');
        $('#message-form input').focus();
      }
    );

  function Chat() {
    var state = route.location.state;
    var roomId = state.roomId;
    var limit = 10;
    // var limit = 100
    var messageId = 0;

    qiscus.instance.getNextMessagesById(
      roomId,
      limit,
      messageId,
      function (messages, error) {
        if (error) {
          console.error('Error when loading message', error.message);
          return;
        }

        messages.forEach((m) => {
          commentList[m.uniqueId] = m;
        });

        $content
          .find('.comment-list-container')
          .removeClass('--empty')
          .html(CommentList(messages));

        // Apply scroll into bottom with animation
        var $commentList = $content.find('.comment-list-container ul');
        var element = $commentList.children().last();
        element.get(0).scrollIntoView({
          behavior: 'smooth',
          block: 'start',
        });

        // Disable load more if it was the first comment
        var firstComment = $commentList.children().get(1);
        if (firstComment == null) {
          $content.find('.load-more').addClass('hidden');
        } else {
          var lastCommentId = firstComment.dataset.lastCommentId;
          if (Number(lastCommentId) === 0) {
            $content.find('.load-more').addClass('hidden');
          }
        }

        var $commentListContainer = $content.find('.comment-list-container ul');
        window.$commentListContainer = $commentListContainer;
        $commentListContainer.on(
          'scroll',
          _.debounce(function () {
            var $root = $(this);
            var $$root = $root.get(0);

            var total = Math.ceil($root.scrollTop() + $root.height());
            var required = $$root.scrollHeight;

            var offset = 50; // CommentItem height
            isAbleToScroll = !(required - offset >= total);

            // Mark comment as read if it appear in the viewport
            var $lastComment = $commentListContainer
              .find('.comment-item:not(.me)')
              .last();
            var status = $lastComment.attr('data-status');
            var isRead = status === 'read';

            var isChannel = room.type === 'channel';
            if (isAbleToScroll && !isRead && !isChannel) {
              var messageId = Number($lastComment.attr('data-comment-id'));
              qiscus.instance.markAsRead(
                roomId,
                messageId,
                function (data, err) {
                  // Do something if succeed
                }
              );
            }
          }, 300)
        );
      }
    );
    qiscus.instance.onMessageReceived(function (message) {
      // skip if it is owned message
      if (message.sender.id === currentUser().id) return;

      // Skip if comment room_id are not matched current room id
      if (message.chatRoomId !== roomId) return;

      // Skip if comment already there
      var comments_ = $content.find(
        `.comment-item[data-unique-id="${message.uniqueId}"]`
      );
      if (comments_.length !== 0) return;

      var $comment = $(CommentItem(message));
      $content.find('.comment-list-container ul').append($comment);

      sortMessage();

      if (isAbleToScroll) {
        $comment.get(0).scrollIntoView({ behavior: 'smooth' });
      }
    });
    qiscus.instance.onMessageDelivered(function (message) {
      var commentId = message.id;

      $content
        .find(`.comment-item[data-comment-id="${commentId}"]`)
        .find('i.icon')
        .removeClass('icon-message-sent')
        .addClass('icon-message-delivered');
      var commentItems = $content.find('.comment-item');
      var targetIdx = Array.from(commentItems).findIndex(
        (it) => it.dataset['commentId'] === String(commentId)
      );
      $content.find('.comment-item').each(function (idx) {
        if (idx >= targetIdx) return;

        $(this)
          .find('i.icon')
          .removeClass('icon-message-sent')
          .addClass('icon-message-delivered');
      });
    });
    qiscus.instance.onMessageRead(function (message) {
      var commentId = message.id;

      $content
        .find(`.comment-item[data-comment-id="${commentId}"]`)
        .find('i.icon')
        .removeClass('icon-message-sent')
        .addClass('icon-message-read');
      $content
        .find(`.comment-item[data-comment-id=${commentId}]`)
        .attr('data-status', 'read');
      var commentItems = $content.find('.comment-item');
      var targetIdx = Array.from(commentItems).findIndex(
        (it) => it.dataset['commentId'] === String(commentId)
      );

      console.log('read', targetIdx);
      $content.find('.comment-item').each(function (idx) {
        if (idx >= targetIdx) return;

        $(this).attr('data-status', 'read');
        $(this)
          .find('i.icon')
          .removeClass('icon-message-sent')
          .removeClass('icon-message-delivered')
          .addClass('icon-message-read');
      });
    });
    return Initial(roomId);
  }

  function Initial(roomId) {
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
    `;
  }

  Chat.path = '/chat-room';
  return Chat;
});
