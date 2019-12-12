define([
  'jquery', 'lodash', 'service/qiscus',
  'service/route', 'service/content'
], function ($, lodash, qiscus, route, $content) {
  var avatarBlobURL = null
  var searchValue = null
  var perPage = 20

  window.$content = $content

  function ContactItem(contact) {
    return `
      <li class="contact-item"
        data-contact-id="${contact.id}"
        data-contact-name="${contact.name}"
        data-contact-avatar="${contact.avatarUrl}"
        data-contact-userid="${contact.id}">
        <div class="avatar-container">
          <img class="contact-avatar" src="${contact.avatarUrl}" alt="${contact.id}">
        </div>
        <button type="button">
          <div class="displayname-container">
            ${contact.name}
          </div>
          <i class="icon icon-check-green hidden"></i>
        </button>
      </li>
    `
  }
  function ParticipantItem(detail) {
    return `
      <li class="participant-item"
        data-contact-id="${detail.id}"
        data-contact-userid="${detail.id}">
        <div class="avatar-container">
          <img class="participant-avatar" src="${detail.avatar}">
        </div>
        <div class="participant-detail">
          <div class="participant-name">
            ${detail.name}
          </div>
          <button type="button" class="remove-participant">
            <i class="icon icon-cross-red"></i>
          </button>
        </div>
      </li>
    `
  }
  function SelectedContactItem(contactDetail) {
    console.log('contactDetail', contactDetail)
    return `
      <li class="selected-contact-item" data-contact-id="${contactDetail.id}">
        <div class="avatar-container">
          <img class="selected-contact-avatar"
            src="${contactDetail.avatar}" alt="${contactDetail.name}">
          <button type="button" class="remove-selected-contact-btn">
            <i class="icon icon-cross-red"></i>
          </button>
        </div>
        <div class="selected-contact-displayname">
          ${contactDetail.name}
        </div>
      </li>
    `
  }

  function removeParticipant(contactId) {
    // remove from selected contact list
    $content.find(`li.selected-contact-item[data-contact-id="${contactId}"]`)
      .remove()
    // remove check from contact list
    $content.find(`li.contact-item[data-contact-id="${contactId}"]`)
      .removeAttr('data-selected')
      .find('.icon')
      .addClass('hidden')
    // remove from group info participant list
    $content.find(`li.participant-item[data-contact-id=${contactId}]`)
      .remove()
  }
  function addParticipant(detail) {
    // add to selected contact list
    $('ul.selected-contact-container')
      .prepend(SelectedContactItem(detail))
    // add check mark to contact list
    $(`li.contact-item[data-contact-id="${detail.id}"]`)
      .attr('data-selected', true)
      .find('.icon')
      .removeClass('hidden')
    // add to group info participant list
    $('ul.participant-list')
      .append(ParticipantItem(detail))
  }

  function loadContacts(query, page) {
    page = page || 1
    return qiscus.instance.getUsers(query, page, perPage, function (users) {
      var contacts = users.map(ContactItem).join('')
      $content.find('.contact-list')
        .empty()
        .append(contacts)
        .append('<li class="load-more"><button type="button" id="load-more">Load more</button></li>')
    })
  }
  function loadMoreContacts(query, page) {
    page = page || 1
    return qiscus.instance.getUsers(query, page, perPage, function (users) {
      var contacts = users.map(ContactItem).join('')
      var $contacts = $(contacts)
      $contacts.insertBefore('li.load-more')
      // If users response are shorter than the requested limit, then has
      // the end of user list, and we need to hide load more button
      if (users.length < perPage) {
        $content.find('li.load-more').addClass('hidden')
      }
    })
  }

  function ContactChooser() {
    return `
      <div class="ContactChooser">
        <div class="toolbar">
          <button type="button" id="close-create-group" class="toolbar-btn">
            <i class="icon icon-arrow-left-green"></i>
          </button>
          <h3 class="toolbar-title">Choose Contacts</h3>
          <button type="button" id="show-group-info" class="toolbar-btn">
            <i class="icon icon-arrow-right-green"></i>
          </button>
        </div>
        <div class="search-container">
          <i class="icon icon-search"></i>
          <input type="text" class="search-input" id="search" placeholder="Search">
        </div>
        <ul class="selected-contact-container">
        </ul>
        <div class="contact-list-container">
          <div class="contact-list-header">
            Contacts
          </div>
          <ul class="contact-list">
          </ul>
        </div>
      </div>
    `
  }
  function GroupInfo() {
    return `
      <div class="GroupInfo" style="right: -500px">
        <div class="toolbar">
          <button type="button" id="hide-group-info" class="toolbar-btn">
            <i class="icon icon-arrow-left-green"></i>
          </button>
          <div class="toolbar-title">Group Info</div>
          <button type="button" id="create-group-btn" class="toolbar-btn">
            <i class="icon icon-check"></i>
          </button>
        </div>
        <div class="group-info-container">
          <div class="avatar-container">
            <img class="avatar-preview" src="/img/img-default-avatar-picker.svg">
            <button type="button" class="avatar-picker-btn">
              <i class="icon icon-avatar-picker"></i>
            </button>
            <input id="input-avatar" class="hidden" type="file" accept="image/*">
          </div>
          <div class="group-name-container">
            <label for="group-name">Group Name</label>
            <input type="text" id="group-name-input" class="group-name-input"
              placeholder="Group name">
          </div>
        </div>
        <div class="participant-list-container">
          <div class="participant-list-header">
            Participants
          </div>
          <ul class="participant-list">
          </ul>
        </div>
      </div>
    `
  }

  function CreateGroup() {
    loadContacts()
    return `
      <div class="CreateGroupPage">
        ${ContactChooser()}
        ${GroupInfo()}
      </div>
    `
  }

  $content
    .on('click', '.CreateGroupPage .contact-item button', function (event) {
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
    .on('click', '.CreateGroupPage .selected-contact-item button', function (event) {
      event.preventDefault()
      var $el = $(this).closest('li.selected-contact-item')
      var contactId = $el.attr('data-contact-id')
      $el.remove()
      $(`.CreateGroupPage .contact-item[data-contact-id="${contactId}"`)
        .removeAttr('data-selected')
        .find('.icon')
        .addClass('hidden')
    })
    .on('click', '.CreateGroupPage button#hide-group-info', function () {
      $('.GroupInfo').animate({ right: -500 })
    })
    .on('click', '.CreateGroupPage #close-create-group', function () {
      route.push('/chat')
    })
    .on('click', '.CreateGroupPage button#show-group-info', function () {
      $('.GroupInfo').animate({ right: 0 })
    })
    .on('click', '.CreateGroupPage button.avatar-picker-btn', function (event) {
      event.preventDefault()
      $content.find('input#input-avatar').click()
    })
    .on('click', '.CreateGroupPage button.remove-participant', function (event) {
      event.preventDefault()
      var contactId = $(this).closest('li.participant-item').attr('data-contact-id')
      removeParticipant(contactId)
    })
    .on('change', '.CreateGroupPage input#input-avatar', function (event) {
      var file = Array.from(event.currentTarget.files).pop()
      if (avatarBlobURL != null) {
        URL.revokeObjectURL(avatarBlobURL)
      }
      avatarBlobURL = URL.createObjectURL(file)
      $content.find('img.avatar-preview')
        .attr('src', avatarBlobURL)
    })
    .on('click', '.CreateGroupPage #create-group-btn', function (event) {
      event.preventDefault()
      var name = $content.find('#group-name-input').val()
      var avatar = Array.from($content.find('#input-avatar').get(0).files).pop()
      var participantIds = $content.find('.participant-list')
        .children()
        .toArray()
        .map(function (el) {
          return el.dataset.contactUserid
        })
      var extras = { createdFrom: 'sample-sdk-web' }
      qiscus.instance.upload(avatar, function (err, progress, url) {
        if (err) return
        if (progress) return
        if (url) {
          qiscus.instance.createGroupChat(name, participantIds, url, extras, function (room, err) {
            if (err) return console.log('error while creating group chat', err)
            route.push('/chat-room', {
              roomId: room.id,
              roomName: room.name,
              roomAvatar: room.avatarUrl,
            })
          })
        }
      })
    })
    .on('input', '.CreateGroupPage #search', _.debounce(function () {
      var $el = $(this)
      var value = $el.val()
      searchValue = value
      loadContacts(value)
    }, 300))
    .on('click', '.CreateGroupPage #load-more', function (event) {
      event.preventDefault()
      var $contactList = $content.find('.contact-list')
      var childrenLength = $contactList.children().length - 1 // Minus load more button

      var currentPage = Number(Math.min(childrenLength / perPage).toFixed(1))

      loadMoreContacts(searchValue, currentPage + 1)
    })

  CreateGroup.path = '/create-group'
  return CreateGroup
})
