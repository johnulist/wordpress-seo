(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
"use strict";

var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol ? "symbol" : typeof obj; };

/* global tinyMCE */
/* global wpseoShortcodePluginL10n */
/* global ajaxurl */
/* global _ */
/* global JSON */
/* global console */
(function () {
	"use strict";

	/**
  * The Yoast Shortcode plugin parses the shortcodes in a given piece of text. It analyzes multiple input fields for shortcodes which it will preload using AJAX.
  *
  * @constructor
  * @property {RegExp} keywordRegex Used to match a given string for valid shortcode keywords.
  * @property {RegExp} closingTagRegex Used to match a given string for shortcode closing tags.
  * @property {RegExp} nonCaptureRegex Used to match a given string for non capturing shortcodes.
  * @property {Array} parsedShortcodes Used to store parsed shortcodes.
  */

	var YoastShortcodePlugin = function YoastShortcodePlugin(app) {
		this._app = app;

		this._app.registerPlugin("YoastShortcodePlugin", { status: "loading" });
		this.bindElementEvents();

		var keywordRegexString = "(" + wpseoShortcodePluginL10n.wpseo_shortcode_tags.join("|") + ")";

		// The regex for matching shortcodes based on the available shortcode keywords.
		this.keywordRegex = new RegExp(keywordRegexString, "g");
		this.closingTagRegex = new RegExp("\\[\\/" + keywordRegexString + "\\]", "g");
		this.nonCaptureRegex = new RegExp("\\[" + keywordRegexString + "[^\\]]*?\\]", "g");

		this.parsedShortcodes = [];

		this.loadShortcodes(this.declareReady.bind(this));
	};

	/* YOAST SEO CLIENT */

	/**
  * Declares ready with YoastSEO.
  */
	YoastShortcodePlugin.prototype.declareReady = function () {
		this._app.pluginReady("YoastShortcodePlugin");
		this.registerModifications();
	};

	/**
  * Declares reloaded with YoastSEO.
  */
	YoastShortcodePlugin.prototype.declareReloaded = function () {
		this._app.pluginReloaded("YoastShortcodePlugin");
	};

	/**
  * Registers the modifications for the content in which we want to replace shortcodes.
  */
	YoastShortcodePlugin.prototype.registerModifications = function () {
		this._app.registerModification("content", this.replaceShortcodes.bind(this), "YoastShortcodePlugin");
	};

	/**
  * The callback used to replace the shortcodes.
  *
  * @param {string} data
  * @returns {string}
  */
	YoastShortcodePlugin.prototype.replaceShortcodes = function (data) {
		var parsedShortcodes = this.parsedShortcodes;

		if (typeof data === "string" && parsedShortcodes.length > 0) {
			for (var i = 0; i < parsedShortcodes.length; i++) {
				data = data.replace(parsedShortcodes[i].shortcode, parsedShortcodes[i].output);
			}
		}

		return data;
	};

	/* DATA SOURCING */

	/**
  * Get data from inputfields and store them in an analyzerData object. This object will be used to fill
  * the analyzer and the snippetpreview
  *
  * @param {function} callback To declare either ready or reloaded after parsing.
  */
	YoastShortcodePlugin.prototype.loadShortcodes = function (callback) {
		var unparsedShortcodes = this.getUnparsedShortcodes(this.getShortcodes(this.getContentTinyMCE()));
		if (unparsedShortcodes.length > 0) {
			this.parseShortcodes(unparsedShortcodes, callback);
		} else {
			return callback();
		}
	};

	/**
  * Bind elements to be able to reload the dataset if shortcodes get added.
  */
	YoastShortcodePlugin.prototype.bindElementEvents = function () {
		var contentElement = document.getElementById("content") || false;
		var callback = _.debounce(this.loadShortcodes.bind(this, this.declareReloaded.bind(this)), 500);

		if (contentElement) {
			contentElement.addEventListener("keyup", callback);
			contentElement.addEventListener("change", callback);
		}

		if (typeof tinyMCE !== "undefined" && typeof tinyMCE.on === "function") {
			tinyMCE.on("addEditor", function (e) {
				e.editor.on("change", callback);
				e.editor.on("keyup", callback);
			});
		}
	};

	/**
  * gets content from the content field, if tinyMCE is initialized, use the getContent function to get the data from tinyMCE
  * @returns {String}
  */
	YoastShortcodePlugin.prototype.getContentTinyMCE = function () {
		var val = document.getElementById("content") && document.getElementById("content").value || "";
		if (typeof tinyMCE !== "undefined" && typeof tinyMCE.editors !== "undefined" && tinyMCE.editors.length !== 0) {
			val = tinyMCE.get("content") && tinyMCE.get("content").getContent() || "";
		}

		return val;
	};

	/* SHORTCODE PARSING */

	/**
  * Returns the unparsed shortcodes out of a collection of shortcodes.
  *
  * @param {Array} shortcodes
  * @returns {Array}
  */
	YoastShortcodePlugin.prototype.getUnparsedShortcodes = function (shortcodes) {
		if ((typeof shortcodes === "undefined" ? "undefined" : _typeof(shortcodes)) !== "object") {
			console.error("Failed to get unparsed shortcodes. Expected parameter to be an array, instead received " + (typeof shortcodes === "undefined" ? "undefined" : _typeof(shortcodes)));
			return false;
		}

		var unparsedShortcodes = [];

		for (var i = 0; i < shortcodes.length; i++) {
			var shortcode = shortcodes[i];
			if (unparsedShortcodes.indexOf(shortcode) === -1 && this.isUnparsedShortcode(shortcode)) {
				unparsedShortcodes.push(shortcode);
			}
		}

		return unparsedShortcodes;
	};

	/**
  * Checks if a given shortcode was already parsed.
  *
  * @param {string} shortcode
  * @returns {boolean}
  */
	YoastShortcodePlugin.prototype.isUnparsedShortcode = function (shortcode) {
		var already_exists = false;

		for (var i = 0; i < this.parsedShortcodes.length; i++) {
			if (this.parsedShortcodes[i].shortcode === shortcode) {
				already_exists = true;
			}
		}

		return already_exists === false;
	};

	/**
  * Gets the shortcodes from a given piece of text.
  *
  * @param {string} text
  * @returns {array} The matched shortcodes
  */
	YoastShortcodePlugin.prototype.getShortcodes = function (text) {
		if (typeof text !== "string") {
			/* jshint ignore:start */
			console.error("Failed to get shortcodes. Expected parameter to be a string, instead received" + (typeof text === "undefined" ? "undefined" : _typeof(text)));
			/* jshint ignore:end*/
			return false;
		}

		var captures = this.matchCapturingShortcodes(text);

		// Remove the capturing shortcodes from the text before trying to match the capturing shortcodes.
		for (var i = 0; i < captures.length; i++) {
			text = text.replace(captures[i], "");
		}

		var nonCaptures = this.matchNonCapturingShortcodes(text);

		return captures.concat(nonCaptures);
	};

	/**
  * Matches the capturing shortcodes from a given piece of text.
  *
  * @param {string} text
  * @returns {Array}
  */
	YoastShortcodePlugin.prototype.matchCapturingShortcodes = function (text) {
		var captures = [];

		// First identify which tags are being used in a capturing shortcode by looking for closing tags.
		var captureKeywords = (text.match(this.closingTagRegex) || []).join(" ").match(this.keywordRegex) || [];

		// Fetch the capturing shortcodes and strip them from the text so we can easily match the non capturing shortcodes.
		for (var i = 0; i < captureKeywords.length; i++) {
			var captureKeyword = captureKeywords[i];
			var captureRegex = "\\[" + captureKeyword + "[^\\]]*?\\].*?\\[\\/" + captureKeyword + "\\]";
			var matches = text.match(new RegExp(captureRegex, "g")) || [];

			captures = captures.concat(matches);
		}

		return captures;
	};

	/**
  * Matches the non capturing shortcodes from a given piece of text.
  *
  * @param {string} text
  * @returns {Array}
  */
	YoastShortcodePlugin.prototype.matchNonCapturingShortcodes = function (text) {
		return text.match(this.nonCaptureRegex) || [];
	};

	/**
  * Parses the unparsed shortcodes through AJAX and clears them.
  *
  * @param {Array} shortcodes shortcodes to be parsed.
  * @param {function} callback function to be called in the context of the AJAX callback.
  */
	YoastShortcodePlugin.prototype.parseShortcodes = function (shortcodes, callback) {
		if (typeof callback !== "function") {
			/* jshint ignore:start */
			console.error("Failed to parse shortcodes. Expected parameter to be a function, instead received " + (typeof callback === "undefined" ? "undefined" : _typeof(callback)));
			/* jshint ignore:end */
			return false;
		}

		if ((typeof shortcodes === "undefined" ? "undefined" : _typeof(shortcodes)) === "object" && shortcodes.length > 0) {
			jQuery.post(ajaxurl, {
				action: "wpseo_filter_shortcodes",
				_wpnonce: wpseoShortcodePluginL10n.wpseo_filter_shortcodes_nonce,
				data: shortcodes
			}, function (shortcodeResults) {
				this.saveParsedShortcodes(shortcodeResults, callback);
			}.bind(this));
		} else {
			return callback();
		}
	};

	/**
  * Saves the shortcodes that were parsed with AJAX to `this.parsedShortcodes`
  *
  * @param {Array} shortcodeResults
  * @param {function} callback
  */
	YoastShortcodePlugin.prototype.saveParsedShortcodes = function (shortcodeResults, callback) {
		shortcodeResults = JSON.parse(shortcodeResults);
		for (var i = 0; i < shortcodeResults.length; i++) {
			this.parsedShortcodes.push(shortcodeResults[i]);
		}

		callback();
	};

	window.YoastShortcodePlugin = YoastShortcodePlugin;
})();

},{}]},{},[1])
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJqcy9zcmMvd3Atc2VvLXNob3J0Y29kZS1wbHVnaW4uanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7Ozs7Ozs7Ozs7O0FDTUUsYUFBVztBQUNaOzs7Ozs7Ozs7Ozs7QUFXQSxLQUFJLHVCQUF1QixTQUF2QixvQkFBdUIsQ0FBVSxHQUFWLEVBQWdCO0FBQzFDLE9BQUssSUFBTCxHQUFZLEdBQVo7O0FBRUEsT0FBSyxJQUFMLENBQVUsY0FBVixDQUEwQixzQkFBMUIsRUFBa0QsRUFBRSxRQUFRLFNBQVYsRUFBbEQ7QUFDQSxPQUFLLGlCQUFMOztBQUVBLE1BQUkscUJBQXFCLE1BQU0seUJBQXlCLG9CQUF6QixDQUE4QyxJQUE5QyxDQUFvRCxHQUFwRCxDQUFOLEdBQWtFLEdBQTNGOzs7QUFHQSxPQUFLLFlBQUwsR0FBb0IsSUFBSSxNQUFKLENBQVksa0JBQVosRUFBZ0MsR0FBaEMsQ0FBcEI7QUFDQSxPQUFLLGVBQUwsR0FBdUIsSUFBSSxNQUFKLENBQVksV0FBVyxrQkFBWCxHQUFnQyxLQUE1QyxFQUFtRCxHQUFuRCxDQUF2QjtBQUNBLE9BQUssZUFBTCxHQUF1QixJQUFJLE1BQUosQ0FBWSxRQUFRLGtCQUFSLEdBQTZCLGFBQXpDLEVBQXdELEdBQXhELENBQXZCOztBQUVBLE9BQUssZ0JBQUwsR0FBd0IsRUFBeEI7O0FBRUEsT0FBSyxjQUFMLENBQXFCLEtBQUssWUFBTCxDQUFrQixJQUFsQixDQUF3QixJQUF4QixDQUFyQjtBQUNBLEVBaEJEOzs7Ozs7O0FBdUJBLHNCQUFxQixTQUFyQixDQUErQixZQUEvQixHQUE4QyxZQUFXO0FBQ3hELE9BQUssSUFBTCxDQUFVLFdBQVYsQ0FBdUIsc0JBQXZCO0FBQ0EsT0FBSyxxQkFBTDtBQUNBLEVBSEQ7Ozs7O0FBUUEsc0JBQXFCLFNBQXJCLENBQStCLGVBQS9CLEdBQWlELFlBQVc7QUFDM0QsT0FBSyxJQUFMLENBQVUsY0FBVixD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QSxzQkFBcUIsU0FBckIsQ0FBK0IsZUFBL0IsR0FBaUQsVUFBVSxVQUFWLEVBQXNCLFFBQXRCLEVBQWlDO0FBQ2pGLE1BQUssT0FBTyxRQUFQLEtBQW9CLFVBQXpCLEVBQXNDOztBQUVyQyxXQUFRLEtBQVIsQ0FBZSwrRkFBOEYsUUFBOUYseUNBQThGLFFBQTlGLEVBQWY7O0FBRUEsVUFBTyxLQUFQO0FBQ0E7O0FBRUQsTUFBSyxRQUFPLFVBQVAseUNBQU8sVUFBUCxPQUFzQixRQUF0QixJQUFrQyxXQUFXLE1BQVgsR0FBb0IsQ0FBM0QsRUFBK0Q7QUFDOUQsVUFBTyxJQUFQLENBQWEsT0FBYixFQUFzQjtBQUNyQixZQUFRLHlCQURhO0FBRXJCLGNBQVUseUJBQXlCLDZCQUZkO0FBR3JCLFVBQU07QUFIZSxJQUF0QixFQUtDLFVBQVUsZ0JBQVYsRUFBNkI7QUFDNUIsU0FBSyxvQkFBTCxDQUEyQixnQkFBM0IsRUFBNkMsUUFBN0M7QUFDQSxJQUZELENBRUUsSUFGRixDQUVRLElBRlIsQ0FMRDtBQVNBLEdBVkQsTUFXSztBQUNKLFVBQU8sVUFBUDtBQUNBO0FBQ0QsRUF0QkQ7Ozs7Ozs7O0FBOEJBLHNCQUFxQixTQUFyQixDQUErQixvQkFBL0IsR0FBc0QsVUFBVSxnQkFBVixFQUE0QixRQUE1QixFQUF1QztBQUM1RixxQkFBbUIsS0FBSyxLQUFMLENBQVksZ0JBQVosQ0FBbkI7QUFDQSxPQUFNLElBQUksSUFBSSxDQUFkLEVBQWlCLElBQUksaUJBQWlCLE1BQXRDLEVBQThDLEdBQTlDLEVBQW9EO0FBQ25ELFFBQUssZ0JBQUwsQ0FBc0IsSUFBdEIsQ0FBNEIsaUJBQWtCLENBQWxCLENBQTVCO0FBQ0E7O0FBRUQ7QUFDQSxFQVBEOztBQVNBLFFBQU8sb0JBQVAsR0FBOEIsb0JBQTlCO0FBQ0EsQ0FoUkMsR0FBRiIsImZpbGUiOiJnZW5lcmF0ZWQuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlc0NvbnRlbnQiOlsiKGZ1bmN0aW9uIGUodCxuLHIpe2Z1bmN0aW9uIHMobyx1KXtpZighbltvXSl7aWYoIXRbb10pe3ZhciBhPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7aWYoIXUmJmEpcmV0dXJuIGEobywhMCk7aWYoaSlyZXR1cm4gaShvLCEwKTt2YXIgZj1uZXcgRXJyb3IoXCJDYW5ub3QgZmluZCBtb2R1bGUgJ1wiK28rXCInXCIpO3Rocm93IGYuY29kZT1cIk1PRFVMRV9OT1RfRk9VTkRcIixmfXZhciBsPW5bb109e2V4cG9ydHM6e319O3Rbb11bMF0uY2FsbChsLmV4cG9ydHMsZnVuY3Rpb24oZSl7dmFyIG49dFtvXVsxXVtlXTtyZXR1cm4gcyhuP246ZSl9LGwsbC5leHBvcnRzLGUsdCxuLHIpfXJldHVybiBuW29dLmV4cG9ydHN9dmFyIGk9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtmb3IodmFyIG89MDtvPHIubGVuZ3RoO28rKylzKHJbb10pO3JldHVybiBzfSkiLCIvKiBnbG9iYWwgdGlueU1DRSAqL1xuLyogZ2xvYmFsIHdwc2VvU2hvcnRjb2RlUGx1Z2luTDEwbiAqL1xuLyogZ2xvYmFsIGFqYXh1cmwgKi9cbi8qIGdsb2JhbCBfICovXG4vKiBnbG9iYWwgSlNPTiAqL1xuLyogZ2xvYmFsIGNvbnNvbGUgKi9cbiggZnVuY3Rpb24oKSB7XG5cdFwidXNlIHN0cmljdFwiO1xuXG5cdC8qKlxuXHQgKiBUaGUgWW9hc3QgU2hvcnRjb2RlIHBsdWdpbiBwYXJzZXMgdGhlIHNob3J0Y29kZXMgaW4gYSBnaXZlbiBwaWVjZSBvZiB0ZXh0LiBJdCBhbmFseXplcyBtdWx0aXBsZSBpbnB1dCBmaWVsZHMgZm9yIHNob3J0Y29kZXMgd2hpY2ggaXQgd2lsbCBwcmVsb2FkIHVzaW5nIEFKQVguXG5cdCAqXG5cdCAqIEBjb25zdHJ1Y3RvclxuXHQgKiBAcHJvcGVydHkge1JlZ0V4cH0ga2V5d29yZFJlZ2V4IFVzZWQgdG8gbWF0Y2ggYSBnaXZlbiBzdHJpbmcgZm9yIHZhbGlkIHNob3J0Y29kZSBrZXl3b3Jkcy5cblx0ICogQHByb3BlcnR5IHtSZWdFeHB9IGNsb3NpbmdUYWdSZWdleCBVc2VkIHRvIG1hdGNoIGEgZ2l2ZW4gc3RyaW5nIGZvciBzaG9ydGNvZGUgY2xvc2luZyB0YWdzLlxuXHQgKiBAcHJvcGVydHkge1JlZ0V4cH0gbm9uQ2FwdHVyZVJlZ2V4IFVzZWQgdG8gbWF0Y2ggYSBnaXZlbiBzdHJpbmcgZm9yIG5vbiBjYXB0dXJpbmcgc2hvcnRjb2Rlcy5cblx0ICogQHByb3BlcnR5IHtBcnJheX0gcGFyc2VkU2hvcnRjb2RlcyBVc2VkIHRvIHN0b3JlIHBhcnNlZCBzaG9ydGNvZGVzLlxuXHQgKi9cblx0dmFyIFlvYXN0U2hvcnRjb2RlUGx1Z2luID0gZnVuY3Rpb24oIGFwcCApIHtcblx0XHR0aGlzLl9hcHAgPSBhcHA7XG5cblx0XHR0aGlzLl9hcHAucmVnaXN0ZXJQbHVnaW4oIFwiWW9hc3RTaG9ydGNvZGVQbHVnaW5cIiwgeyBzdGF0dXM6IFwibG9hZGluZ1wiIH0gKTtcblx0XHR0aGlzLmJpbmRFbGVtZW50RXZlbnRzKCk7XG5cblx0XHR2YXIga2V5d29yZFJlZ2V4U3RyaW5nID0gXCIoXCIgKyB3cHNlb1Nob3J0Y29kZVBsdWdpbkwxMG4ud3BzZW9fc2hvcnRjb2RlX3RhZ3Muam9pbiggXCJ8XCIgKSArIFwiKVwiO1xuXG5cdFx0Ly8gVGhlIHJlZ2V4IGZvciBtYXRjaGluZyBzaG9ydGNvZGVzIGJhc2VkIG9uIHRoZSBhdmFpbGFibGUgc2hvcnRjb2RlIGtleXdvcmRzLlxuXHRcdHRoaXMua2V5d29yZFJlZ2V4ID0gbmV3IFJlZ0V4cCgga2V5d29yZFJlZ2V4U3RyaW5nLCBcImdcIiApO1xuXHRcdHRoaXMuY2xvc2luZ1RhZ1JlZ2V4ID0gbmV3IFJlZ0V4cCggXCJcXFxcW1xcXFwvXCIgKyBrZXl3b3JkUmVnZXhTdHJpbmcgKyBcIlxcXFxdXCIsIFwiZ1wiICk7XG5cdFx0dGhpcy5ub25DYXB0dXJlUmVnZXggPSBuZXcgUmVnRXhwKCBcIlxcXFxbXCIgKyBrZXl3b3JkUmVnZXhTdHJpbmcgKyBcIlteXFxcXF1dKj9cXFxcXVwiLCBcImdcIiApO1xuXG5cdFx0dGhpcy5wYXJzZWRTaG9ydGNvZGVzID0gW107XG5cblx0XHR0aGlzLmxvYWRTaG9ydGNvZGVzKCB0aGlzLmRlY2xhcmVSZWFkeS5iaW5kKCB0aGlzICkgKTtcblx0fTtcblxuXHQvKiBZT0FTVCBTRU8gQ0xJRU5UICovXG5cblx0LyoqXG5cdCAqIERlY2xhcmVzIHJlYWR5IHdpdGggWW9hc3RTRU8uXG5cdCAqL1xuXHRZb2FzdFNob3J0Y29kZVBsdWdpbi5wcm90b3R5cGUuZGVjbGFyZVJlYWR5ID0gZnVuY3Rpb24oKSB7XG5cdFx0dGhpcy5fYXBwLnBsdWdpblJlYWR5KCBcIllvYXN0U2hvcnRjb2RlUGx1Z2luXCIgKTtcblx0XHR0aGlzLnJlZ2lzdGVyTW9kaWZpY2F0aW9ucygpO1xuXHR9O1xuXG5cdC8qKlxuXHQgKiBEZWNsYXJlcyByZWxvYWRlZCB3aXRoIFlvYXN0U0VPLlxuXHQgKi9cblx0WW9hc3RTaG9ydGNvZGVQbHVnaW4ucHJvdG90eXBlLmRlY2xhcmVSZWxvYWRlZCA9IGZ1bmN0aW9uKCkge1xuXHRcdHRoaXMuX2FwcC5wbHVnaW5SZWxvYWRlZCggXCJZb2FzdFNob3J0Y29kZVBsdWdpblwiICk7XG5cdH07XG5cblx0LyoqXG5cdCAqIFJlZ2lzdGVycyB0aGUgbW9kaWZpY2F0aW9ucyBmb3IgdGhlIGNvbnRlbnQgaW4gd2hpY2ggd2Ugd2FudCB0byByZXBsYWNlIHNob3J0Y29kZXMuXG5cdCAqL1xuXHRZb2FzdFNob3J0Y29kZVBsdWdpbi5wcm90b3R5cGUucmVnaXN0ZXJNb2RpZmljYXRpb25zID0gZnVuY3Rpb24oKSB7XG5cdFx0dGhpcy5fYXBwLnJlZ2lzdGVyTW9kaWZpY2F0aW9uKCBcImNvbnRlbnRcIiwgdGhpcy5yZXBsYWNlU2hvcnRjb2Rlcy5iaW5kKCB0aGlzICksIFwiWW9hc3RTaG9ydGNvZGVQbHVnaW5cIiApO1xuXHR9O1xuXG5cdC8qKlxuXHQgKiBUaGUgY2FsbGJhY2sgdXNlZCB0byByZXBsYWNlIHRoZSBzaG9ydGNvZGVzLlxuXHQgKlxuXHQgKiBAcGFyYW0ge3N0cmluZ30gZGF0YVxuXHQgKiBAcmV0dXJucyB7c3RyaW5nfVxuXHQgKi9cblx0WW9hc3RTaG9ydGNvZGVQbHVnaW4ucHJvdG90eXBlLnJlcGxhY2VTaG9ydGNvZGVzID0gZnVuY3Rpb24oIGRhdGEgKSB7XG5cdFx0dmFyIHBhcnNlZFNob3J0Y29kZXMgPSB0aGlzLnBhcnNlZFNob3J0Y29kZXM7XG5cblx0XHRpZiAoIHR5cGVvZiBkYXRhID09PSBcInN0cmluZ1wiICYmIHBhcnNlZFNob3J0Y29kZXMubGVuZ3RoID4gMCApIHtcblx0XHRcdGZvciAoIHZhciBpID0gMDsgaSA8IHBhcnNlZFNob3J0Y29kZXMubGVuZ3RoOyBpKysgKSB7XG5cdFx0XHRcdGRhdGEgPSBkYXRhLnJlcGxhY2UoIHBhcnNlZFNob3J0Y29kZXNbIGkgXS5zaG9ydGNvZGUsIHBhcnNlZFNob3J0Y29kZXNbIGkgXS5vdXRwdXQgKTtcblx0XHRcdH1cblx0XHR9XG5cblx0XHRyZXR1cm4gZGF0YTtcblx0fTtcblxuXHQvKiBEQVRBIFNPVVJDSU5HICovXG5cblx0LyoqXG5cdCAqIEdldCBkYXRhIGZyb20gaW5wdXRmaWVsZHMgYW5kIHN0b3JlIHRoZW0gaW4gYW4gYW5hbHl6ZXJEYXRhIG9iamVjdC4gVGhpcyBvYmplY3Qgd2lsbCBiZSB1c2VkIHRvIGZpbGxcblx0ICogdGhlIGFuYWx5emVyIGFuZCB0aGUgc25pcHBldHByZXZpZXdcblx0ICpcblx0ICogQHBhcmFtIHtmdW5jdGlvbn0gY2FsbGJhY2sgVG8gZGVjbGFyZSBlaXRoZXIgcmVhZHkgb3IgcmVsb2FkZWQgYWZ0ZXIgcGFyc2luZy5cblx0ICovXG5cdFlvYXN0U2hvcnRjb2RlUGx1Z2luLnByb3RvdHlwZS5sb2FkU2hvcnRjb2RlcyA9IGZ1bmN0aW9uKCBjYWxsYmFjayApIHtcblx0XHR2YXIgdW5wYXJzZWRTaG9ydGNvZGVzID0gdGhpcy5nZXRVbnBhcnNlZFNob3J0Y29kZXMoIHRoaXMuZ2V0U2hvcnRjb2RlcyggdGhpcy5nZXRDb250ZW50VGlueU1DRSgpICkgKTtcblx0XHRpZiAoIHVucGFyc2VkU2hvcnRjb2Rlcy5sZW5ndGggPiAwICkge1xuXHRcdFx0dGhpcy5wYXJzZVNob3J0Y29kZXMoIHVucGFyc2VkU2hvcnRjb2RlcywgY2FsbGJhY2sgKTtcblx0XHR9IGVsc2Uge1xuXHRcdFx0cmV0dXJuIGNhbGxiYWNrKCk7XG5cdFx0fVxuXHR9O1xuXG5cdC8qKlxuXHQgKiBCaW5kIGVsZW1lbnRzIHRvIGJlIGFibGUgdG8gcmVsb2FkIHRoZSBkYXRhc2V0IGlmIHNob3J0Y29kZXMgZ2V0IGFkZGVkLlxuXHQgKi9cblx0WW9hc3RTaG9ydGNvZGVQbHVnaW4ucHJvdG90eXBlLmJpbmRFbGVtZW50RXZlbnRzID0gZnVuY3Rpb24oKSB7XG5cdFx0dmFyIGNvbnRlbnRFbGVtZW50ID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoIFwiY29udGVudFwiICkgfHwgZmFsc2U7XG5cdFx0dmFyIGNhbGxiYWNrID0gIF8uZGVib3VuY2UoXHR0aGlzLmxvYWRTaG9ydGNvZGVzLmJpbmQoIHRoaXMsIHRoaXMuZGVjbGFyZVJlbG9hZGVkLmJpbmQoIHRoaXMgKSApLCA1MDAgKTtcblxuXHRcdGlmICggY29udGVudEVsZW1lbnQgKSB7XG5cdFx0XHRjb250ZW50RWxlbWVudC5hZGRFdmVudExpc3RlbmVyKCBcImtleXVwXCIsIGNhbGxiYWNrICk7XG5cdFx0XHRjb250ZW50RWxlbWVudC5hZGRFdmVudExpc3RlbmVyKCBcImNoYW5nZVwiLCBjYWxsYmFjayApO1xuXHRcdH1cblxuXHRcdGlmKCB0eXBlb2YgdGlueU1DRSAhPT0gXCJ1bmRlZmluZWRcIiAmJiB0eXBlb2YgdGlueU1DRS5vbiA9PT0gXCJmdW5jdGlvblwiICkge1xuXHRcdFx0dGlueU1DRS5vbiggXCJhZGRFZGl0b3JcIiwgZnVuY3Rpb24oIGUgKSB7XG5cdFx0XHRcdGUuZWRpdG9yLm9uKCBcImNoYW5nZVwiLCBjYWxsYmFjayApO1xuXHRcdFx0XHRlLmVkaXRvci5vbiggXCJrZXl1cFwiLCBjYWxsYmFjayApO1xuXHRcdFx0fSApO1xuXHRcdH1cblx0fTtcblxuXHQvKipcblx0ICogZ2V0cyBjb250ZW50IGZyb20gdGhlIGNvbnRlbnQgZmllbGQsIGlmIHRpbnlNQ0UgaXMgaW5pdGlhbGl6ZWQsIHVzZSB0aGUgZ2V0Q29udGVudCBmdW5jdGlvbiB0byBnZXQgdGhlIGRhdGEgZnJvbSB0aW55TUNFXG5cdCAqIEByZXR1cm5zIHtTdHJpbmd9XG5cdCAqL1xuXHRZb2FzdFNob3J0Y29kZVBsdWdpbi5wcm90b3R5cGUuZ2V0Q29udGVudFRpbnlNQ0UgPSBmdW5jdGlvbigpIHtcblx0XHR2YXIgdmFsID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoIFwiY29udGVudFwiICkgJiYgZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoIFwiY29udGVudFwiICkudmFsdWUgfHwgXCJcIjtcblx0XHRpZiAoIHR5cGVvZiB0aW55TUNFICE9PSBcInVuZGVmaW5lZFwiICYmIHR5cGVvZiB0aW55TUNFLmVkaXRvcnMgIT09IFwidW5kZWZpbmVkXCIgJiYgdGlueU1DRS5lZGl0b3JzLmxlbmd0aCAhPT0gMCApIHtcblx0XHRcdHZhbCA9IHRpbnlNQ0UuZ2V0KCBcImNvbnRlbnRcIiApICYmIHRpbnlNQ0UuZ2V0KCBcImNvbnRlbnRcIiApLmdldENvbnRlbnQoKSB8fCBcIlwiO1xuXHRcdH1cblxuXHRcdHJldHVybiB2YWw7XG5cdH07XG5cblx0LyogU0hPUlRDT0RFIFBBUlNJTkcgKi9cblxuXHQvKipcblx0ICogUmV0dXJucyB0aGUgdW5wYXJzZWQgc2hvcnRjb2RlcyBvdXQgb2YgYSBjb2xsZWN0aW9uIG9mIHNob3J0Y29kZXMuXG5cdCAqXG5cdCAqIEBwYXJhbSB7QXJyYXl9IHNob3J0Y29kZXNcblx0ICogQHJldHVybnMge0FycmF5fVxuXHQgKi9cblx0WW9hc3RTaG9ydGNvZGVQbHVnaW4ucHJvdG90eXBlLmdldFVucGFyc2VkU2hvcnRjb2RlcyA9IGZ1bmN0aW9uKCBzaG9ydGNvZGVzICkge1xuXHRcdGlmICggdHlwZW9mIHNob3J0Y29kZXMgIT09IFwib2JqZWN0XCIgKSB7XG5cdFx0XHRjb25zb2xlLmVycm9yKCBcIkZhaWxlZCB0byBnZXQgdW5wYXJzZWQgc2hvcnRjb2Rlcy4gRXhwZWN0ZWQgcGFyYW1ldGVyIHRvIGJlIGFuIGFycmF5LCBpbnN0ZWFkIHJlY2VpdmVkIFwiICsgdHlwZW9mIHNob3J0Y29kZXMgKTtcblx0XHRcdHJldHVybiBmYWxzZTtcblx0XHR9XG5cblx0XHR2YXIgdW5wYXJzZWRTaG9ydGNvZGVzID0gW107XG5cblx0XHRmb3IgKCB2YXIgaSA9IDA7IGkgPCBzaG9ydGNvZGVzLmxlbmd0aDsgaSsrICkge1xuXHRcdFx0dmFyIHNob3J0Y29kZSA9IHNob3J0Y29kZXNbIGkgXTtcblx0XHRcdGlmICggdW5wYXJzZWRTaG9ydGNvZGVzLmluZGV4T2YoIHNob3J0Y29kZSApID09PSAtMSAmJiB0aGlzLmlzVW5wYXJzZWRTaG9ydGNvZGUoIHNob3J0Y29kZSApICkge1xuXHRcdFx0XHR1bnBhcnNlZFNob3J0Y29kZXMucHVzaCggc2hvcnRjb2RlICk7XG5cdFx0XHR9XG5cdFx0fVxuXG5cdFx0cmV0dXJuIHVucGFyc2VkU2hvcnRjb2Rlcztcblx0fTtcblxuXHQvKipcblx0ICogQ2hlY2tzIGlmIGEgZ2l2ZW4gc2hvcnRjb2RlIHdhcyBhbHJlYWR5IHBhcnNlZC5cblx0ICpcblx0ICogQHBhcmFtIHtzdHJpbmd9IHNob3J0Y29kZVxuXHQgKiBAcmV0dXJucyB7Ym9vbGVhbn1cblx0ICovXG5cdFlvYXN0U2hvcnRjb2RlUGx1Z2luLnByb3RvdHlwZS5pc1VucGFyc2VkU2hvcnRjb2RlID0gZnVuY3Rpb24oIHNob3J0Y29kZSApIHtcblx0XHR2YXIgYWxyZWFkeV9leGlzdHMgPSBmYWxzZTtcblxuXHRcdGZvciAoIHZhciBpID0gMDsgaSA8IHRoaXMucGFyc2VkU2hvcnRjb2Rlcy5sZW5ndGg7IGkrKyApIHtcblx0XHRcdGlmICggdGhpcy5wYXJzZWRTaG9ydGNvZGVzWyBpIF0uc2hvcnRjb2RlID09PSBzaG9ydGNvZGUgKSB7XG5cdFx0XHRcdGFscmVhZHlfZXhpc3RzID0gdHJ1ZTtcblx0XHRcdH1cblx0XHR9XG5cblx0XHRyZXR1cm4gYWxyZWFkeV9leGlzdHMgPT09IGZhbHNlO1xuXHR9O1xuXG5cdC8qKlxuXHQgKiBHZXRzIHRoZSBzaG9ydGNvZGVzIGZyb20gYSBnaXZlbiBwaWVjZSBvZiB0ZXh0LlxuXHQgKlxuXHQgKiBAcGFyYW0ge3N0cmluZ30gdGV4dFxuXHQgKiBAcmV0dXJucyB7YXJyYXl9IFRoZSBtYXRjaGVkIHNob3J0Y29kZXNcblx0ICovXG5cdFlvYXN0U2hvcnRjb2RlUGx1Z2luLnByb3RvdHlwZS5nZXRTaG9ydGNvZGVzID0gZnVuY3Rpb24oIHRleHQgKSB7XG5cdFx0aWYgKCB0eXBlb2YgdGV4dCAhPT0gXCJzdHJpbmdcIiApIHtcblx0XHRcdC8qIGpzaGludCBpZ25vcmU6c3RhcnQgKi9cblx0XHRcdGNvbnNvbGUuZXJyb3IoIFwiRmFpbGVkIHRvIGdldCBzaG9ydGNvZGVzLiBFeHBlY3RlZCBwYXJhbWV0ZXIgdG8gYmUgYSBzdHJpbmcsIGluc3RlYWQgcmVjZWl2ZWRcIiArIHR5cGVvZiB0ZXh0ICk7XG5cdFx0XHQvKiBqc2hpbnQgaWdub3JlOmVuZCovXG5cdFx0XHRyZXR1cm4gZmFsc2U7XG5cdFx0fVxuXG5cdFx0dmFyIGNhcHR1cmVzID0gdGhpcy5tYXRjaENhcHR1cmluZ1Nob3J0Y29kZXMoIHRleHQgKTtcblxuXHRcdC8vIFJlbW92ZSB0aGUgY2FwdHVyaW5nIHNob3J0Y29kZXMgZnJvbSB0aGUgdGV4dCBiZWZvcmUgdHJ5aW5nIHRvIG1hdGNoIHRoZSBjYXB0dXJpbmcgc2hvcnRjb2Rlcy5cblx0XHRmb3IgKCB2YXIgaSA9IDA7IGkgPCBjYXB0dXJlcy5sZW5ndGg7IGkrKyApIHtcblx0XHRcdHRleHQgPSB0ZXh0LnJlcGxhY2UoIGNhcHR1cmVzWyBpIF0sIFwiXCIgKTtcblx0XHR9XG5cblx0XHR2YXIgbm9uQ2FwdHVyZXMgPSB0aGlzLm1hdGNoTm9uQ2FwdHVyaW5nU2hvcnRjb2RlcyggdGV4dCApO1xuXG5cdFx0cmV0dXJuIGNhcHR1cmVzLmNvbmNhdCggbm9uQ2FwdHVyZXMgKTtcblx0fTtcblxuXHQvKipcblx0ICogTWF0Y2hlcyB0aGUgY2FwdHVyaW5nIHNob3J0Y29kZXMgZnJvbSBhIGdpdmVuIHBpZWNlIG9mIHRleHQuXG5cdCAqXG5cdCAqIEBwYXJhbSB7c3RyaW5nfSB0ZXh0XG5cdCAqIEByZXR1cm5zIHtBcnJheX1cblx0ICovXG5cdFlvYXN0U2hvcnRjb2RlUGx1Z2luLnByb3RvdHlwZS5tYXRjaENhcHR1cmluZ1Nob3J0Y29kZXMgPSBmdW5jdGlvbiggdGV4dCApIHtcblx0XHR2YXIgY2FwdHVyZXMgPSBbXTtcblxuXHRcdC8vIEZpcnN0IGlkZW50aWZ5IHdoaWNoIHRhZ3MgYXJlIGJlaW5nIHVzZWQgaW4gYSBjYXB0dXJpbmcgc2hvcnRjb2RlIGJ5IGxvb2tpbmcgZm9yIGNsb3NpbmcgdGFncy5cblx0XHR2YXIgY2FwdHVyZUtleXdvcmRzID0gKCB0ZXh0Lm1hdGNoKCB0aGlzLmNsb3NpbmdUYWdSZWdleCApIHx8IFtdICkuam9pbiggXCIgXCIgKS5tYXRjaCggdGhpcy5rZXl3b3JkUmVnZXggKSB8fCBbXTtcblxuXHRcdC8vIEZldGNoIHRoZSBjYXB0dXJpbmcgc2hvcnRjb2RlcyBhbmQgc3RyaXAgdGhlbSBmcm9tIHRoZSB0ZXh0IHNvIHdlIGNhbiBlYXNpbHkgbWF0Y2ggdGhlIG5vbiBjYXB0dXJpbmcgc2hvcnRjb2Rlcy5cblx0XHRmb3IgKCB2YXIgaSA9IDA7IGkgPCBjYXB0dXJlS2V5d29yZHMubGVuZ3RoOyBpKysgKSB7XG5cdFx0XHR2YXIgY2FwdHVyZUtleXdvcmQgPSBjYXB0dXJlS2V5d29yZHNbIGkgXTtcblx0XHRcdHZhciBjYXB0dXJlUmVnZXggPSBcIlxcXFxbXCIgKyBjYXB0dXJlS2V5d29yZCArIFwiW15cXFxcXV0qP1xcXFxdLio/XFxcXFtcXFxcL1wiICsgY2FwdHVyZUtleXdvcmQgKyBcIlxcXFxdXCI7XG5cdFx0XHR2YXIgbWF0Y2hlcyA9IHRleHQubWF0Y2goIG5ldyBSZWdFeHAoIGNhcHR1cmVSZWdleCwgXCJnXCIgKSApIHx8IFtdO1xuXG5cdFx0XHRjYXB0dXJlcyA9IGNhcHR1cmVzLmNvbmNhdCggbWF0Y2hlcyApO1xuXHRcdH1cblxuXHRcdHJldHVybiBjYXB0dXJlcztcblx0fTtcblxuXHQvKipcblx0ICogTWF0Y2hlcyB0aGUgbm9uIGNhcHR1cmluZyBzaG9ydGNvZGVzIGZyb20gYSBnaXZlbiBwaWVjZSBvZiB0ZXh0LlxuXHQgKlxuXHQgKiBAcGFyYW0ge3N0cmluZ30gdGV4dFxuXHQgKiBAcmV0dXJucyB7QXJyYXl9XG5cdCAqL1xuXHRZb2FzdFNob3J0Y29kZVBsdWdpbi5wcm90b3R5cGUubWF0Y2hOb25DYXB0dXJpbmdTaG9ydGNvZGVzID0gZnVuY3Rpb24oIHRleHQgKSB7XG5cdFx0cmV0dXJuIHRleHQubWF0Y2goIHRoaXMubm9uQ2FwdHVyZVJlZ2V4ICkgfHwgW107XG5cdH07XG5cblx0LyoqXG5cdCAqIFBhcnNlcyB0aGUgdW5wYXJzZWQgc2hvcnRjb2RlcyB0aHJvdWdoIEFKQVggYW5kIGNsZWFycyB0aGVtLlxuXHQgKlxuXHQgKiBAcGFyYW0ge0FycmF5fSBzaG9ydGNvZGVzIHNob3J0Y29kZXMgdG8gYmUgcGFyc2VkLlxuXHQgKiBAcGFyYW0ge2Z1bmN0aW9ufSBjYWxsYmFjayBmdW5jdGlvbiB0byBiZSBjYWxsZWQgaW4gdGhlIGNvbnRleHQgb2YgdGhlIEFKQVggY2FsbGJhY2suXG5cdCAqL1xuXHRZb2FzdFNob3J0Y29kZVBsdWdpbi5wcm90b3R5cGUucGFyc2VTaG9ydGNvZGVzID0gZnVuY3Rpb24oIHNob3J0Y29kZXMsIGNhbGxiYWNrICkge1xuXHRcdGlmICggdHlwZW9mIGNhbGxiYWNrICE9PSBcImZ1bmN0aW9uXCIgKSB7XG5cdFx0XHQvKiBqc2hpbnQgaWdub3JlOnN0YXJ0ICovXG5cdFx0XHRjb25zb2xlLmVycm9yKCBcIkZhaWxlZCB0byBwYXJzZSBzaG9ydGNvZGVzLiBFeHBlY3RlZCBwYXJhbWV0ZXIgdG8gYmUgYSBmdW5jdGlvbiwgaW5zdGVhZCByZWNlaXZlZCBcIiArIHR5cGVvZiBjYWxsYmFjayApO1xuXHRcdFx0LyoganNoaW50IGlnbm9yZTplbmQgKi9cblx0XHRcdHJldHVybiBmYWxzZTtcblx0XHR9XG5cblx0XHRpZiAoIHR5cGVvZiBzaG9ydGNvZGVzID09PSBcIm9iamVjdFwiICYmIHNob3J0Y29kZXMubGVuZ3RoID4gMCApIHtcblx0XHRcdGpRdWVyeS5wb3N0KCBhamF4dXJsLCB7XG5cdFx0XHRcdGFjdGlvbjogXCJ3cHNlb19maWx0ZXJfc2hvcnRjb2Rlc1wiLFxuXHRcdFx0XHRfd3Bub25jZTogd3BzZW9TaG9ydGNvZGVQbHVnaW5MMTBuLndwc2VvX2ZpbHRlcl9zaG9ydGNvZGVzX25vbmNlLFxuXHRcdFx0XHRkYXRhOiBzaG9ydGNvZGVzLFxuXHRcdFx0fSxcblx0XHRcdFx0ZnVuY3Rpb24oIHNob3J0Y29kZVJlc3VsdHMgKSB7XG5cdFx0XHRcdFx0dGhpcy5zYXZlUGFyc2VkU2hvcnRjb2Rlcyggc2hvcnRjb2RlUmVzdWx0cywgY2FsbGJhY2sgKTtcblx0XHRcdFx0fS5iaW5kKCB0aGlzIClcblx0XHRcdCk7XG5cdFx0fVxuXHRcdGVsc2Uge1xuXHRcdFx0cmV0dXJuIGNhbGxiYWNrKCk7XG5cdFx0fVxuXHR9O1xuXG5cdC8qKlxuXHQgKiBTYXZlcyB0aGUgc2hvcnRjb2RlcyB0aGF0IHdlcmUgcGFyc2VkIHdpdGggQUpBWCB0byBgdGhpcy5wYXJzZWRTaG9ydGNvZGVzYFxuXHQgKlxuXHQgKiBAcGFyYW0ge0FycmF5fSBzaG9ydGNvZGVSZXN1bHRzXG5cdCAqIEBwYXJhbSB7ZnVuY3Rpb259IGNhbGxiYWNrXG5cdCAqL1xuXHRZb2FzdFNob3J0Y29kZVBsdWdpbi5wcm90b3R5cGUuc2F2ZVBhcnNlZFNob3J0Y29kZXMgPSBmdW5jdGlvbiggc2hvcnRjb2RlUmVzdWx0cywgY2FsbGJhY2sgKSB7XG5cdFx0c2hvcnRjb2RlUmVzdWx0cyA9IEpTT04ucGFyc2UoIHNob3J0Y29kZVJlc3VsdHMgKTtcblx0XHRmb3IgKCB2YXIgaSA9IDA7IGkgPCBzaG9ydGNvZGVSZXN1bHRzLmxlbmd0aDsgaSsrICkge1xuXHRcdFx0dGhpcy5wYXJzZWRTaG9ydGNvZGVzLnB1c2goIHNob3J0Y29kZVJlc3VsdHNbIGkgXSApO1xuXHRcdH1cblxuXHRcdGNhbGxiYWNrKCk7XG5cdH07XG5cblx0d2luZG93LllvYXN0U2hvcnRjb2RlUGx1Z2luID0gWW9hc3RTaG9ydGNvZGVQbHVnaW47XG59KCkgKTtcbiJdfQ==
