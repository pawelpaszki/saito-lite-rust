const RedSquareSidebarTemplate = require("./sidebar.template");
const SaitoCalendar = require('../../../lib/saito/new-ui/saito-calendar/saito-calendar');
const SaitoDatePicker = require("../../../lib/saito/new-ui/saito-datepicker/saito-datepicker");
class RedSquareSidebar {

  constructor(app) {
    this.name = "RedSquareSidebar";

    this.calendar = new SaitoCalendar(app);
  }

  render(app, mod) {

    //
    // our custom sidebar goes into saito-container
    //
    if (!document.querySelector(".redsquare-sidebar")) {
      app.browser.addElementToClass(RedSquareSidebarTemplate(app, mod), ".saito-container");
    }

    this.calendar.render(app, mod, ".redsquare-calendar");

  }

}

module.exports = RedSquareSidebar;

