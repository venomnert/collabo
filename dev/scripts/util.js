const _pipe = (f,g) => (...args) => g(f(...args));
export const pipe = (...funcs) => funcs.reduce(_pipe);

const getHtmlContent = (pageName) => {
  // Get the html content based on the page name
  if (pageName === 'findCollab' || pageName === 'findProject') {
    $('body').css('overflow-y', 'hidden');
  }
  return _.find(myApp.htmlPages, ['pageName', pageName]).htmlContent;
}
const renderPage = (htmlPage) => {
  // This function is responsible for dynamically rendering new pages of the application
  // And for initializing any plugins used by the page

  // Appends the based in html content to the main container
	$('.container').html(htmlPage);

	// The code is used to initialize the input tag for collaboration page
	if ($("#tags").exists()) {
		$('#tags').tagEditor({
			placeholder: 'Enter topics ...'
		});
	}
}
export const generateCard = (cardName) => {
  var cards = [];
	var $findCollabCard = $('<div>')
					.attr({
						'class': 'b-choice-card b-choice-card--findCollab',
						'data-cardName': 'findCollab'
					});
	var $findProjectCard = $('<div>')
					.attr({
						'class': 'b-choice-card b-choice-card--findProject',
						'data-cardName': 'findProject'
					});

	var $fc_logo = $('<img>')
					.attr({
						class: 'b-choice-card__logo b-choice-card__logo--findCollab',
						src: './img/findCollab_w.svg'
					});
	var $fp_logo = $('<img>')
					.attr({
						class: 'b-choice-card__logo b-choice-card__logo--findProject',
						src: './img/findProject.svg'
					});

	var $fc_heading = $('<h3>')
					.attr('class', 'b-choice-card__heading b-choice-card__heading--findCollab')
					.text('find your next collaborators');
	var $fp_heading = $('<h3>')
					.attr('class', 'b-choice-card__heading b-choice-card__heading--findProject')
					.text('Discover your next project');

	var $fc_p = $('<p>')
				.attr('class', 'b-choice-card__text b-choice-card__text--findCollab')
				.text("Find collaborators for your next project.");
	var $fp_p = $('<p>')
				.attr('class', 'b-choice-card__text b-choice-card__text--findProject')
				.text("Explore thousands of projects hosted on GitHub.");

  var $fc_command = $('<p>')
                    .attr('class', 'findCollab-command')
                    .text('Say "Search"');
  var $fp_command = $('<p>')
                    .attr('class', 'findProject-command')
                    .text('Say "Check"');

 	// Append content into each cards
	$findCollabCard.append($fc_logo, $fc_heading, $fc_p, $fc_command);
	$findProjectCard.append($fp_logo, $fp_heading, $fp_p, $fp_command);

	// Create card objects and added to an array
	// The array will be used to retrieve the appropriate card
	cards.push(
		{cardName: 'findCollab', card: $findCollabCard}
		,{cardName: 'findProject', card: $findProjectCard});
	return _.find(cards, ['cardName', cardName]).card;
}
const getPageAndRender = pipe(getHtmlContent, renderPage);
export const render = (pageName) => getPageAndRender(pageName);
export const cleanUrl = (url) => _.trimEnd(url, '/').replace('https://github.com/', '');
export const normalizeStrings = (arrayOfStrings) => {
  //always returns an array of strings or array of string that has been transformed to lowercase
  if (!Array.isArray(arrayOfStrings)) { return _.concat([],_.toLower(arrayOfStrings)); }
	else {
		return _.map(arrayOfStrings, (string) => {
			return _.toLower(string);
		});
	}
}
export const getMostUsedLanguage = (githubLangObject) => {
  return _.sortBy(
				_.filter(
					_.map(githubLangObject, (val, key) => {
							return {'language': normalizeStrings(key)[0], 'qty': val}
					}), (obj) => {
							 return _.indexOf(myApp.avoidLanguages, obj.language) < 0
					}), 'qty')[0].language;
}
export const emptyGifDiv = () => '<div class="nothing-gif" style="width:100%;height:100px;padding-bottom:56%;position:relative;"><iframe src="https://giphy.com/embed/y63H09ZvHJdf2" width="100%" height="70%" style="position:absolute" frameBorder="0" class="giphy-embed" allowFullScreen></iframe></div><p><a href="https://giphy.com/gifs/nothing-y63H09ZvHJdf2">via GIPHY</a></p>'
export const throttlePageContent = (updateContent) => {
  $(window).scroll(function () {
        if ($(document).height() <= $(window).scrollTop() + $(window).height()) {
        	console.log('almost at the bottom');
            updateContent();
        }
    });
}
export const removeTags = () => {
  var tags = $('#tags').tagEditor('getTags')[0].tags;
  for (var i = 0; i < tags.length; i++) { $('#tags').tagEditor('removeTag', tags[i]); }
  return tags;
}
