// Provide the best match
// Provide voice query

var myApp = {};

// myApp variables
myApp.urlPrefix = 'https://api.github.com';
myApp.acceptHeaderStable = 'application/vnd.github.v3+json';
myApp.acceptHeaderUnstable = 'application/vnd.github.mercy-preview+json'
myApp.htmlPages = []; // contains all pages for app (collabOrProject, findCollab, findProject)

myApp.userUrl = ''; // User's project url
myApp.userSearchTopics = []; // Topics searched by user which is used to find collaboration
myApp.allCollab = []; // Get all the collaborators from the top 5 return repos

myApp.avoidLanguages = ['css', 'html', 'html5', 'css3']; // Github returns more result for programming languages
myApp.userUrlInfo = ''; // Meta info retrieved from user's repo url
// myApp.urlRepos = [];
// myApp.topicRepos = [];

// Create all my pages
// Render the the first page collabOrProject
myApp.init = function() {
	this.createPages();
	this.renderPage(this.getHtmlContent('collabOrProject'));
}

// Retrieve the returned page object and store in my array of pages
myApp.createPages = function() {
	this.htmlPages.push(this.collabOrProject());
	this.htmlPages.push(this.findCollab());
	this.htmlPages.push(this.findProject());
}

// This function is responsible for dynamically rendering
// new pages of the application
myApp.renderPage = function(htmlPage) {
	$('.container').html(htmlPage);
	if ($("#tags").exists()) {
		$('#tags').tagEditor({
			placeholder: 'Enter topics ...'
		});
	}
}

// Get the html content based on the page name
myApp.getHtmlContent = function(pageName) {
	if (pageName === 'findCollab' || pageName === 'findProject') {
		$('body').css('overflow-y', 'hidden');
	}
	return _.find(this.htmlPages, ['pageName', pageName]).htmlContent;
}

// Displays the choices and setup action listener
// Based on the card chosen display the appropriate web page
myApp.collabOrProject = function() {
	var $section = $('<section>')
				.attr('class', 'b-collab-or-project wrapper-lg');

	var $cardContainer = $('<div>')
							.attr('class', 'card-container');
	var $findCollabCard = $('<a>')
							.append(this.generateCard('findCollab'))
							.attr('class', 'card-container__card');

	var $findProjectCard = $('<a>')
							.append(this.generateCard('findProject'))
							.attr('class', 'card-container__card');
	$cardContainer.append($findCollabCard, $findProjectCard);
	$section.append($cardContainer);


	$('.container').unbind('click');
	$('.container').on('click', '.b-choice-card', (e) => {
		// Remove header
		$('.b-app-info').remove();
		var pageName = e.currentTarget.getAttribute('data-cardName');
		// console.log(pageName);
		$('.container').unbind('click');
		this.renderPage(this.getHtmlContent(pageName));
	});
	return {pageName: 'collabOrProject', htmlContent: $section};
}
myApp.handleCollabOrProject = function(pageName) {
	console.log('this', this);
	// Remove header
	$('.b-app-info').remove();
	$("#tags").remove();
	$('.container').unbind('click');
	this.renderPage(this.getHtmlContent(pageName));
}
myApp.generateCard = function (cardName) {
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

 	// Append content into each cards
	$findCollabCard.append($fc_logo, $fc_heading, $fc_p);
	$findProjectCard.append($fp_logo, $fp_heading, $fp_p);

	// Create card objects and added to an array
	// The array will be used to retrieve the appropriate card
	cards.push(
		{cardName: 'findCollab', card: $findCollabCard}
		,{cardName: 'findProject', card: $findProjectCard});
	return _.find(cards, ['cardName', cardName]).card;
}

myApp.findCollab = function() {
	var inputs = [];
	var currInputType = 'topic';

	var $section = $('<section>')
				.attr('class', 'b-findCollab-page');
	var $searchSeaction = $('<div>')
							.attr('class', 'b-findCollab-page__search');
	var $collabListSeaction = $('<div>')
							.attr('class', 'b-findCollab-page__collab-list');

	var $heading = $('<h2>')
					.attr('class', 'b-findCollab-page__heading')
					.append('Choose your Collaborators');

	var urlSearchInput = $('<input autofocus>')
							.attr({
								type: 'url',
								name: 'url-input',
								placeholder: 'url...',
								class: 'b-input-container--url-input'
							});
	var topicSearchInput = $('<input name="tags" id="tags"/>')
							.attr('class', 'b-input-container--topic-input');
	inputs.push(urlSearchInput, topicSearchInput);


	var urlButtonTab = $('<button>')
						.attr({
							name: 'url',
							class: 'b-tab__url'
						})
						.append('URL');
	var topicButtonTab = $('<button>')
						.attr({
							name: 'topic',
							class: 'b-tab__topic'
						})
						.append('Topics');
	var inputTabContainer = $('<div>')
							.attr('class', 'b-tab wrapper-lg')
							.on('click', 'button', (e) => {
								// Clear list when changing input type
								$('.collab-list').empty();

								let inputType = e.currentTarget.name;
								if (inputType === 'topic') {
									if (!$('.b-input-container--topic-input').exists()) {
										$('.b-input-container--url-input').detach();
										$('.b-input-container').append(inputs[1]);
										$('#tags').tagEditor();
									}
									currInputType = 'topic';
								}
								else {
									if (!$('.b-input-container--url-input').exists()) {
										$('.b-input-container--topic-input').detach();
										$('.tag-editor').remove();
										$('.b-input-container').append(inputs[0]);
									}
									currInputType = 'url';
								}
							});
	inputTabContainer.append(urlButtonTab, topicButtonTab);

	var searchOptionContainer = $('<div>')
								.attr('class', 'b-input-container wrapper-lg')
								.append(inputs[1])
								.on('keyup', 'input', (e) => {
									if(e.keyCode === 13) {
										// Clear list when a new search is made
										$('.collab-list').empty();

										// Add loading gif
										$('.collab-list').append('<img class="loading-gif" src="./img/box.gif">');

										if (currInputType === 'url') {
											// First trim any ending '/' then remove prefix url 'https://github.com/'
											// Then by splitting the remaining url we will end up with the [user, repo]
											// Which we then join together to produce user/repo
											// https://github.com/gatsbyjs/gatsby
											this.userUrl = _.trimEnd($('.b-input-container--url-input').val(), '/')
															.replace('https://github.com/', '');
											// console.log('parsed url', this.userUrl);

											$('.b-input-container--url-input').val('');
											this.fetchFromUrl();
										}
										else {
											// Remove all tags and return them
											this.userSearchTopics = this.removeTags();
											this.fetchReposGithub('topics', '', this.userSearchTopics);
										}
									}
								});

	var $collaboratorList = $('<ul>')
							.attr('class', 'collab-list wrapper-lg');

	var $ajaxDiv = $('<div>')
					.attr('class', 'ajax-div')
					.css({
						position: 'absolute',
						bottom: '-10px',
						height: '1px',
						width: '1px'
					});

	$searchSeaction.append(searchOptionContainer, inputTabContainer);
	$collabListSeaction.append($heading, $collaboratorList)
	$section.append($searchSeaction, $collabListSeaction, $ajaxDiv);

	return {pageName: 'findCollab', htmlContent: $section}
}
myApp.removeTags = function() {
	var tags = $('#tags').tagEditor('getTags')[0].tags;
	for (i = 0; i < tags.length; i++) { $('#tags').tagEditor('removeTag', tags[i]); }
	return tags;
}
//Create the html for findProject pages
myApp.findProject = function() {
	var $section = $('<section>')
				.attr('class', 'b-findProject-page');

	var $searchSeaction = $('<div>')
							.attr('class', 'b-findProject-page__search');

	var $projectListSeaction = $('<div>')
							.attr('class', 'b-findProject-page__project-list');

	var $heading = $('<h2>')
					.attr('class', 'b-findProject-page__heading')
					.append('Find Project');

	var topicSearchInput = $('<input name="tags" id="tags"/>')
							.attr('class', 'b-input-container b-input-container--topic-input');

	var searchOptionContainer = $('<div>')
								.attr('class', 'b-input-container--project wrapper-lg')
								.append(topicSearchInput)
								.on('keyup', (e) => {
									if(e.keyCode === 13) {
										// Clear list when a new search is made
										$('.project-list').empty();

										// Add loading gif
										$('.project-list').append('<img class="loading-gif" src="./img/box-project.gif">');

										// Remove all tags and return them
										this.userSearchTopics = this.removeTags();
										this.fetchReposGithub('topics', '', this.userSearchTopics, 'project');
									}
								});

	var $projectList = $('<ul>')
							.attr('class', 'project-list wrapper-lg');

	$searchSeaction.append(searchOptionContainer);
	$projectListSeaction.append($heading, $projectList);

	var $ajaxDiv = $('<div>')
					.attr('class', 'ajax-div')
					.css({
						position: 'absolute',
						bottom: '-10px',
						height: '1px',
						width: '1px'
					});

	$section.append($searchSeaction, $projectListSeaction, $ajaxDiv);

	return {pageName: 'findProject', htmlContent: $section};
}
myApp.fetchUrlInfo = function(newUrl, query) {
	let url = `${this.urlPrefix}/repos/${this.userUrl}`;
	if (query !== undefined && newUrl === false) {
		url = `${this.urlPrefix}/repos/${this.userUrl}/${query}`;
	}
	if (newUrl !== undefined && query === false) {
		url = newUrl;
	}
	// console.log(url);
	return $.ajax({
		headers: {
			Accept: this.acceptHeaderUnstable
		},
		url: url,
		type: 'GET',
		dataType: 'json',
	});
}
myApp.fetchFromUrl = function() {
	$.when(this.fetchUrlInfo(false))
	.then( (urlInfo) => {
		this.userUrlInfo = urlInfo;
		let primaryLanguage = this.normalizeStrings(urlInfo.language)[0];
		if (_.indexOf(this.avoidLanguages, primaryLanguage) >= 0) {
			return this.fetchUrlInfo(false, 'languages');
		}
		else {
			return primaryLanguage;
		}
	})
	.then((primaryLanguage) => {
		let language = primaryLanguage;
		if (typeof language != 'string') {
			language = this.getMostUsedLanguage(primaryLanguage);
		}
		// Make sure remove any topics that is specific to the user repo
		// This allows for a more general search result
		let topics = _.difference(this.normalizeStrings(this.userUrlInfo.topics), this.normalizeStrings(this.userUrl.split('/')));
		this.fetchReposGithub('url', language, topics);
	});

}
myApp.fetchRepos = function(query) {
	return $.ajax({
		headers: {
			Accept: this.acceptHeaderUnstable
		},
		url: `${this.urlPrefix}/search/repositories?q=${query}`,
		type: 'GET',
		dataType: 'json'
	})
	.catch((err) => {
		alert('Error with search.');
	})
}
myApp.fetchReposGithub = function(type, primaryLanguage, topics, content) {
	if (type === 'url') {
			// repos = 'q=string1+string2+...+stringN+in:name,description+language:lang1+topic:topic1+topic2+...+topicN';
			// topic is optional topic:${_.join(topics,'+topic:')} is
			let lookIn = ['name', 'description', 'readme'];
			let query = `${_.join(topics, '+')}+in:${_.join(lookIn, ',')}+language:${primaryLanguage}`;
			// console.log(query);
			$.when(this.fetchRepos(query))
			.then((data) => {
				if (data.length !=0 ) {
					this.fetchCollab(data);
				}
				else {
					$('.collab-list').empty();
					$('.collab-list').append('<div class="nothing-gif"  style="width:100%;height:100px;padding-bottom:56%;position:relative;"><iframe src="https://giphy.com/embed/y63H09ZvHJdf2" width="100%" height="70%" style="position:absolute" frameBorder="0" class="giphy-embed" allowFullScreen></iframe></div><p><a href="https://giphy.com/gifs/nothing-y63H09ZvHJdf2">via GIPHY</a></p>');
				}
			});
	}
	else {
		// console.log('topic', topics);
		// repos = 'q=string1+string2+...+stringN+in:name,description+language:lang1+topic:topic1+topic2+...+topicN';
		// topic is optional topic:${_.join(topics,'+topic:')} is
		let lookIn = ['name', 'description', 'readme'];
		let query = `${_.join(topics, '+')}+in:${_.join(lookIn, ',')}`;
		// console.log(query);
		if (content !== 'project' || content === undefined) {
			$.when(this.fetchRepos(query))
			.then((data) => {
				if (data.items.length !=0 ) {
					this.fetchCollab(data);
				}
				else {
					$('.collab-list').empty();
					$('.collab-list').append('<div class="nothing-gif" style="width:100%;height:100px;padding-bottom:56%;position:relative;"><iframe src="https://giphy.com/embed/y63H09ZvHJdf2" width="100%" height="70%" style="position:absolute" frameBorder="0" class="giphy-embed" allowFullScreen></iframe></div><p class="nothing-p"><a href="https://giphy.com/gifs/nothing-y63H09ZvHJdf2">via GIPHY</a></p>');
				}
			});
		}
		else {
			$.when(this.fetchRepos(query))
			.then((data) => {
				if (data.items.length != 0) {
					// Allow overflow-y so ajax loading can function
					$('body').css('overflow-y', 'scroll');

					// Remove the loading gif
					$('.loading-gif').remove();
					$('.nothing-gif').remove();
					$('.nothing-p').remove();

					// Add header
					$('.b-findProject-page__heading').css('visibility', 'visible');
					$(window).unbind('scroll');
					let callback = this.updateProjectList(data.items);
					callback();
					this.throttlePageContent(callback);
					console.log('done fetching');
				}
				else {
					$('.project-list').empty();
					$('.project-list').append('<div class="nothing-gif" style="width:100%;height:100px;padding-bottom:56%;position:relative;"><iframe src="https://giphy.com/embed/y63H09ZvHJdf2" width="100%" height="70%" style="position:absolute" frameBorder="0" class="giphy-embed" allowFullScreen></iframe></div><p class="nothing-p"><a href="https://giphy.com/gifs/nothing-y63H09ZvHJdf2">via GIPHY</a></p>');
				}
			});
		}
	}
}
// Fetch all git users who have contributed to
// repos similar to passed in query values
myApp.fetchCollab = function(data) {
	let topRepos = data.items;
	let contributorList = [];

	if (topRepos.length < 5){
		// Find contributors from the repos when the result is less than 5
		for (let i = 0; i < topRepos.length; i++) {
			contributorList.push(this.fetchUrlInfo(topRepos[i].contributors_url, false));
		}
	}
	else {
		// Find contributors from the repos when the result is more than 5
		for (let i = 0; i < 5; i++) {
			contributorList.push(this.fetchUrlInfo(topRepos[i].contributors_url, false));
		}
	}
	Promise.all(contributorList)
	.then((data) => {
		// Allow overflow-y so ajax loading can function
		$('body').css('overflow-y', 'scroll');

		// Remove the loading gif
		$('.loading-gif').remove();
		$('.nothing-gif').remove();
		$('.nothing-p').remove();

		// Add header
		$('.b-findCollab-page__heading').css('visibility', 'visible');
		// Have to clear any previous scroll handlers
		$(window).unbind('scroll');
		let callback = this.updateCollabList(_.flatten(data));
		callback();
		this.throttlePageContent(callback);
	})
	.catch((err) => {
		console.log('error getting contributors');
	});
}

// Either the passed in data is filtered
// and add the data to the dom
// or the data is not filtered, so it needs
// to be filtered, then added to the dom
myApp.updateCollabList = function(collaborators) {
	var prev = 0;
	var next = 0;
	console.log('top', collaborators);
	return () => {
		// Remove previous collaborator list
		prev = next;
		next+=6;
		let currentCollaborators = []
		console.log('all', collaborators);
		console.log('prev', prev, 'next', next);

		if (next <= collaborators.length) {
			currentCollaborators = _.slice(collaborators, prev, next);
		}
		else {
			currentCollaborators = _.slice(collaborators, prev, collaborators.length);
		}

		// console.log('current list', currentCollaborators);
		_.forEach(currentCollaborators, (collaborator) => {
			let $li = $('<li>')
					.attr('class', 'collab-list__item')
					.append(this.generateUserCard(collaborator));

			$('.collab-list').append($li);
		});
	}
}

myApp.updateProjectList = function(projects) {
	var prev = 0;
	var next = 0;

	return () => {
		prev = next;
		next+=6;
		let currentProjects = []
		console.log('all', projects);
		console.log('prev', prev, 'next', next);

		if (next <= projects.length) {
			currentProjects = _.slice(projects, prev, next);
		}
		else {
			currentProjects = _.slice(projects, prev, projects.length);
		}

		console.log('current list', currentProjects);
		_.forEach(currentProjects, (project) => {
			let $li = $('<li>')
					.attr('class', 'project-list__item')
					.append(this.generateProjectCard(project));

			$('.project-list').append($li);
		});
	}
}
myApp.generateUserCard = function(c) {
	var $div = $('<div>')
				.attr('class', 'user-card')

	var $avatar = $('<img>')
					.attr('class', 'user-card__avatar')
					.attr('src', c.avatar_url);

	var $userInfo = $('<div>')
					.attr('class', 'user-info');
	var $userName = $('<h3>')
					.attr('class', 'user-info__username')
					.text(c.login);
	var $userLink = $('<a>')
					.attr({
						class: 'user-info__link',
						href: c.html_url,
						target: '_blank'
					})
					.text('View Profile');

	$userInfo.append($userName, $userLink);
	$div.append($avatar, $userInfo);
	return $div;
}
myApp.generateProjectCard = function(p) {
	var status = ['forks', 'stargazers_count', 'watchers']
	var $link = $('<a>')
				.attr({
					class: 'project-link',
					href: `${p.html_url}`,
					target: '_blank'
				});
	var $div = $('<div>')
				.attr('class', 'project-card')

	var $avatar = $('<img>')
					.attr('class', 'project-card__avatar')
					.attr('src', p.owner.avatar_url);

	var $projectName = $('<h3>')
						.attr('class', 'project-card__projectName')
						.text(p.name);

	var $projectPopularityList = $('<ul>')
								.attr('class', 'project-pop-list');
	for (let i = 0; i < 3; i++) {
		let $li = $('<li>')
					.attr('class', 'project-pop-list__item');
		let $popItem = $('<div>')
						.attr('class', `pop-item pop-item--${status[i]}`);
		let $h5 = $('<h5>')
					.attr('class', 'pop-item__heading')
					.append(`${status[i]}:`);
		let $p = $('<p>')
					.attr('class', 'pop-item__qty')
					.append(`${p[status[i]]}`);

		$popItem.append($h5, $p);
		$li.append($popItem);
		$projectPopularityList.append($li);
	}
	$div.append($avatar, $projectName, $projectPopularityList);
	$link.append($div);
	return $link;

}
//always returns an array of strings or array of string
myApp.normalizeStrings = function(arrayOfStrings) {
	if (!Array.isArray(arrayOfStrings)) {
		return _.concat([],_.toLower(arrayOfStrings));
	}
	else {
		return _.map(arrayOfStrings, (string) => {
			return _.toLower(string);
		});
	}
}
myApp.getMostUsedLanguage = function(githubLangObject) {
	return _.sortBy(
				_.filter(
					_.map(githubLangObject, (val, key) => {
							return {'language': this.normalizeStrings(key)[0], 'qty': val}
					}), (obj) => {
							 return _.indexOf(this.avoidLanguages, obj.language) < 0
					}), 'qty')[0].language;
}
myApp.throttlePageContent = function(updateContent) {
	$(window).scroll(function () {
        if ($(document).height() <= $(window).scrollTop() + $(window).height()) {
        	console.log('almost at the bottom');
            updateContent();
        }
    });
}
myApp.voiceSearch = function(topics, content) {
	console.log('inside', topics)
	if (content === 'project') {
		this.fetchReposGithub('topics', '', topics, content);
	}
	else {
		this.fetchReposGithub('topics', '', topics);
	}
}

$(function(){
	// Credits goes Magnar from
	// https://stackoverflow.com/questions/920236/how-can-i-detect-if-a-selector-returns-null
	$.fn.exists = function () { return this.length !== 0; }

	// Initialize myApp object
	myApp.init();

	// After initializing myApp setup voice recognition
	if (annyang) {

	  // Define voice commands and its appropriate function
	  var commands = {
	  	'hello *collabo': function() {
	  		$('#greeting')[0].play();
	  	},

	    'find *action':  function(action) {
	    	console.log('finding ', action);
	    	$('#find')[0].play();
	    	// Render findCollab Page
	    	myApp.handleCollabOrProject('findCollab');
	    },
	    'search *action':  function(action) {
	    	console.log('searching ', action);
		    $('#search')[0].play();
		    // Render findSearch Page
	    	myApp.handleCollabOrProject('findProject');
	    },
	    'project topics *action':  function(action) {
	    	console.log('topics ');
	    	$('#searching')[0].play();

	    	// Executed topic search for project
	    	myApp.voiceSearch(_.split(action, " "), "project");
	    	setTimeout(() => $('#finito')[0].play(), 1000);
	    },
	    'topics *action':  function(action) {
	    	console.log('topics ');
	    	$('#searching')[0].play();
	    	// Executed topic search for collaborators
	    	myApp.voiceSearch(_.split(action, " "));
	    	setTimeout(() => $('#finito')[0].play(), 1000);
	    },

	  };

	  // Add my commands to annyang
	  annyang.addCommands(commands);

	  // Start listening. You can call this here, or attach this call to an event, button, etc.
	  annyang.start();
	}
});
