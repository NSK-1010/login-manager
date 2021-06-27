
/**
* Creates a splash screen with custom generated content,
* diplays when the user inactive.
*
* A Plugin for the LoginManager class
*
* EVENTS:
* -----------------------------------------------------------------------------
* Listens:
* 'load' signifies that SplashScreen has finished asyncrhonously
* loading its config files.
*
* 'ready' emitted once the SplashScreen has finished creating its content
*
* Triggers:
* 'init' causes the SplashScreen content to be generated
*
*/
class SplashScreen {
  constructor() {
    /* Speed of SplashScreen transitions */
    this._ANIMATION_DUR = 300;

    /* Default options for the  splash screen */
    this._DEF_OPT = {
      "fit": true,
      "filter": false,
      "vignette": true,
      "active-timeout": 15,
      "transition": "fade",
      "img": false,
      "content": {
        "clock": [{
          "format": "dddd, MMMM Do",
          "css": {
            "color": "white"
          },
          "parent-css": {
            "margin-top": "calc(20vh - 70pt)",
            "text-align": "center",
            "font-size": "70pt",
            "font-family": "Roboto",
            "font-weight": "Regular",
            "text-shadow": "rgba(0, 0, 0, 0.25) 0px 3px 3px",
          }
        },{
          "format": ["h:mm", "A"],
          "css": [
            {"font-size": "65pt", "font-weight": 200 },
            {"font-size": "30pt", "font-weight": "Regular", "margin-left": "10pt"}
          ],
          "parent-css": {
            "margin-top": "20vh",
            "color": "white",
            "font-family": "Roboto",
            "text-align": "center",
            "text-shadow": "rgba(0, 0, 0, 0.25) 0px 3px 3px",
          }
        }],

        "html": [{
          "html":"<text style='display: none' class='active-appear'>Press any key to login</text>",
          "css": {
            "margin-top": "5vh",
            "font-weight": "200",
            "font-size": "23pt",
            "text-align": "center",
            "color": "rgba(255, 255, 255, 0.8)"
          }
        }]
      }
    };
    this.template = `<!-- Autogenerated SplashScreen -->
    <div id="splash-screen">
    <div class="vignette"></div>
    <div id="splash-screen-content"></div>
    </div>
    <!-- End Autogenerated SplashScreen -->`;
    this.$el = $(this.template);
    $("body").prepend(this.$el);

    this._loadConfig();
    // listen to the init event
    $(this).on("init", () => this._init());
  }

  /**
  * Generates the content specified by the user config.
  * Should be called after the load event has been triggered.
  */
  _init() {
    this.$content = $("#splash-screen-content");
    this._state = "closed";
    this._last_active = 0;
    this._active_timeout = 15;

    let options = this._options; // shorthand
    if (typeof options == "object") {

      // initilize global values if specfied in the config
      if (typeof options.img == "string") {
        this.$img = $(`<img class="splash-screen-img" src="${options.img}">`);

        this.$el.prepend(this.$img);
        this.$img.one("load", () => {
          // fit background image to sreen size and center
          adjustBackground($(".splash-screen-img"))
        })
      }

      if (typeof options["active-timeout"] == "number")
      this._active_timeout = options["active-timeout"];

      if (options.filter == true)
      this.$img.addClass("filter");

      if (options.vignette == true) {
        this.$vignette = $("#vignette");
        this.$vignette.show();
      }

      if (typeof options.transition == "string")
      this.transition = options.transition;

      if (typeof options.content == "object")
      this._initContent(options.content);

      $(this).trigger("ready");
    }

    /******************** Event Listeners ********************/
    this.clock = setInterval(() => {
      $(this).trigger("tick");

      if (!this._isActive())
      $(this).trigger("inactive");
    }, 500);

    // update last active time
    $(this).on("active", () => this._last_active = moment());

    $(document).keyup((e) => {
      // handle events in seperate method
      this._keyHandler.call(this, e);
    }).keypress((e) => this._keyHandler.call(this, e));

    /* Bind event listners to trigger activity event. This can be used on the
    front end to implement spcific behaivours while the user is active */
    this.$el.click(() => {
      this._open();
    }).mousemove((e) => {
      if (!this._isActive())
      $(this).trigger("active", e)
    });
    setTimeout(() => $(this).trigger("active"), 1);
  }

  /**
  * Loops through the user specified content and appends them to the DOM
  * in the order specified by the user config
  */
  _initContent(content) {
    for (let content_type in content) {
      if (content_type == "clock")
      this._initClock(content[content_type]);
      else if (content_type == "html")
      this._initHTML(content[content_type]);
      else
      log.warn("Specified content " + content_type + " is not valid.");
    }
  }

  /**
  * Asyncrhonously reads JSON config file from json/SplashScreen.json
  * and overwrites the default options with those specified by the config.
  *
  * Triggers: 'load' on completion. Caller (LoginManager) must listen for this
  * 	event to then trigger 'init'
  */
  _loadConfig() {
    let options = {};
    $.extend(true, options, this._DEF_OPT);

    $.getJSON("json/SplashScreen.json", (data) => {
      $.extend(true, options, data);
      this._options = options;
      $(this).trigger("load");
    }).fail(() => {
      $.extend(true, options, {});
      this._options = options;
      $(this).trigger("load");
    });
  }

  /**
  * Closes the splash screen if there has been no user activity
  */
  _reset() {
    if (this._state == "open") {
      this._close();
      $(this).trigger("timeout");
    }
  }

  /**
  * Determines if there was user acitivty within in a given amount
  * of time.
  * Returns 1 if splash screen is active, else 0
  */
  _isActive() {
    if (moment().diff(this._last_active, "seconds", true) > 30) {
      return 0;
    }
    return 1;
  }

  /**
  * Creates clock elements based on the usr config.
  * Appends each clock to the DOM and binds update events using _startClock
  */
  _initClock(opts) {
    if (typeof opts != "object") {
      log.error("Unable to initialize clock thats not an object");
      return -1;
    }
    // handle arrays and a single clock object
    if (!Array.isArray(opts))
    opts = [opts];

    /* loop through each clock in the config and add it to the dom,
    then initialize an update event using start clock */
    for (let i in opts) {
      this.$clock = $("<div id='clock-" + i + "' class='clock'></div>");
      this.$content.append(this.$clock);
      this._startClock(this.$clock, opts[i]);
    }
  }

  /**
  * Applys the css specfied in the argument opts to the jQuery oboject $clock.
  * Subscribes the clock to a tick event
  */
  _startClock($clock, opts) {
    if (typeof opts != "object") {
      log.error("Clock opts is not a valid object");
      return -1;
    }
    // handle multiple formats for multiple clocks on the same line
    if(typeof opts.format == "string")
    opts.format = [opts.format];

    // ensure the format is now an array
    if(!Array.isArray(opts.format)) {
      log.error(`Specfied clock format is not a valid type.
        Type can be a single string or Array.`);
        return -1;
      }

      if(!Array.isArray(opts.css))
      opts.css = [opts.css];

      for (let i in opts.format) {

        let $format = $("<sub></sub>");
        // create text field in clock
        $clock.append($format);
        // apply css styles
        if (i < opts.css.length && typeof opts.css[i] == "object")
        $format.css(opts.css[i]);

        // start clock
        $format.text(moment().format(opts.format[i]));
        $(this).on("tick", () => {
          $format.text(moment().format(opts.format[i]));
        });
      }

      if (typeof opts["parent-css"] == "object")
      $clock.css(opts["parent-css"]);

      $clock.show();
    }

    /**
    * Inserts HTML specified in the user config into the splash screen
    * accepts plain strings and objects. String literals are interpreted as
    * normal text element. Objects are set using the jQuery API
    */
    _initHTML(opts) {
      // handle single objects and strings
      if (!Array.isArray(opts)) {
        opts = [opts];
      }

      for (let el of opts) {
        if (typeof el == "string") {
          let $el = $("<text>");
          $el.text(el);
          // create simple text element
          this.$content.append($el);
        } else if (typeof el == "object") {
          // let user specify element properites in object el.
          let $el = $("<div>");
          for (let prop in el) {
            $el[prop](el[prop]);
          }
          this.$content.append($el);

        } else {
          log.warn("Splash screen html element is invalid type");
        }
      }

    }

    /**
    * Handles the key events for the SplachScreen and active-inactive events
    */
    _keyHandler(e) {
      switch (e.keyCode) {
        case 32:
        case 13: // Enter key
        if (this._state == "closed")
        this._open();
        break;
        case 27: // ESC key
        if (this._state == "open")
        this._close();
        else if (this._state == "closed")
        this._open();
        break;
        default:
        if (this._state == "closed")
        this._open();
        break;
      }

      // stop reset timeout since there has been user activity
      if (this._state == "open")
      clearTimeout(this.resetTimeout);

      // trigger active event if the user has been inactive long enough
      if (!this._isActive())
      $(this).trigger("active", e);
    }

    /**
    * _open and _close will toggle the screen and animate it opening and closing
    * adds a resetTimeout function to automatically close after a period of user
    * inactivity
    *
    * Uses a _state machine consisting of {'open', 'closed', 'moving'}.
    * Transitions are not possible while the _state == moving. This prevents
    * fillUserSelect from trigger concurrernt transitions which would lead to
    * undefined behaivour.
    */
    _close()  {
      if (this._state != "open") {
        log.warn("Cannot close splash screen when _state is: " + this._state);
        return;
      }

      this._state = "moving";
      if (this.transition == "fade") {
        this.$el.fadeIn("slow", () => {
          this._state = "closed";
          this.$content.fadeIn("slow");
          clearTimeout(this.resetTimeout);
        });
      } else if (this.transition == "slide") {
        this.$el.animate({
          top: "0"
        },"slow", "easeOutQuint", () => {
          this._state = "closed";
          clearTimeout(this.resetTimeout);
        });
      }


    }
    _open() {
      if (this._state != "closed") {
        log.warn("Cannot open splash screen when _state is: " + this._state);
        return;
      }
      clearTimeout(this.resetTimeout);
      let reset_duration = 60*1000;

      if (this._state == "open" || this._state == "moving") {
        this.resetTimeout = setTimeout(this.reset, reset_duration);
        return;
      }
      this._state = "moving";

      if (this.transition == "fade") {
        this.$content.fadeOut("fast", () => {
          this.$el.fadeOut(this._ANIMATION_DUR, () => {
            this._state = "open";
          });
        });

      } else if (this.transition == "slide") {
        this.$el.animate({
          top: "-100%"
        }, "slow", "easeInCubic", () => {
          this._state = "open";
        });
      }


    }

  }
