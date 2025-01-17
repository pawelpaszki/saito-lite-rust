module.exports = AppStoreAppspaceTemplate = () => {
  return `

    <div class="appstore-appspace">

      <div class="saito-page-header">
        <div id="appstore-install-button" class="saito-button-secondary small" style="float: right;">Install New Apps</div>
        <div class="saito-page-header-title">SAITO APPSTORE</div>
        <div class="saito-page-header-text">
The Saito Appstore lets you install or upload new applications. Visit our <a href="https://wiki.saito.io">developer center</a> for information on how to build applications, then drag-and-drop them into the network once done.
        </div>
      </div>

    <div class="appstore-publish" id="appstore-publish">
      <div id="appstore-publish-inner">
       Drag-and-Drop Application ZIP
      </div>
    </div>

    <form id="appstore-publish-form">
      <label style="display:none">or select zip-file from disk: <input id="appstore-publish-module" type="file" /></label>
      <div class="submit-file-btn-box" style="display:none">
        <button type="submit" id="submit-file-btn">SUBMIT</button>
      </div>
    </form>

  </div>

  `;
}
