define([
  'jquery', 'lodash', 'service/content', 'service/route',
  'service/qiscus'
], function ($, _, $content, route, qiscus) {
  var blobURL = null
  var searchQuery = null
  var selectedIds = window.selectedIds = []
  var isLoadingUser = false

  var loadContact = _.debounce(function (currentLength) {
    if (isLoadingUser) return

    var query = searchQuery
    var perPage = 20
    var currentPage = Math.ceil(currentLength / perPage)
    var nextPage = currentPage + 1

    isLoadingUser = true
    qiscus.getUsers(query)
      .then(function (data) {
        isLoadingUser = false
        var users = data.users.map(function (user) {
          var selected = selectedIds.includes(user.email)
          return ContactItem(user, selected)
        }).join('')

        $(users).insertBefore('.contact-list .load-more')
      })
  }, 300)

  function ParticipantItem(user) {
    return `
      <li class="participant-item"
        data-user-id="${user.email}">
        <img src="${user.avatar_url}">
        <div class="name">${user.username}</div>
        <button id="remove-participant-btn"
          class="remove-participant-btn"
          type="button"
          data-userid="${user.email}">
          <i class="icon icon-cross-red"></i>
        </button>
      </li>
    `
  }
  function ContactItem(contact, selected) {
    var selected = selected || false
    return `
      <li class="contact-item"
        data-contact-id="${contact.id}"
        data-contact-name="${contact.name}"
        data-contact-avatar="${contact.avatar_url}"
        data-contact-userid="${contact.email}"
        ${selected ? `data-selected="${selected}"` : ''}>
        <div class="avatar-container">
          <img class="contact-avatar" src="${contact.avatar_url}" alt="${contact.email}">
        </div>
        <button type="button">
          <div class="displayname-container">
            ${contact.name}
          </div>
          <i class="icon icon-check-green ${selected ? '' : 'hidden'}"></i>
        </button>
      </li>
    `
  }
  function SingleRoomInfo(user) {
    return `
      <div class="info-header">
        Information
      </div>
      <div class="field-group">
        <div class="icon-container">
          <i class="icon icon-user"></i>
        </div>
        <input id="input-user-name" type="text" value="${user.username}" disabled>
      </div>
      <div class="field-group">
        <div class="icon-container">
          <i class="icon icon-id-card"></i>
        </div>
        <input id="input-user-id" type="text" value="${user.email}" disabled>
      </div>
    `
  }
  function GroupRoomInfo(data) {
    return `
      <div class="info-header">Participants</div>
      <ul class="participant-list">
        <li class="participant-item">
            <i class="icon icon-add-participant"></i>
          <button id="open-contact-chooser-btn" type="button">
            Add Participant
          </button>
        </li>
        ${data.participants.map(function (user) {
          return ParticipantItem(user)
        }).join('')}
      </ul>
    `
  }

  function ContactChooser() {
    qiscus.getUsers()
      .then(function (data) {
        var users = data.users.map(function (user) {
          return ContactItem(user)
        }).join('')
        // $content.find('.contact-list')
        //   .html(users)
        $(users).insertBefore('.ContactChooser .contact-list .load-more')
      })
    return `
      <div class="ContactChooser" style="display:none;">
        <div class="toolbar">
          <button type="button" id="close-contact-chooser" class="toolbar-btn">
            <i class="icon icon-arrow-left-green"></i>
          </button>
          <h3 class="toolbar-title">Choose Contacts</h3>
          <button type="button" id="add-participant-btn" class="toolbar-btn">
            <i class="icon icon-arrow-right-green"></i>
          </button>
        </div>
        <div class="search-container">
          <i class="icon icon-search"></i>
          <input type="text" class="search-input" id="search" placeholder="Search">
        </div>
        <div class="contact-list-container">
          <div class="contact-list-header">
            Contacts
          </div>
          <ul class="contact-list">
            <li class="load-more">
              <button type="button">Load more</button>
            </li>
          </ul>
        </div>
      </div>
    `
  }

  function RoomInfo(state) {
    qiscus.getRoomsInfo({ room_ids: [`${state.roomId}`]})
      .then(function (resp) {
        var info = resp.results.rooms_info.pop()
        if (info.chat_type === 'single') {
          var user = info.participants.find(function (user) {
            return user.email !== qiscus.user_id
          })
          $content.find('.info-container')
            .html(SingleRoomInfo(user))
          $content.find('.toolbar-title')
            .text(user.username)
          $content.find('.profile-avatar')
            .attr('src', info.avatar_url)
          $content.find('#input-user-name')
            .attr('value', user.username)
          $content.find('#input-user-id')
            .attr('value', user.email)
        } else if (info.chat_type === 'group') {
          $content.find('.info-container')
            .html(GroupRoomInfo(info))
          $content.find('#input-room-name')
            .val(info.room_name)
          $content.find('.profile-avatar')
            .attr('src', info.avatar_url)

          $content.find('.change-avatar-container')
            .children()
            .each(function () {
              $(this).removeClass('hidden')
            })
        }
      })
    return `
      <div class="RoomInfo">
        ${ContactChooser()}
        <div class="toolbar">
          <button id="back-btn" type="button">
            <i class="icon icon-arrow-left-green"></i>
          </button>
          <div class="toolbar-title">Room Info</div>
        </div>
        <div class="avatar-container">
          <input id="input-avatar" type="file" accept="image/*" class="hidden">
          <img class="profile-avatar" src="" alt="">
          <div class="change-avatar-container">
            <input id="input-room-name" type="text" value="" disabled class="hidden">
            <button id="edit-room-name-btn" class="edit-name hidden" type="button">
              <i class="icon icon-pencil-white"></i>
            </button>
            <button id="avatar-picker-btn" type="button" class="hidden">
              <i class="icon icon-avatar-picker"></i>
            </button>
          </div>
        </div>
        <div class="info-container">
          Loading data...
        </div>
      </div>
    `
  }

  function removeParticipant(contactId) {
    // remove check from contact list
    var $el = $content.find(`li.contact-item[data-contact-id="${contactId}"]`)
    $el
      .removeAttr('data-selected')
      .find('.icon')
      .addClass('hidden')
    var userId = $el.attr('data-contact-userid')
    var index = selectedIds.findIndex(function (id) {
      return id === userId
    })
    selectedIds.splice(index, 1)
  }
  function addParticipant(detail) {
    // add check mark to contact list
    var $el = $(`li.contact-item[data-contact-id="${detail.id}"]`)
    $el
      .attr('data-selected', true)
      .find('.icon')
      .removeClass('hidden')

    var userId = $el.attr('data-contact-userid')
    selectedIds.push(userId)
  }

  $content
    .on('click', '.RoomInfo #open-contact-chooser-btn', function (event) {
      event.preventDefault()
      $content.find('.ContactChooser').slideDown()
    })
    .on('click', '.RoomInfo #back-btn', function (event) {
      event.preventDefault()
      route.go(-1)
    })
    .on('click', '.RoomInfo #edit-room-name-btn', function (event) {
      event.preventDefault()
      var $inputName = $content.find('#input-room-name')
      $inputName
        .removeAttr('disabled')
        .focus()
    })
    .on('click', '.RoomInfo #avatar-picker-btn', function (event) {
      event.preventDefault()
      $content.find('#input-avatar').click()
    })
    .on('keydown', '.RoomInfo #input-room-name', function (event) {
      if (event.keyCode === 13) {
        event.preventDefault()
        var name = event.target.value.trim()
        $(this).attr('disabled', true)
        qiscus.updateRoom({ id: qiscus.selected.id, room_name: name })
      }
    })
    .on('change', '.RoomInfo #input-avatar', function (event) {
      var file = Array.from(event.target.files).pop()
      if (blobURL != null) URL.revokeObjectURL(blobURL)
      blobURL = URL.createObjectURL(file)
      $content.find('img.profile-avatar')
        .attr('src', blobURL)

      qiscus.upload(file, function (err, progress, url) {
        if (err) return console.log('Error while uploading file', err)
        if (progress) return
        if (url) {
          qiscus.updateRoom({ id: qiscus.selected.id, avatar_url: url })
            .then(function (resp) {
              console.log('Success updating avatar', resp)
            })
        }
      })
    })
    .on('click', '.RoomInfo #remove-participant-btn', function (event) {
      event.preventDefault()
      var $el = $(this)
      var userId = $el.attr('data-userid')
      qiscus.removeParticipantsFromGroup(qiscus.selected.id, [userId])
        .then(function (resp) {
          $el.closest('li.participant-item').remove()
        })
    })
    // Contact chooser
    .on('click', '.RoomInfo #close-contact-chooser', function () {
      $content.find('.ContactChooser').slideUp()
    })
    .on('click', '.RoomInfo .contact-item button', function (event) {
      event.preventDefault()
      var $el = $(this).closest('li.contact-item')
      var $selectedContact = $content.find('.selected-contact-container')
      var isSelected = $el.attr('data-selected')
      var contactId = $el.attr('data-contact-id')
      var contactName = $el.attr('data-contact-name')
      var contactAvatar = $el.attr('data-contact-avatar')
      var contactEmail = $el.attr('data-contact-userid')

      if (isSelected) {
        removeParticipant(contactId)
      } else {
        addParticipant({
          id: contactId,
          name: contactName,
          avatar: contactAvatar,
          email: contactEmail
        })
      }
    })
    .on('click', '.RoomInfo #add-participant-btn', function (event) {
      event.preventDefault()
      qiscus.addParticipantsToGroup(qiscus.selected.id, selectedIds)
        .then(function (users) {
          var participants = users.map(function (user) {
            return ParticipantItem(user)
          }).join('')
          $content.find('.participant-list')
            .append(participants)
          $content.find('.ContactChooser').slideUp()
          selectedIds.splice(0, selectedIds.length)
        })
    })
    .on('input', '.RoomInfo #search', function (event) {
      var query = $(this).val()
      if (query.length === 0) searchQuery = null
      else searchQuery = query

      return qiscus.getUsers(searchQuery)
        .then(function (resp) {
          var users = resp.users.map(function (user) {
            var selected = selectedIds.includes(user.email)
            return ContactItem(user, selected)
          }).join('')
          $content.find('.contact-list')
            .empty()
            .append(users)
            .append('<li class="load-more"><button>Load more</button></li>')
        })
    })
    .on('click', '.RoomInfo .load-more button', function (event) {
      event.preventDefault()

      var currentLength = $content.find('.RoomInfo .contact-list').children().length - 1
      loadContact(currentLength)
    })

  RoomInfo.path = '/room-info'
  return RoomInfo
})
