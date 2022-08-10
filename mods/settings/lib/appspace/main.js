const SettingsAppspaceTemplate = require('./main.template.js');
const ModalRegisterUsername = require('./../../../../lib/saito/ui/modal-register-username/modal-register-username');
const ModalRegisterEmail = require('./../../../../lib/saito/ui/modal-register-email/modal-register-email');

class SettingsAppspace {

  constructor(app) {
    this.private_key_visible = 0;
  }

  render(app, mod) {

    if (!document.querySelector(".settings-appspace")) {
      app.browser.addElementToSelector(SettingsAppspaceTemplate(app, mod), ".appspace");
    }

    let settings_appspace = document.querySelector(".settings-appspace");
    if (settings_appspace) {
      for (let i = 0; i < app.modules.mods.length; i++) {
        if (app.modules.mods[i].respondTo("settings-appspace") != null) {
          let mod_settings_obj = app.modules.mods[i].respondTo("settings-appspace");
          mod_settings_obj.render(app, mod);
        }
      }
    }

    this.attachEvents(app, mod);

  }

  attachEvents(app, mod) {

    try {
      document.querySelector("#settings-appspace-manage-modules").addEventListener('click', () => {
        document.querySelector(".saito-overlay-container").classList.add("show");
      })
      document.body.addEventListener('click', (e) => {
        console.log(e.target.classList)
        if (e.target.classList.contains('saito-overlay-container') && document.querySelector(".saito-overlay-container").classList.contains('show')) {
          document.querySelector(".saito-overlay-container").classList.remove("show");
        }

        if (e.target.id == "register-email-btn"){
          mod.modal_register_email = new ModalRegisterEmail(app, function() {
            });
          mod.modal_register_email.render(app, mod, ModalRegisterEmail.MODES.REGISTEREMAIL);
          mod.modal_register_email.attachEvents(app, mod);
        }

        if (e.target.id == "register-identifier-btn"){
          mod.modal_register_username = new ModalRegisterUsername(app, function() {
          });
          mod.modal_register_username.render(app, mod);
          mod.modal_register_username.attachEvents(app, mod);
        }

      })

      document.querySelector("#settings-appspace-cancel-modules-modal").onclick = () => {
        document.querySelector(".saito-overlay-container").classList.remove("show");
      }


          try {
          let settings_appspace = document.querySelector(".settings-appspace");
          if (settings_appspace) {
            for (let i = 0; i < app.modules.mods.length; i++) {
              if (app.modules.mods[i].respondTo("settings-appspace") != null) {
                let mod_settings_obj = app.modules.mods[i].respondTo("settings-appspace");
                mod_settings_obj.attachEvents(app, mod);
              }
            }
          }
          } catch (err) {}
      
      
          try {
          document.getElementById("privatekey").onclick = function (e) {
            if (this.private_key_visible == 1) {
            } else {
              document.getElementById("privatekey").toggleClass("password");
              this.private_key_visible = 1;
            }
          }
          } catch (err) {}
      
          try {
          document.getElementById("settings-appspace-see-password").onclick = function (e) {
            document.getElementById("settings-appspace-password").toggleClass("settings-priv-key-text");
            if (this.private_key_visible == 1) {
              this.private_key_visible = 0;
            } else {
              this.private_key_visible = 1;
            }
          }
          } catch (err) {}
      
          try {
          if (document.getElementById("trigger-appstore-btn")) {
            document.getElementById("trigger-appstore-btn").onclick = function (e) {
        let appstore_mod = app.modules.returnModule("AppStore");
        if (appstore_mod) {
          appstore_mod.openAppstoreOverlay(app, appstore_mod);
        }
            }
          }
          } catch (err) {}
      
          //
          // install module (button)
          //
          try {
            Array.from(document.getElementsByClassName("modules_mods_checkbox")).forEach(ckbx => {
      
            ckbx.onclick = async (e) => {
      
              let thisid = parseInt(e.currentTarget.id);
              let currentTarget = e.currentTarget;
      
              if (e.currentTarget.checked == true) {
                let sc = await sconfirm("Reactivate this module?");
                if (sc) {
                  app.options.modules[thisid].active = 1;
                  app.storage.saveOptions();
                  window.location = window.location;
                } else {
                  window.location = window.location;
                }
              } else {
                let sc = await sconfirm("Remove this module?");
                if (sc) {
                  app.options.modules[thisid].active = 0;
                  app.storage.saveOptions();
                  window.location = window.location;
                } else {
                  currentTarget.checked = true;
                }
              }
      
            };
          });
          } catch (err) {
            console.log(err);
          }
      
          try {
            document.getElementById('backup-account-btn').addEventListener('click', (e) => {
              app.wallet.backupWallet();
            });
          } catch (err) {
            console.log(err);
          }
      
          try {
            document.getElementById('restore-account-btn').onclick = async(e) => {
              document.getElementById('file-input').addEventListener('change', function(e) {
                var file = e.target.files[0];
                app.wallet.restoreWallet(file);
              });
              document.querySelector('#file-input').click();
            }
          } catch (err) {
            console.log(err);
          }
      
      
      
          try {
          document.getElementById('reset-account-btn').onclick = async (e) => {
            
            confirmation = await sconfirm('This will reset your account, do you wish to proceed?');
            if(confirmation){
              app.wallet.resetWallet();
              app.modules.returnModule('Arcade').onResetWallet();
              app.storage.resetOptions();
      
              mod.emails.inbox = [];
              mod.emails.sent = [];
              mod.emails.trash = [];
          
              mod.render(app, mod);
              mod.attachEvents(app, mod);
          
              app.blockchain.resetBlockchain();
            }
          };
          } catch (err) {}
      
      
          try {
          document.getElementById('restore-privatekey-btn').onclick = async (e) => {
      
            await app.storage.resetOptions();
      
            let privatekey = "";
            let publickey = "";
      
            try {
              privatekey = await sprompt("Enter Private Key:");
              if (privatekey != "") {
                publickey = app.crypto.returnPublicKey(privatekey);
      
                app.wallet.wallet.privatekey = privatekey;
                app.wallet.wallet.publickey = publickey;
                app.wallet.wallet.inputs = [];
                app.wallet.wallet.outputs = [];
                app.wallet.wallet.spends = [];
                app.wallet.wallet.pending = [];
      
                app.blockchain.resetBlockchain();
      
                await app.wallet.saveWallet();
                window.location = window.location;
              }
            } catch (e) {
              salert("Restore Private Key ERROR: " + e);
              console.log("Restore Private Key ERROR: " + e);
            }
      
          };
          } catch (err) {}

    } catch (err) {
      console.log("Error in Settings Appspace: " + JSON.stringify(err));
    }

  }

}


module.exports = SettingsAppspace;

