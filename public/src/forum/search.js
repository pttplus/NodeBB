define('forum/search', function() {
	var	Search = {};

	Search.init = function() {
		var searchQuery = $('#post-results').attr('data-search-query');
		var regexes = [];
		var searchTerms = searchQuery.split(' ');
		for (var i=0; i<searchTerms.length; ++i) {
			var regex = new RegExp(searchTerms[i], 'gi');
			regexes.push({regex: regex, term: searchTerms[i]});
		}

		$('.search-result-text').each(function() {
			var result = $(this);
			var text = result.html();
			for(var i=0; i<regexes.length; ++i) {
				text = text.replace(regexes[i].regex, '<strong>' + regexes[i].term + '</strong>');
			}
			result.html(text).find('img').addClass('img-responsive');
		});

		$('#search-form input').val(searchQuery);

		$('#mobile-search-form').off('submit').on('submit', function() {
			var input = $(this).find('input');
			ajaxify.go('search/' + input.val(), null, 'search');
			input.val('');
			return false;
		});
	};

	return Search;
});
