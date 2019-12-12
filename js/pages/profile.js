define(["jquery", "service/route", "service/content"], function(
  $,
  route,
  $content
) {
  var avatarBlobURL = null;
  var currentUser = JSON.parse(localStorage.getItem('chat::user'))

  function Profile() {
    var currentUser = qiscus.instance.currentUser
    var avatarURL = currentUser.avatarUrl;
    var username = currentUser.name;
    var userId = currentUser.id;
    return `
      <div class="Profile">
        <div class="toolbar">
          <button id="back-btn" type="button">
            <i class="icon icon-arrow-left-green"></i>
          </button>
          <div class="toolbar-title">Profile</div>
        </div>
        <div class="avatar-container">
          <input id="input-avatar" type="file" accept="image/*" class="hidden">
          <img class="profile-avatar" src="${avatarURL}" alt="${userId}">
          <div class="change-avatar-container">
            <button id="avatar-picker-btn" type="button">
              <i class="icon icon-avatar-picker"></i>
            </button>
          </div>
        </div>
        <div class="info-container">
          <div class="info-header">
            Information
          </div>
          <div class="field-group">
            <div class="icon-container">
              <i class="icon icon-user"></i>
            </div>
            <input id="input-user-name" type="text" value="${username}" disabled>
            <button id="edit-name-btn" type="button">
              <i class="icon icon-pencil-grey"></i>
            </button>
          </div>
          <div class="field-group">
            <div class="icon-container">
              <i class="icon icon-id-card"></i>
            </div>
            <input id="input-user-id" type="text" value="${userId}" disabled>
          </div>
          <div class="spacer"></div>
          <button type="button" id="logout-btn" class="logout-btn">
            <i class="icon icon-logout"></i> Logout
          </button>
        </div>
      </div>
    `;
  }

  $content
    .on("click", ".Profile #back-btn", function(event) {
      event.preventDefault();
      route.push("/chat");
    })
    .on("click", ".Profile #avatar-picker-btn", function(event) {
      $content.find("#input-avatar").click();
    })
    .on("change", ".Profile #input-avatar", function(event) {
      var file = Array.from(event.target.files).pop();
      if (avatarBlobURL != null) URL.revokeObjectURL(avatarBlobURL);
      avatarBlobURL = URL.createObjectURL(file);
      $content.find(".profile-avatar").attr("src", avatarBlobURL);

      qiscus.instance.upload(file, function(err, progress, url) {
        if (err) return console.error("error when uploading new avatar", err);
        if (progress) return console.info("uploading avatar", progress);
        if (url) {
          console.log("done uploading avatar", url);
          qiscus.instance.updateUser(undefined, url, undefined, function (user, err) {
            if (err) return console.log('error while updating user profile', err)
            var newUser = Object.assign(currentUser || {}, user)
            console.log('done updating user profile', user)
            localStorage.setItem('chat::user', JSON.stringify(newUser))
            URL.revokeObjectURL(avatarBlobURL)
          })
        }
      });
    })
    .on("click", ".Profile #edit-name-btn", function(event) {
      event.preventDefault();
      $content
        .find("#input-user-name")
        .removeAttr("disabled")
        .focus();
      $(this).addClass("hidden");
    })
    .on("keydown", ".Profile #input-user-name", function(event) {
      if (event.keyCode === 13) {
        $(this).attr("disabled", true);
        $content.find("#edit-name-btn").removeClass("hidden");
        var newName = event.target.value;
        qiscus.instance.updateUser(newName, void 0, void 0, function (user) {
          console.log("Done updating profile", user);
          var newUser = Object.assign(currentUser || {}, user)
          localStorage.setItem('chat::user', JSON.stringify(newUser))
        })
      }
    })
    .on("click", ".Profile #logout-btn", function(event) {
      qiscus.logout();
      localStorage.clear();
      route.push("/login");
    });

  Profile.path = "/profile";
  return Profile;
});
