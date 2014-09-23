"use strict";
/*global ajaxify, templates*/

(function(ajaxify) {
	ajaxify.widgets = {};

	ajaxify.widgets.reposition = function(location) {
		$('body [no-widget-class]').each(function() {
			var $this = $(this);
			if ($this.attr('no-widget-target') === location) {
				$this.removeClass();
				$this.addClass($this.attr('no-widget-class'));
			}
		});
	};

	ajaxify.widgets.render = function(template, url, callback) {
		var widgetLocations = ['sidebar', 'footer', 'header'], numLocations;

		$('#content [widget-area]').each(function() {
			var location = $(this).attr('widget-area');
			if ($.inArray(location, widgetLocations) === -1) {
				widgetLocations.push(location);
			}
		});

		numLocations = widgetLocations.length;

		if (!numLocations) {
			ajaxify.widgets.reposition();
		}

		function renderWidgets(location) {
			var area = $('#content [widget-area="' + location + '"]'),
				areaData = {
					location: location,
					template: template + '.tpl',
					url: url
				};

			$.get(RELATIVE_PATH + '/api/widgets/render', areaData, function(renderedWidgets) {
				var html = '';

				for (var i=0; i<renderedWidgets.length; ++i) {
					html += templates.parse(renderedWidgets[i].html, {});
				}

				if (!area.length && window.location.pathname.indexOf('/admin') === -1 && renderedWidgets.length) {
					if (location === 'footer' && !$('#content [widget-area="footer"]').length) {
						$('#content').append($('<div class="col-xs-12"><div widget-area="footer"></div></div>'));
					} else if (location === 'sidebar' && !$('#content [widget-area="sidebar"]').length) {
						$('#content > *').wrapAll($('<div class="col-lg-9 col-xs-12"></div>'));
						$('#content').append($('<div class="col-lg-3 col-xs-12"><div widget-area="sidebar"></div></div>'));
					} else if (location === 'header' && !$('#content [widget-area="header"]').length) {
						$('#content').prepend($('<div class="col-xs-12"><div widget-area="header"></div></div>'));
					}

					area = $('#content [widget-area="' + location + '"]');
				}

				area.html(html);

				if (!renderedWidgets.length) {
					area.addClass('hidden');
					ajaxify.widgets.reposition(location);
				}

				$('#content [widget-area] img:not(.user-img)').addClass('img-responsive');
				checkCallback();
			});
		}

		function checkCallback() {
			numLocations--;
			if (numLocations < 0) {
				$(window).trigger('action:widgets.loaded', {});
				if (typeof callback === 'function') {
					callback();
				}
			}
		}

		for (var i=0; i<widgetLocations.length; ++i) {
			renderWidgets(widgetLocations[i]);
		}

		checkCallback();
	};
}(ajaxify || {}));
