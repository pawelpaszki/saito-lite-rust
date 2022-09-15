const SaitoArcadeInviteTemplate = require('./../../../../../lib/saito/new-ui/templates/saito-arcade-invite.template');

module.exports = RedSquareGamesTemplate = (app, mod) => {
	let html = `<div class="saito-arcade-invite-list">`;

    //
    // render existing arcade games
    //
    let arcade_mod = app.modules.returnModule("Arcade");
    if (arcade_mod) {

      let games = arcade_mod.games.filter(invite => {
          let game_initialized = 0;
          if (invite.msg.options['game-wizard-players-select'] <= invite.msg.players.length) {
            game_initialized = 1;
          }
          if (invite.msg.players_needed <= invite.msg.players.length) {
            game_initialized = 1;
          }

          if (game_initialized){
            if (arcade_mod.isMyGame(invite, app)){
              return false;
            }
          }
          return true;
      });

      for (let i = 0; i < games.length; i++) {
        html +=  SaitoArcadeInviteTemplate(app, mod, games[i]);
      }

      html += `</div>`;

      //So if no open invites, make a stub prompting user to create a game
      
      //TODO Make this better
      if (games.length == 0){
      	html = `<h3>Create a New Game</h3>`;
      }


    }else{
    	//Be quiet if Arcade not installed
    	html = "";
    }


    return html;
}