(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
'use strict';

var _util = require('./util');

var myApp = {};

// myApp variables
// Project Scope:
// Provide the best match
// Provide voice query
myApp.urlPrefix = 'https://api.github.com';
myApp.acceptHeaderStable = 'application/vnd.github.v3+json';
myApp.acceptHeaderUnstable = 'application/vnd.github.mercy-preview+json';
myApp.htmlPages = []; // contains all pages for app (collabOrProject, findCollab, findProject)

myApp.userUrl = ''; // User's project url
myApp.userSearchTopics = []; // Topics searched by user which is used to find collaboration

myApp.avoidLanguages = ['css', 'html', 'html5', 'css3']; // Github returns more result for programming languages
myApp.userUrlInfo = ''; // Meta info retrieved from user's repo url

// Create all my pages
// Render the the first page collabOrProject
myApp.init = function () {
	this.createPages();
	(0, _util.render)('collabOrProject');
};

// Retrieve the returned page object and store in my array of pages
myApp.createPages = function () {
	this.htmlPages.push(this.collabOrProject());
	this.htmlPages.push(this.findCollab());
	this.htmlPages.push(this.findProject());
};

// Displays the choices and setup action listener
// Based on the card chosen display the appropriate web page
myApp.collabOrProject = function () {
	// Remove any previous listeners attached to the container
	$('.container').unbind('click');

	// Create the html content for the home page
	var $section = $('<section>').attr('class', 'b-collab-or-project wrapper-lg');
	var $cardContainer = $('<div>').attr('class', 'card-container');
	var $findCollabCard = $('<a>').append((0, _util.generateCard)('findCollab')).attr('class', 'card-container__card');
	var $findProjectCard = $('<a>').append((0, _util.generateCard)('findProject')).attr('class', 'card-container__card');
	$cardContainer.append($findCollabCard, $findProjectCard);
	$section.append($cardContainer);
	// Setup the click event for the collaboration and project pages
	$('.container').on('click', '.b-choice-card', function (e) {
		// Remove header
		$('.b-app-info').remove();
		var pageName = e.currentTarget.getAttribute('data-cardName');
		// console.log(pageName);

		// Once again remove previous click events attached to the container
		$('.container').unbind('click');
		// Render the clicked page
		(0, _util.render)(pageName);

		// Display voice command if it is turned on
		if (annyang.isListening()) {
			$('.' + pageName + '-search-command').css("opacity", 1);
		}
	});
	return { pageName: 'collabOrProject', htmlContent: $section };
};
myApp.handleCollabOrProject = function (pageName) {
	// console.log('this', this);
	// Remove header
	$('.b-app-info').remove();
	$("#tags").remove();
	$('.container').unbind('click');
	// Display voice command if it is turned on
	(0, _util.render)(pageName);
	if (annyang.isListening()) {
		$('.' + pageName + '-search-command').css("opacity", 1);
	}
};

myApp.findCollab = function () {
	var _this = this;

	var inputs = [];
	var currInputType = 'topic';

	var $section = $('<section>').attr('class', 'b-findCollab-page');
	var $searchSeaction = $('<div>').attr('class', 'b-findCollab-page__search');
	var $collabListSeaction = $('<div>').attr('class', 'b-findCollab-page__collab-list');

	var $heading = $('<h2>').attr('class', 'b-findCollab-page__heading').append('Choose your Collaborators');

	var urlSearchInput = $('<input autofocus>').attr({
		type: 'url',
		name: 'url-input',
		placeholder: 'url...',
		class: 'b-input-container--url-input'
	});
	var topicSearchInput = $('<input name="tags" id="tags"/>').attr('class', 'b-input-container--topic-input');
	inputs.push(urlSearchInput, topicSearchInput);

	// This section is for controlling the toggle between url or topic search
	var urlButtonTab = $('<button>').attr({
		name: 'url',
		class: 'b-tab__url'
	}).append('Url');
	var topicButtonTab = $('<button>').attr({
		name: 'topic',
		class: 'b-tab__topic'
	}).append('Topics');
	var inputTabContainer = $('<div>').attr('class', 'b-tab wrapper-lg').on('click', 'button', function (e) {
		// Clear list when changing input type
		$('.collab-list').empty();

		var inputType = e.currentTarget.name;
		if (inputType === 'topic') {
			if (!$('.b-input-container--topic-input').exists()) {
				$('.b-input-container--url-input').detach();
				$('.b-input-container').append(inputs[1]);
				$('#tags').tagEditor();
			}
			currInputType = 'topic';
		} else {
			if (!$('.b-input-container--url-input').exists()) {
				$('.b-input-container--topic-input').detach();
				$('.tag-editor').remove();
				$('.b-input-container').append(inputs[0]);
			}
			currInputType = 'url';
		}
	});

	inputTabContainer.append(urlButtonTab, topicButtonTab);

	var searchOptionContainer = $('<div>').attr('class', 'b-input-container wrapper-lg').append(inputs[1]).on('keyup', 'input', function (e) {
		if (e.keyCode === 13) {
			// Clear list when a new search is made
			$('.collab-list').empty();

			// Add loading gif
			$('.collab-list').append('<img class="loading-gif" src="./img/box.gif">');

			if (currInputType === 'url') {
				// First trim any ending '/' then remove prefix url 'https://github.com/'
				// Then by splitting the remaining url we will end up with the [user, repo]
				// Which we then join together to produce user/repo
				// https://github.com/gatsbyjs/gatsby
				_this.userUrl = (0, _util.cleanUrl)($('.b-input-container--url-input').val());
				// console.log('parsed url', this.userUrl);

				$('.b-input-container--url-input').val('');
				_this.fetchFromUrl();
			} else {
				// Remove all tags and return them
				_this.userSearchTopics = (0, _util.removeTags)();
				_this.fetchReposGithub('topics', '', _this.userSearchTopics);
			}
		}
	});

	var $collaboratorList = $('<ul>').attr('class', 'collab-list wrapper-lg');

	var $searchCommand = $('<p>').attr('class', 'findCollab-search-command').text('Say "Topics \'react, redux, github, etc...\' "');

	var $ajaxDiv = $('<div>').attr('class', 'ajax-div').css({
		position: 'absolute',
		bottom: '-10px',
		height: '1px',
		width: '1px'
	});

	var $homePageBtn = $('<a class="back-btn" href="https://venomnert.github.io/collabo">home</a>');

	$searchSeaction.append(searchOptionContainer, inputTabContainer);
	$collabListSeaction.append($heading, $collaboratorList);
	$section.append($homePageBtn, $searchSeaction, $searchCommand, $collabListSeaction, $ajaxDiv);

	return { pageName: 'findCollab', htmlContent: $section };
};
//Create the html for findProject pages
myApp.findProject = function () {
	var _this2 = this;

	// Create a html content for project page
	var $section = $('<section>').attr('class', 'b-findProject-page');
	var $searchSeaction = $('<div>').attr('class', 'b-findProject-page__search');
	var $projectListSeaction = $('<div>').attr('class', 'b-findProject-page__project-list');
	var $heading = $('<h2>').attr('class', 'b-findProject-page__heading').append('Find Project');
	var topicSearchInput = $('<input name="tags" id="tags"/>').attr('class', 'b-input-container b-input-container--topic-input');
	var searchOptionContainer = $('<div>').attr('class', 'b-input-container--project wrapper-lg').append(topicSearchInput).on('keyup', function (e) {
		if (e.keyCode === 13) {
			// Clear list when a new search is made
			$('.project-list').empty();

			// Add loading gif
			$('.project-list').append('<img class="loading-gif" src="./img/box-project.gif">');

			// Remove all tags and return them
			_this2.userSearchTopics = (0, _util.removeTags)();
			_this2.fetchReposGithub('topics', '', _this2.userSearchTopics, 'project');
		}
	});
	var $projectList = $('<ul>').attr('class', 'project-list wrapper-lg');
	$searchSeaction.append(searchOptionContainer);
	$projectListSeaction.append($heading, $projectList);

	var $ajaxDiv = $('<div>').attr('class', 'ajax-div').css({
		position: 'absolute',
		bottom: '-10px',
		height: '1px',
		width: '1px'
	});
	var $searchCommand = $('<p>').attr('class', 'findProject-search-command').text('Say "Project Topics \'react, redux, github, etc...\' "');
	var $homePageBtn = $('<a class="back-btn" href="https://venomnert.github.io/collabo">home</a>');

	$section.append($homePageBtn, $searchSeaction, $searchCommand, $projectListSeaction, $ajaxDiv);
	return { pageName: 'findProject', htmlContent: $section };
};

myApp.fetchUrlInfo = function (newUrl, query) {
	var url = this.urlPrefix + '/repos/' + this.userUrl;
	if (newUrl === false && query !== undefined) {
		url = this.urlPrefix + '/repos/' + this.userUrl + '/' + query;
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
		dataType: 'json'
	});
};
myApp.fetchFromUrl = function () {
	var _this3 = this;

	$.when(this.fetchUrlInfo(false)).then(function (urlInfo) {
		// check to see if the returned language for
		// the user repo is a programming language. If not make a request for all the languages
		// related to the project
		_this3.userUrlInfo = urlInfo;
		var primaryLanguage = (0, _util.normalizeStrings)(urlInfo.language)[0];
		if (_.indexOf(_this3.avoidLanguages, primaryLanguage) >= 0) {
			return _this3.fetchUrlInfo(false, 'languages');
		} else {
			return primaryLanguage;
		}
	}).catch(function (err) {
		// handle error with fetching url
		$('.collab-list').empty();
		$('.collab-list').append((0, _util.emptyGifDiv)());
	}).then(function (primaryLanguage) {
		var language = primaryLanguage;
		if (typeof language != 'string') {
			language = (0, _util.getMostUsedLanguage)(primaryLanguage);
		}
		// Make sure to remove any topics that is specific to the user repo
		// This allows for a more general search result
		var topics = _.difference((0, _util.normalizeStrings)(_this3.userUrlInfo.topics), (0, _util.normalizeStrings)(_this3.userUrl.split('/')));
		_this3.fetchReposGithub('url', language, topics);
	});
};
myApp.fetchRepos = function (query) {
	return $.ajax({
		headers: {
			Accept: this.acceptHeaderUnstable
		},
		url: this.urlPrefix + '/search/repositories?q=' + query,
		type: 'GET',
		dataType: 'json'
	}).catch(function (err) {
		alert('Error with search.');
	});
};
myApp.fetchReposGithub = function (type, primaryLanguage, topics, content) {
	var _this4 = this;

	if (type === 'url') {
		// repos = 'q=string1+string2+...+stringN+in:name,description+language:lang1+topic:topic1+topic2+...+topicN';
		// topic is optional topic:${_.join(topics,'+topic:')} is
		var lookIn = ['name', 'description', 'readme'];
		var query = _.join(topics, '+') + '+in:' + _.join(lookIn, ',') + '+language:' + primaryLanguage;
		// console.log(query);
		$.when(this.fetchRepos(query)).then(function (data) {
			if (data.length != 0) {
				_this4.fetchCollab(data);
			} else {
				$('.collab-list').empty();
				$('.collab-list').append((0, _util.emptyGifDiv)());
			}
		});
	} else {
		// console.log('topic', topics);
		// repos = 'q=string1+string2+...+stringN+in:name,description+language:lang1+topic:topic1+topic2+...+topicN';
		// topic is optional topic:${_.join(topics,'+topic:')} is
		var _lookIn = ['name', 'description', 'readme'];
		var _query = _.join(topics, '+') + '+in:' + _.join(_lookIn, ',');
		// console.log(query);
		if (content !== 'project' || content === undefined) {
			$.when(this.fetchRepos(_query)).then(function (data) {
				if (data.items.length != 0) {
					_this4.fetchCollab(data);
				} else {
					$('.collab-list').empty();
					$('.collab-list').append((0, _util.emptyGifDiv)());
				}
			});
		} else {
			$.when(this.fetchRepos(_query)).then(function (data) {
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
					var callback = _this4.updateProjectList(data.items);
					callback();
					(0, _util.throttlePageContent)(callback);
					console.log('done fetching');
				} else {
					$('.project-list').empty();
					$('.project-list').append((0, _util.emptyGifDiv)());
				}
			});
		}
	}
};
// Fetch all git users who have contributed to
// repos similar to passed in query values
myApp.fetchCollab = function (data) {
	var _this5 = this;

	var topRepos = data.items;
	// console.log('related repos', topRepos);
	var contributorList = [];

	if (topRepos.length < 5) {
		// Find contributors from the repos when the result is less than 5
		for (var i = 0; i < topRepos.length; i++) {
			contributorList.push(this.fetchUrlInfo(topRepos[i].contributors_url, false));
		}
	} else {
		// Find contributors from the repos when the result is more than 5
		for (var _i = 0; _i < 5; _i++) {
			contributorList.push(this.fetchUrlInfo(topRepos[_i].contributors_url, false));
		}
	}
	Promise.all(contributorList).then(function (data) {
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
		var callback = _this5.updateCollabList(_.flatten(data));
		// Append the first 6 results and then pass the responsiblity to
		// the throttle function
		callback();
		(0, _util.throttlePageContent)(callback);
	}).catch(function (err) {
		console.log('error getting contributors');
	});
};

// Either the passed in data is filtered
// and add the data to the dom
// or the data is not filtered, so it needs
// to be filtered, then added to the dom
myApp.updateCollabList = function (collaborators) {
	var _this6 = this;

	var prev = 0;
	var next = 0;
	// console.log('top', collaborators);
	return function () {
		// Remove previous collaborator list
		prev = next;
		next += 6;
		var currentCollaborators = [];
		// console.log('all', collaborators);
		// console.log('prev', prev, 'next', next);

		if (next <= collaborators.length) {
			currentCollaborators = _.slice(collaborators, prev, next);
		} else {
			currentCollaborators = _.slice(collaborators, prev, collaborators.length);
		}

		// console.log('current list', currentCollaborators);
		_.forEach(currentCollaborators, function (collaborator) {
			var $li = $('<li>').attr('class', 'collab-list__item').append(_this6.generateUserCard(collaborator));

			$('.collab-list').append($li);
		});
	};
};
myApp.updateProjectList = function (projects) {
	var _this7 = this;

	var prev = 0;
	var next = 0;

	return function () {
		prev = next;
		next += 6;
		var currentProjects = [];
		// console.log('all', projects);
		console.log('prev', prev, 'next', next);

		if (next <= projects.length) {
			currentProjects = _.slice(projects, prev, next);
		} else {
			currentProjects = _.slice(projects, prev, projects.length);
		}

		// console.log('current list', currentProjects);
		_.forEach(currentProjects, function (project) {
			var $li = $('<li>').attr('class', 'project-list__item').append(_this7.generateProjectCard(project));

			$('.project-list').append($li);
		});
	};
};
myApp.generateUserCard = function (c) {
	var $div = $('<div>').attr('class', 'user-card');

	var $avatar = $('<img>').attr('class', 'user-card__avatar').attr('src', c.avatar_url);

	var $userInfo = $('<div>').attr('class', 'user-info');
	var $userName = $('<h3>').attr('class', 'user-info__username').text(c.login);
	var $userLink = $('<a>').attr({
		class: 'user-info__link',
		href: c.html_url,
		target: '_blank'
	}).text('View Profile');

	$userInfo.append($userName, $userLink);
	$div.append($avatar, $userInfo);
	return $div;
};
myApp.generateProjectCard = function (p) {
	var status = ['forks', 'stargazers_count', 'watchers'];
	var $link = $('<a>').attr({
		class: 'project-link',
		href: '' + p.html_url,
		target: '_blank'
	});
	var $div = $('<div>').attr('class', 'project-card');

	var $avatar = $('<img>').attr('class', 'project-card__avatar').attr('src', p.owner.avatar_url);

	var $projectName = $('<h3>').attr('class', 'project-card__projectName').text(p.name);

	var $projectPopularityList = $('<ul>').attr('class', 'project-pop-list');
	for (var i = 0; i < 3; i++) {
		var $li = $('<li>').attr('class', 'project-pop-list__item');
		var $popItem = $('<div>').attr('class', 'pop-item pop-item--' + status[i]);
		var $h5 = $('<h5>').attr('class', 'pop-item__heading').append(status[i] + ':');
		var $p = $('<p>').attr('class', 'pop-item__qty').append('' + p[status[i]]);

		$popItem.append($h5, $p);
		$li.append($popItem);
		$projectPopularityList.append($li);
	}
	$div.append($avatar, $projectName, $projectPopularityList);
	$link.append($div);
	return $link;
};
myApp.voiceSearch = function (topics, content) {
	console.log('inside', topics);
	if (content === 'project') {
		this.fetchReposGithub('topics', '', topics, content);
	} else {
		this.fetchReposGithub('topics', '', topics);
	}
};

$(function () {
	window.myApp = myApp;
	// Credits goes to Magnar from
	// https://stackoverflow.com/questions/920236/how-can-i-detect-if-a-selector-returns-null
	$.fn.exists = function () {
		return this.length !== 0;
	};

	// Initialize myApp object
	myApp.init();

	// After initializing myApp setup voice recognition
	if (annyang) {
		annyang.debug(true);
		// Define voice commands and its appropriate function
		var commands = {
			'search *': function search(action) {
				console.log('finding ', action);
				$('#find')[0].play();
				// Render findCollab Page
				myApp.handleCollabOrProject('findCollab');
			},
			'check *': function check(action) {
				console.log('searching ', action);
				$('#search')[0].play();
				// Render findSearch Page
				myApp.handleCollabOrProject('findProject');
			},
			'project topics *action': function projectTopicsAction(action) {
				console.log('topics ');
				$('#searching')[0].play();
				// Clear list when a new search is made
				$('.project-list').empty();

				// Executed topic search for project
				myApp.voiceSearch(_.split(action, " "), "project");
				setTimeout(function () {
					return $('#finito')[0].play();
				}, 1000);
			},
			'topics *action': function topicsAction(action) {
				console.log('topics ');
				$('#searching')[0].play();
				// Clear list when a new search is made
				$('.collab-list').empty();

				// Executed topic search for collaborators
				myApp.voiceSearch(_.split(action, " "));
				setTimeout(function () {
					return $('#finito')[0].play();
				}, 1000);
			}
		};
		// Add my commands to annyang
		annyang.addCommands(commands);

		$('#annyang-active').on('click', function () {
			if (annyang.isListening()) {
				annyang.abort();
				$('.findCollab-command').animate({ "opacity": 0 }, 700);
				$('.findProject-command').animate({ "opacity": 0 }, 700);
				$(this).html('Activate Voice Command').css("background-color", "#FE3F80");
			} else {
				annyang.start();

				// Start listening. You can call this here, or attach this call to an event, button, etc.
				alert('Warning: The voice recognition function is experimental, it will not work properly in a noisey environement.');
				$('.findCollab-command').animate({ "opacity": 1 }, 700);
				$('.findProject-command').animate({ "opacity": 1 }, 700);
				$(this).html('Deactivate Voice Command').css("background-color", "#C1185A");
			}
			// $(this).replaceWith('<button id="annyang-abort">Deactivate Voice Command</button>')
		});
	}
});

},{"./util":2}],2:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
	value: true
});
var _pipe = function _pipe(f, g) {
	return function () {
		return g(f.apply(undefined, arguments));
	};
};
var pipe = exports.pipe = function pipe() {
	for (var _len = arguments.length, funcs = Array(_len), _key = 0; _key < _len; _key++) {
		funcs[_key] = arguments[_key];
	}

	return funcs.reduce(_pipe);
};

var getHtmlContent = function getHtmlContent(pageName) {
	// Get the html content based on the page name
	if (pageName === 'findCollab' || pageName === 'findProject') {
		$('body').css('overflow-y', 'hidden');
	}
	return _.find(myApp.htmlPages, ['pageName', pageName]).htmlContent;
};
var renderPage = function renderPage(htmlPage) {
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
};
var generateCard = exports.generateCard = function generateCard(cardName) {
	var cards = [];
	var $findCollabCard = $('<div>').attr({
		'class': 'b-choice-card b-choice-card--findCollab',
		'data-cardName': 'findCollab'
	});
	var $findProjectCard = $('<div>').attr({
		'class': 'b-choice-card b-choice-card--findProject',
		'data-cardName': 'findProject'
	});

	var $fc_logo = $('<img>').attr({
		class: 'b-choice-card__logo b-choice-card__logo--findCollab',
		src: './img/findCollab_w.svg'
	});
	var $fp_logo = $('<img>').attr({
		class: 'b-choice-card__logo b-choice-card__logo--findProject',
		src: './img/findProject.svg'
	});

	var $fc_heading = $('<h3>').attr('class', 'b-choice-card__heading b-choice-card__heading--findCollab').text('find your next collaborators');
	var $fp_heading = $('<h3>').attr('class', 'b-choice-card__heading b-choice-card__heading--findProject').text('Discover your next project');

	var $fc_p = $('<p>').attr('class', 'b-choice-card__text b-choice-card__text--findCollab').text("Find collaborators for your next project.");
	var $fp_p = $('<p>').attr('class', 'b-choice-card__text b-choice-card__text--findProject').text("Explore thousands of projects hosted on GitHub.");

	var $fc_command = $('<p>').attr('class', 'findCollab-command').text('Say "Search"');
	var $fp_command = $('<p>').attr('class', 'findProject-command').text('Say "Check"');

	// Append content into each cards
	$findCollabCard.append($fc_logo, $fc_heading, $fc_p, $fc_command);
	$findProjectCard.append($fp_logo, $fp_heading, $fp_p, $fp_command);

	// Create card objects and added to an array
	// The array will be used to retrieve the appropriate card
	cards.push({ cardName: 'findCollab', card: $findCollabCard }, { cardName: 'findProject', card: $findProjectCard });
	return _.find(cards, ['cardName', cardName]).card;
};
var getPageAndRender = pipe(getHtmlContent, renderPage);
var render = exports.render = function render(pageName) {
	return getPageAndRender(pageName);
};
var cleanUrl = exports.cleanUrl = function cleanUrl(url) {
	return _.trimEnd(url, '/').replace('https://github.com/', '');
};
var normalizeStrings = exports.normalizeStrings = function normalizeStrings(arrayOfStrings) {
	//always returns an array of strings or array of string that has been transformed to lowercase
	if (!Array.isArray(arrayOfStrings)) {
		return _.concat([], _.toLower(arrayOfStrings));
	} else {
		return _.map(arrayOfStrings, function (string) {
			return _.toLower(string);
		});
	}
};
var getMostUsedLanguage = exports.getMostUsedLanguage = function getMostUsedLanguage(githubLangObject) {
	return _.sortBy(_.filter(_.map(githubLangObject, function (val, key) {
		return { 'language': normalizeStrings(key)[0], 'qty': val };
	}), function (obj) {
		return _.indexOf(myApp.avoidLanguages, obj.language) < 0;
	}), 'qty')[0].language;
};
var emptyGifDiv = exports.emptyGifDiv = function emptyGifDiv() {
	return '<div class="nothing-gif" style="width:100%;height:100px;padding-bottom:56%;position:relative;"><iframe src="https://giphy.com/embed/y63H09ZvHJdf2" width="100%" height="70%" style="position:absolute" frameBorder="0" class="giphy-embed" allowFullScreen></iframe></div><p><a href="https://giphy.com/gifs/nothing-y63H09ZvHJdf2">via GIPHY</a></p>';
};
var throttlePageContent = exports.throttlePageContent = function throttlePageContent(updateContent) {
	$(window).scroll(function () {
		if ($(document).height() <= $(window).scrollTop() + $(window).height()) {
			console.log('almost at the bottom');
			updateContent();
		}
	});
};
var removeTags = exports.removeTags = function removeTags() {
	var tags = $('#tags').tagEditor('getTags')[0].tags;
	for (var i = 0; i < tags.length; i++) {
		$('#tags').tagEditor('removeTag', tags[i]);
	}
	return tags;
};

},{}]},{},[1])
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJkZXYvc2NyaXB0cy9hcHAuanMiLCJkZXYvc2NyaXB0cy91dGlsLmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7QUNHQTs7QUFLQSxJQUFJLFFBQVEsRUFBWjs7QUFFQTtBQVZBO0FBQ0M7QUFDQTtBQVNELE1BQU0sU0FBTixHQUFrQix3QkFBbEI7QUFDQSxNQUFNLGtCQUFOLEdBQTJCLGdDQUEzQjtBQUNBLE1BQU0sb0JBQU4sR0FBNkIsMkNBQTdCO0FBQ0EsTUFBTSxTQUFOLEdBQWtCLEVBQWxCLEMsQ0FBc0I7O0FBRXRCLE1BQU0sT0FBTixHQUFnQixFQUFoQixDLENBQW9CO0FBQ3BCLE1BQU0sZ0JBQU4sR0FBeUIsRUFBekIsQyxDQUE2Qjs7QUFFN0IsTUFBTSxjQUFOLEdBQXVCLENBQUMsS0FBRCxFQUFRLE1BQVIsRUFBZ0IsT0FBaEIsRUFBeUIsTUFBekIsQ0FBdkIsQyxDQUF5RDtBQUN6RCxNQUFNLFdBQU4sR0FBb0IsRUFBcEIsQyxDQUF3Qjs7QUFFeEI7QUFDQTtBQUNBLE1BQU0sSUFBTixHQUFhLFlBQVc7QUFDdkIsTUFBSyxXQUFMO0FBQ0EsbUJBQU8saUJBQVA7QUFDQSxDQUhEOztBQUtBO0FBQ0EsTUFBTSxXQUFOLEdBQW9CLFlBQVc7QUFDOUIsTUFBSyxTQUFMLENBQWUsSUFBZixDQUFvQixLQUFLLGVBQUwsRUFBcEI7QUFDQSxNQUFLLFNBQUwsQ0FBZSxJQUFmLENBQW9CLEtBQUssVUFBTCxFQUFwQjtBQUNBLE1BQUssU0FBTCxDQUFlLElBQWYsQ0FBb0IsS0FBSyxXQUFMLEVBQXBCO0FBQ0EsQ0FKRDs7QUFNQTtBQUNBO0FBQ0EsTUFBTSxlQUFOLEdBQXdCLFlBQVc7QUFDbEM7QUFDQSxHQUFFLFlBQUYsRUFBZ0IsTUFBaEIsQ0FBdUIsT0FBdkI7O0FBRUE7QUFDQSxLQUFJLFdBQVcsRUFBRSxXQUFGLEVBQ1gsSUFEVyxDQUNOLE9BRE0sRUFDRyxn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LCJzb3VyY2VzQ29udGVudCI6WyIoZnVuY3Rpb24gZSh0LG4scil7ZnVuY3Rpb24gcyhvLHUpe2lmKCFuW29dKXtpZighdFtvXSl7dmFyIGE9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtpZighdSYmYSlyZXR1cm4gYShvLCEwKTtpZihpKXJldHVybiBpKG8sITApO3ZhciBmPW5ldyBFcnJvcihcIkNhbm5vdCBmaW5kIG1vZHVsZSAnXCIrbytcIidcIik7dGhyb3cgZi5jb2RlPVwiTU9EVUxFX05PVF9GT1VORFwiLGZ9dmFyIGw9bltvXT17ZXhwb3J0czp7fX07dFtvXVswXS5jYWxsKGwuZXhwb3J0cyxmdW5jdGlvbihlKXt2YXIgbj10W29dWzFdW2VdO3JldHVybiBzKG4/bjplKX0sbCxsLmV4cG9ydHMsZSx0LG4scil9cmV0dXJuIG5bb10uZXhwb3J0c312YXIgaT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2Zvcih2YXIgbz0wO288ci5sZW5ndGg7bysrKXMocltvXSk7cmV0dXJuIHN9KSIsIi8vIFByb2plY3QgU2NvcGU6XG5cdC8vIFByb3ZpZGUgdGhlIGJlc3QgbWF0Y2hcblx0Ly8gUHJvdmlkZSB2b2ljZSBxdWVyeVxuaW1wb3J0IHtwaXBlLCByZW5kZXIsXG5cdFx0XHRcdGdlbmVyYXRlQ2FyZCwgY2xlYW5VcmwsXG5cdFx0XHQgIG5vcm1hbGl6ZVN0cmluZ3MsIGdldE1vc3RVc2VkTGFuZ3VhZ2UsXG5cdFx0XHRcdGVtcHR5R2lmRGl2LCB0aHJvdHRsZVBhZ2VDb250ZW50LFxuXHRcdFx0XHRyZW1vdmVUYWdzfSBmcm9tICcuL3V0aWwnO1xudmFyIG15QXBwID0ge307XG5cbi8vIG15QXBwIHZhcmlhYmxlc1xubXlBcHAudXJsUHJlZml4ID0gJ2h0dHBzOi8vYXBpLmdpdGh1Yi5jb20nO1xubXlBcHAuYWNjZXB0SGVhZGVyU3RhYmxlID0gJ2FwcGxpY2F0aW9uL3ZuZC5naXRodWIudjMranNvbic7XG5teUFwcC5hY2NlcHRIZWFkZXJVbnN0YWJsZSA9ICdhcHBsaWNhdGlvbi92bmQuZ2l0aHViLm1lcmN5LXByZXZpZXcranNvbidcbm15QXBwLmh0bWxQYWdlcyA9IFtdOyAvLyBjb250YWlucyBhbGwgcGFnZXMgZm9yIGFwcCAoY29sbGFiT3JQcm9qZWN0LCBmaW5kQ29sbGFiLCBmaW5kUHJvamVjdClcblxubXlBcHAudXNlclVybCA9ICcnOyAvLyBVc2VyJ3MgcHJvamVjdCB1cmxcbm15QXBwLnVzZXJTZWFyY2hUb3BpY3MgPSBbXTsgLy8gVG9waWNzIHNlYXJjaGVkIGJ5IHVzZXIgd2hpY2ggaXMgdXNlZCB0byBmaW5kIGNvbGxhYm9yYXRpb25cblxubXlBcHAuYXZvaWRMYW5ndWFnZXMgPSBbJ2NzcycsICdodG1sJywgJ2h0bWw1JywgJ2NzczMnXTsgLy8gR2l0aHViIHJldHVybnMgbW9yZSByZXN1bHQgZm9yIHByb2dyYW1taW5nIGxhbmd1YWdlc1xubXlBcHAudXNlclVybEluZm8gPSAnJzsgLy8gTWV0YSBpbmZvIHJldHJpZXZlZCBmcm9tIHVzZXIncyByZXBvIHVybFxuXG4vLyBDcmVhdGUgYWxsIG15IHBhZ2VzXG4vLyBSZW5kZXIgdGhlIHRoZSBmaXJzdCBwYWdlIGNvbGxhYk9yUHJvamVjdFxubXlBcHAuaW5pdCA9IGZ1bmN0aW9uKCkge1xuXHR0aGlzLmNyZWF0ZVBhZ2VzKCk7XG5cdHJlbmRlcignY29sbGFiT3JQcm9qZWN0Jyk7XG59XG5cbi8vIFJldHJpZXZlIHRoZSByZXR1cm5lZCBwYWdlIG9iamVjdCBhbmQgc3RvcmUgaW4gbXkgYXJyYXkgb2YgcGFnZXNcbm15QXBwLmNyZWF0ZVBhZ2VzID0gZnVuY3Rpb24oKSB7XG5cdHRoaXMuaHRtbFBhZ2VzLnB1c2godGhpcy5jb2xsYWJPclByb2plY3QoKSk7XG5cdHRoaXMuaHRtbFBhZ2VzLnB1c2godGhpcy5maW5kQ29sbGFiKCkpO1xuXHR0aGlzLmh0bWxQYWdlcy5wdXNoKHRoaXMuZmluZFByb2plY3QoKSk7XG59XG5cbi8vIERpc3BsYXlzIHRoZSBjaG9pY2VzIGFuZCBzZXR1cCBhY3Rpb24gbGlzdGVuZXJcbi8vIEJhc2VkIG9uIHRoZSBjYXJkIGNob3NlbiBkaXNwbGF5IHRoZSBhcHByb3ByaWF0ZSB3ZWIgcGFnZVxubXlBcHAuY29sbGFiT3JQcm9qZWN0ID0gZnVuY3Rpb24oKSB7XG5cdC8vIFJlbW92ZSBhbnkgcHJldmlvdXMgbGlzdGVuZXJzIGF0dGFjaGVkIHRvIHRoZSBjb250YWluZXJcblx0JCgnLmNvbnRhaW5lcicpLnVuYmluZCgnY2xpY2snKTtcblxuXHQvLyBDcmVhdGUgdGhlIGh0bWwgY29udGVudCBmb3IgdGhlIGhvbWUgcGFnZVxuXHR2YXIgJHNlY3Rpb24gPSAkKCc8c2VjdGlvbj4nKVxuXHRcdFx0XHQuYXR0cignY2xhc3MnLCAnYi1jb2xsYWItb3ItcHJvamVjdCB3cmFwcGVyLWxnJyk7XG5cdHZhciAkY2FyZENvbnRhaW5lciA9ICQoJzxkaXY+Jylcblx0XHRcdFx0XHRcdFx0LmF0dHIoJ2NsYXNzJywgJ2NhcmQtY29udGFpbmVyJyk7XG5cdHZhciAkZmluZENvbGxhYkNhcmQgPSAkKCc8YT4nKVxuXHRcdFx0XHRcdFx0XHQuYXBwZW5kKGdlbmVyYXRlQ2FyZCgnZmluZENvbGxhYicpKVxuXHRcdFx0XHRcdFx0XHQuYXR0cignY2xhc3MnLCAnY2FyZC1jb250YWluZXJfX2NhcmQnKTtcblx0dmFyICRmaW5kUHJvamVjdENhcmQgPSAkKCc8YT4nKVxuXHRcdFx0XHRcdFx0XHQuYXBwZW5kKGdlbmVyYXRlQ2FyZCgnZmluZFByb2plY3QnKSlcblx0XHRcdFx0XHRcdFx0LmF0dHIoJ2NsYXNzJywgJ2NhcmQtY29udGFpbmVyX19jYXJkJyk7XG5cdCRjYXJkQ29udGFpbmVyLmFwcGVuZCgkZmluZENvbGxhYkNhcmQsICRmaW5kUHJvamVjdENhcmQpO1xuXHQkc2VjdGlvbi5hcHBlbmQoJGNhcmRDb250YWluZXIpO1xuXHQvLyBTZXR1cCB0aGUgY2xpY2sgZXZlbnQgZm9yIHRoZSBjb2xsYWJvcmF0aW9uIGFuZCBwcm9qZWN0IHBhZ2VzXG5cdCQoJy5jb250YWluZXInKS5vbignY2xpY2snLCAnLmItY2hvaWNlLWNhcmQnLCAoZSkgPT4ge1xuXHRcdC8vIFJlbW92ZSBoZWFkZXJcblx0XHQkKCcuYi1hcHAtaW5mbycpLnJlbW92ZSgpO1xuXHRcdHZhciBwYWdlTmFtZSA9IGUuY3VycmVudFRhcmdldC5nZXRBdHRyaWJ1dGUoJ2RhdGEtY2FyZE5hbWUnKTtcblx0XHQvLyBjb25zb2xlLmxvZyhwYWdlTmFtZSk7XG5cblx0XHQvLyBPbmNlIGFnYWluIHJlbW92ZSBwcmV2aW91cyBjbGljayBldmVudHMgYXR0YWNoZWQgdG8gdGhlIGNvbnRhaW5lclxuXHRcdCQoJy5jb250YWluZXInKS51bmJpbmQoJ2NsaWNrJyk7XG5cdFx0Ly8gUmVuZGVyIHRoZSBjbGlja2VkIHBhZ2Vcblx0XHRyZW5kZXIocGFnZU5hbWUpO1xuXG5cdFx0Ly8gRGlzcGxheSB2b2ljZSBjb21tYW5kIGlmIGl0IGlzIHR1cm5lZCBvblxuXHRcdGlmIChhbm55YW5nLmlzTGlzdGVuaW5nKCkpIHtcblx0XHRcdCQoYC4ke3BhZ2VOYW1lfS1zZWFyY2gtY29tbWFuZGApLmNzcyhcIm9wYWNpdHlcIiwgMSk7XG5cdFx0fVxuXHR9KTtcblx0cmV0dXJuIHtwYWdlTmFtZTogJ2NvbGxhYk9yUHJvamVjdCcsIGh0bWxDb250ZW50OiAkc2VjdGlvbn07XG59XG5teUFwcC5oYW5kbGVDb2xsYWJPclByb2plY3QgPSBmdW5jdGlvbihwYWdlTmFtZSkge1xuXHQvLyBjb25zb2xlLmxvZygndGhpcycsIHRoaXMpO1xuXHQvLyBSZW1vdmUgaGVhZGVyXG5cdCQoJy5iLWFwcC1pbmZvJykucmVtb3ZlKCk7XG5cdCQoXCIjdGFnc1wiKS5yZW1vdmUoKTtcblx0JCgnLmNvbnRhaW5lcicpLnVuYmluZCgnY2xpY2snKTtcblx0Ly8gRGlzcGxheSB2b2ljZSBjb21tYW5kIGlmIGl0IGlzIHR1cm5lZCBvblxuXHRyZW5kZXIocGFnZU5hbWUpO1xuXHRpZiAoYW5ueWFuZy5pc0xpc3RlbmluZygpKSB7XG5cdFx0JChgLiR7cGFnZU5hbWV9LXNlYXJjaC1jb21tYW5kYCkuY3NzKFwib3BhY2l0eVwiLCAxKTtcblx0fVxufVxuXG5teUFwcC5maW5kQ29sbGFiID0gZnVuY3Rpb24oKSB7XG5cblx0dmFyIGlucHV0cyA9IFtdO1xuXHR2YXIgY3VycklucHV0VHlwZSA9ICd0b3BpYyc7XG5cblx0dmFyICRzZWN0aW9uID0gJCgnPHNlY3Rpb24+Jylcblx0XHRcdFx0LmF0dHIoJ2NsYXNzJywgJ2ItZmluZENvbGxhYi1wYWdlJyk7XG5cdHZhciAkc2VhcmNoU2VhY3Rpb24gPSAkKCc8ZGl2PicpXG5cdFx0XHRcdFx0XHRcdC5hdHRyKCdjbGFzcycsICdiLWZpbmRDb2xsYWItcGFnZV9fc2VhcmNoJyk7XG5cdHZhciAkY29sbGFiTGlzdFNlYWN0aW9uID0gJCgnPGRpdj4nKVxuXHRcdFx0XHRcdFx0XHQuYXR0cignY2xhc3MnLCAnYi1maW5kQ29sbGFiLXBhZ2VfX2NvbGxhYi1saXN0Jyk7XG5cblx0dmFyICRoZWFkaW5nID0gJCgnPGgyPicpXG5cdFx0XHRcdFx0LmF0dHIoJ2NsYXNzJywgJ2ItZmluZENvbGxhYi1wYWdlX19oZWFkaW5nJylcblx0XHRcdFx0XHQuYXBwZW5kKCdDaG9vc2UgeW91ciBDb2xsYWJvcmF0b3JzJyk7XG5cblx0dmFyIHVybFNlYXJjaElucHV0ID0gJCgnPGlucHV0IGF1dG9mb2N1cz4nKVxuXHRcdFx0XHRcdFx0XHQuYXR0cih7XG5cdFx0XHRcdFx0XHRcdFx0dHlwZTogJ3VybCcsXG5cdFx0XHRcdFx0XHRcdFx0bmFtZTogJ3VybC1pbnB1dCcsXG5cdFx0XHRcdFx0XHRcdFx0cGxhY2Vob2xkZXI6ICd1cmwuLi4nLFxuXHRcdFx0XHRcdFx0XHRcdGNsYXNzOiAnYi1pbnB1dC1jb250YWluZXItLXVybC1pbnB1dCdcblx0XHRcdFx0XHRcdFx0fSk7XG5cdHZhciB0b3BpY1NlYXJjaElucHV0ID0gJCgnPGlucHV0IG5hbWU9XCJ0YWdzXCIgaWQ9XCJ0YWdzXCIvPicpXG5cdFx0XHRcdFx0XHRcdC5hdHRyKCdjbGFzcycsICdiLWlucHV0LWNvbnRhaW5lci0tdG9waWMtaW5wdXQnKTtcblx0aW5wdXRzLnB1c2godXJsU2VhcmNoSW5wdXQsIHRvcGljU2VhcmNoSW5wdXQpO1xuXG5cdC8vIFRoaXMgc2VjdGlvbiBpcyBmb3IgY29udHJvbGxpbmcgdGhlIHRvZ2dsZSBiZXR3ZWVuIHVybCBvciB0b3BpYyBzZWFyY2hcblx0dmFyIHVybEJ1dHRvblRhYiA9ICQoJzxidXR0b24+Jylcblx0XHRcdFx0XHRcdC5hdHRyKHtcblx0XHRcdFx0XHRcdFx0bmFtZTogJ3VybCcsXG5cdFx0XHRcdFx0XHRcdGNsYXNzOiAnYi10YWJfX3VybCdcblx0XHRcdFx0XHRcdH0pXG5cdFx0XHRcdFx0XHQuYXBwZW5kKCdVcmwnKTtcblx0dmFyIHRvcGljQnV0dG9uVGFiID0gJCgnPGJ1dHRvbj4nKVxuXHRcdFx0XHRcdFx0LmF0dHIoe1xuXHRcdFx0XHRcdFx0XHRuYW1lOiAndG9waWMnLFxuXHRcdFx0XHRcdFx0XHRjbGFzczogJ2ItdGFiX190b3BpYydcblx0XHRcdFx0XHRcdH0pXG5cdFx0XHRcdFx0XHQuYXBwZW5kKCdUb3BpY3MnKTtcblx0dmFyIGlucHV0VGFiQ29udGFpbmVyID0gJCgnPGRpdj4nKVxuXHRcdFx0XHRcdFx0XHQuYXR0cignY2xhc3MnLCAnYi10YWIgd3JhcHBlci1sZycpXG5cdFx0XHRcdFx0XHRcdC5vbignY2xpY2snLCAnYnV0dG9uJywgKGUpID0+IHtcblx0XHRcdFx0XHRcdFx0XHQvLyBDbGVhciBsaXN0IHdoZW4gY2hhbmdpbmcgaW5wdXQgdHlwZVxuXHRcdFx0XHRcdFx0XHRcdCQoJy5jb2xsYWItbGlzdCcpLmVtcHR5KCk7XG5cblx0XHRcdFx0XHRcdFx0XHRsZXQgaW5wdXRUeXBlID0gZS5jdXJyZW50VGFyZ2V0Lm5hbWU7XG5cdFx0XHRcdFx0XHRcdFx0aWYgKGlucHV0VHlwZSA9PT0gJ3RvcGljJykge1xuXHRcdFx0XHRcdFx0XHRcdFx0aWYgKCEkKCcuYi1pbnB1dC1jb250YWluZXItLXRvcGljLWlucHV0JykuZXhpc3RzKCkpIHtcblx0XHRcdFx0XHRcdFx0XHRcdFx0JCgnLmItaW5wdXQtY29udGFpbmVyLS11cmwtaW5wdXQnKS5kZXRhY2goKTtcblx0XHRcdFx0XHRcdFx0XHRcdFx0JCgnLmItaW5wdXQtY29udGFpbmVyJykuYXBwZW5kKGlucHV0c1sxXSk7XG5cdFx0XHRcdFx0XHRcdFx0XHRcdCQoJyN0YWdzJykudGFnRWRpdG9yKCk7XG5cdFx0XHRcdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0XHRcdFx0XHRjdXJySW5wdXRUeXBlID0gJ3RvcGljJztcblx0XHRcdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0XHRcdFx0ZWxzZSB7XG5cdFx0XHRcdFx0XHRcdFx0XHRpZiAoISQoJy5iLWlucHV0LWNvbnRhaW5lci0tdXJsLWlucHV0JykuZXhpc3RzKCkpIHtcblx0XHRcdFx0XHRcdFx0XHRcdFx0JCgnLmItaW5wdXQtY29udGFpbmVyLS10b3BpYy1pbnB1dCcpLmRldGFjaCgpO1xuXHRcdFx0XHRcdFx0XHRcdFx0XHQkKCcudGFnLWVkaXRvcicpLnJlbW92ZSgpO1xuXHRcdFx0XHRcdFx0XHRcdFx0XHQkKCcuYi1pbnB1dC1jb250YWluZXInKS5hcHBlbmQoaW5wdXRzWzBdKTtcblx0XHRcdFx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHRcdFx0XHRcdGN1cnJJbnB1dFR5cGUgPSAndXJsJztcblx0XHRcdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0XHRcdH0pO1xuXG5cdGlucHV0VGFiQ29udGFpbmVyLmFwcGVuZCh1cmxCdXR0b25UYWIsIHRvcGljQnV0dG9uVGFiKTtcblxuXHR2YXIgc2VhcmNoT3B0aW9uQ29udGFpbmVyID0gJCgnPGRpdj4nKVxuXHRcdFx0XHRcdFx0XHRcdC5hdHRyKCdjbGFzcycsICdiLWlucHV0LWNvbnRhaW5lciB3cmFwcGVyLWxnJylcblx0XHRcdFx0XHRcdFx0XHQuYXBwZW5kKGlucHV0c1sxXSlcblx0XHRcdFx0XHRcdFx0XHQub24oJ2tleXVwJywgJ2lucHV0JywgKGUpID0+IHtcblx0XHRcdFx0XHRcdFx0XHRcdGlmKGUua2V5Q29kZSA9PT0gMTMpIHtcblx0XHRcdFx0XHRcdFx0XHRcdFx0Ly8gQ2xlYXIgbGlzdCB3aGVuIGEgbmV3IHNlYXJjaCBpcyBtYWRlXG5cdFx0XHRcdFx0XHRcdFx0XHRcdCQoJy5jb2xsYWItbGlzdCcpLmVtcHR5KCk7XG5cblx0XHRcdFx0XHRcdFx0XHRcdFx0Ly8gQWRkIGxvYWRpbmcgZ2lmXG5cdFx0XHRcdFx0XHRcdFx0XHRcdCQoJy5jb2xsYWItbGlzdCcpLmFwcGVuZCgnPGltZyBjbGFzcz1cImxvYWRpbmctZ2lmXCIgc3JjPVwiLi9pbWcvYm94LmdpZlwiPicpO1xuXG5cdFx0XHRcdFx0XHRcdFx0XHRcdGlmIChjdXJySW5wdXRUeXBlID09PSAndXJsJykge1xuXHRcdFx0XHRcdFx0XHRcdFx0XHRcdC8vIEZpcnN0IHRyaW0gYW55IGVuZGluZyAnLycgdGhlbiByZW1vdmUgcHJlZml4IHVybCAnaHR0cHM6Ly9naXRodWIuY29tLydcblx0XHRcdFx0XHRcdFx0XHRcdFx0XHQvLyBUaGVuIGJ5IHNwbGl0dGluZyB0aGUgcmVtYWluaW5nIHVybCB3ZSB3aWxsIGVuZCB1cCB3aXRoIHRoZSBbdXNlciwgcmVwb11cblx0XHRcdFx0XHRcdFx0XHRcdFx0XHQvLyBXaGljaCB3ZSB0aGVuIGpvaW4gdG9nZXRoZXIgdG8gcHJvZHVjZSB1c2VyL3JlcG9cblx0XHRcdFx0XHRcdFx0XHRcdFx0XHQvLyBodHRwczovL2dpdGh1Yi5jb20vZ2F0c2J5anMvZ2F0c2J5XG5cdFx0XHRcdFx0XHRcdFx0XHRcdFx0dGhpcy51c2VyVXJsID0gY2xlYW5VcmwoJCgnLmItaW5wdXQtY29udGFpbmVyLS11cmwtaW5wdXQnKS52YWwoKSk7XG5cdFx0XHRcdFx0XHRcdFx0XHRcdFx0Ly8gY29uc29sZS5sb2coJ3BhcnNlZCB1cmwnLCB0aGlzLnVzZXJVcmwpO1xuXG5cdFx0XHRcdFx0XHRcdFx0XHRcdFx0JCgnLmItaW5wdXQtY29udGFpbmVyLS11cmwtaW5wdXQnKS52YWwoJycpO1xuXHRcdFx0XHRcdFx0XHRcdFx0XHRcdHRoaXMuZmV0Y2hGcm9tVXJsKCk7XG5cdFx0XHRcdFx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHRcdFx0XHRcdFx0ZWxzZSB7XG5cdFx0XHRcdFx0XHRcdFx0XHRcdFx0Ly8gUmVtb3ZlIGFsbCB0YWdzIGFuZCByZXR1cm4gdGhlbVxuXHRcdFx0XHRcdFx0XHRcdFx0XHRcdHRoaXMudXNlclNlYXJjaFRvcGljcyA9IHJlbW92ZVRhZ3MoKTtcblx0XHRcdFx0XHRcdFx0XHRcdFx0XHR0aGlzLmZldGNoUmVwb3NHaXRodWIoJ3RvcGljcycsICcnLCB0aGlzLnVzZXJTZWFyY2hUb3BpY3MpO1xuXHRcdFx0XHRcdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0XHRcdFx0fSk7XG5cblx0dmFyICRjb2xsYWJvcmF0b3JMaXN0ID0gJCgnPHVsPicpXG5cdFx0XHRcdFx0XHRcdC5hdHRyKCdjbGFzcycsICdjb2xsYWItbGlzdCB3cmFwcGVyLWxnJyk7XG5cblx0dmFyICRzZWFyY2hDb21tYW5kID0gJCgnPHA+JylcbiAgICAgICAgICAgICAgICAgICAgLmF0dHIoJ2NsYXNzJywgJ2ZpbmRDb2xsYWItc2VhcmNoLWNvbW1hbmQnKVxuICAgICAgICAgICAgICAgICAgICAudGV4dCgnU2F5IFwiVG9waWNzIFxcJ3JlYWN0LCByZWR1eCwgZ2l0aHViLCBldGMuLi5cXCcgXCInKTtcblxuXHR2YXIgJGFqYXhEaXYgPSAkKCc8ZGl2PicpXG5cdFx0XHRcdFx0LmF0dHIoJ2NsYXNzJywgJ2FqYXgtZGl2Jylcblx0XHRcdFx0XHQuY3NzKHtcblx0XHRcdFx0XHRcdHBvc2l0aW9uOiAnYWJzb2x1dGUnLFxuXHRcdFx0XHRcdFx0Ym90dG9tOiAnLTEwcHgnLFxuXHRcdFx0XHRcdFx0aGVpZ2h0OiAnMXB4Jyxcblx0XHRcdFx0XHRcdHdpZHRoOiAnMXB4J1xuXHRcdFx0XHRcdH0pO1xuXG5cdHZhciAkaG9tZVBhZ2VCdG4gPSAkKCc8YSBjbGFzcz1cImJhY2stYnRuXCIgaHJlZj1cImh0dHBzOi8vdmVub21uZXJ0LmdpdGh1Yi5pby9jb2xsYWJvXCI+aG9tZTwvYT4nKTtcblxuXHQkc2VhcmNoU2VhY3Rpb24uYXBwZW5kKHNlYXJjaE9wdGlvbkNvbnRhaW5lciwgaW5wdXRUYWJDb250YWluZXIpO1xuXHQkY29sbGFiTGlzdFNlYWN0aW9uLmFwcGVuZCgkaGVhZGluZywgJGNvbGxhYm9yYXRvckxpc3QpXG5cdCRzZWN0aW9uLmFwcGVuZCgkaG9tZVBhZ2VCdG4sICRzZWFyY2hTZWFjdGlvbiwgJHNlYXJjaENvbW1hbmQsICRjb2xsYWJMaXN0U2VhY3Rpb24sICRhamF4RGl2KTtcblxuXHRyZXR1cm4ge3BhZ2VOYW1lOiAnZmluZENvbGxhYicsIGh0bWxDb250ZW50OiAkc2VjdGlvbn1cbn1cbi8vQ3JlYXRlIHRoZSBodG1sIGZvciBmaW5kUHJvamVjdCBwYWdlc1xubXlBcHAuZmluZFByb2plY3QgPSBmdW5jdGlvbigpIHtcblx0Ly8gQ3JlYXRlIGEgaHRtbCBjb250ZW50IGZvciBwcm9qZWN0IHBhZ2Vcblx0dmFyICRzZWN0aW9uID0gJCgnPHNlY3Rpb24+Jylcblx0XHRcdFx0LmF0dHIoJ2NsYXNzJywgJ2ItZmluZFByb2plY3QtcGFnZScpO1xuXHR2YXIgJHNlYXJjaFNlYWN0aW9uID0gJCgnPGRpdj4nKVxuXHRcdFx0XHRcdFx0XHQuYXR0cignY2xhc3MnLCAnYi1maW5kUHJvamVjdC1wYWdlX19zZWFyY2gnKTtcblx0dmFyICRwcm9qZWN0TGlzdFNlYWN0aW9uID0gJCgnPGRpdj4nKVxuXHRcdFx0XHRcdFx0XHQuYXR0cignY2xhc3MnLCAnYi1maW5kUHJvamVjdC1wYWdlX19wcm9qZWN0LWxpc3QnKTtcblx0dmFyICRoZWFkaW5nID0gJCgnPGgyPicpXG5cdFx0XHRcdFx0LmF0dHIoJ2NsYXNzJywgJ2ItZmluZFByb2plY3QtcGFnZV9faGVhZGluZycpXG5cdFx0XHRcdFx0LmFwcGVuZCgnRmluZCBQcm9qZWN0Jyk7XG5cdHZhciB0b3BpY1NlYXJjaElucHV0ID0gJCgnPGlucHV0IG5hbWU9XCJ0YWdzXCIgaWQ9XCJ0YWdzXCIvPicpXG5cdFx0XHRcdFx0XHRcdC5hdHRyKCdjbGFzcycsICdiLWlucHV0LWNvbnRhaW5lciBiLWlucHV0LWNvbnRhaW5lci0tdG9waWMtaW5wdXQnKTtcblx0dmFyIHNlYXJjaE9wdGlvbkNvbnRhaW5lciA9ICQoJzxkaXY+Jylcblx0XHRcdFx0XHRcdFx0XHQuYXR0cignY2xhc3MnLCAnYi1pbnB1dC1jb250YWluZXItLXByb2plY3Qgd3JhcHBlci1sZycpXG5cdFx0XHRcdFx0XHRcdFx0LmFwcGVuZCh0b3BpY1NlYXJjaElucHV0KVxuXHRcdFx0XHRcdFx0XHRcdC5vbigna2V5dXAnLCAoZSkgPT4ge1xuXHRcdFx0XHRcdFx0XHRcdFx0aWYoZS5rZXlDb2RlID09PSAxMykge1xuXHRcdFx0XHRcdFx0XHRcdFx0XHQvLyBDbGVhciBsaXN0IHdoZW4gYSBuZXcgc2VhcmNoIGlzIG1hZGVcblx0XHRcdFx0XHRcdFx0XHRcdFx0JCgnLnByb2plY3QtbGlzdCcpLmVtcHR5KCk7XG5cblx0XHRcdFx0XHRcdFx0XHRcdFx0Ly8gQWRkIGxvYWRpbmcgZ2lmXG5cdFx0XHRcdFx0XHRcdFx0XHRcdCQoJy5wcm9qZWN0LWxpc3QnKS5hcHBlbmQoJzxpbWcgY2xhc3M9XCJsb2FkaW5nLWdpZlwiIHNyYz1cIi4vaW1nL2JveC1wcm9qZWN0LmdpZlwiPicpO1xuXG5cdFx0XHRcdFx0XHRcdFx0XHRcdC8vIFJlbW92ZSBhbGwgdGFncyBhbmQgcmV0dXJuIHRoZW1cblx0XHRcdFx0XHRcdFx0XHRcdFx0dGhpcy51c2VyU2VhcmNoVG9waWNzID0gcmVtb3ZlVGFncygpO1xuXHRcdFx0XHRcdFx0XHRcdFx0XHR0aGlzLmZldGNoUmVwb3NHaXRodWIoJ3RvcGljcycsICcnLCB0aGlzLnVzZXJTZWFyY2hUb3BpY3MsICdwcm9qZWN0Jyk7XG5cdFx0XHRcdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0XHRcdFx0fSk7XG5cdHZhciAkcHJvamVjdExpc3QgPSAkKCc8dWw+Jylcblx0XHRcdFx0XHRcdFx0LmF0dHIoJ2NsYXNzJywgJ3Byb2plY3QtbGlzdCB3cmFwcGVyLWxnJyk7XG5cdCRzZWFyY2hTZWFjdGlvbi5hcHBlbmQoc2VhcmNoT3B0aW9uQ29udGFpbmVyKTtcblx0JHByb2plY3RMaXN0U2VhY3Rpb24uYXBwZW5kKCRoZWFkaW5nLCAkcHJvamVjdExpc3QpO1xuXG5cdHZhciAkYWpheERpdiA9ICQoJzxkaXY+Jylcblx0XHRcdFx0XHQuYXR0cignY2xhc3MnLCAnYWpheC1kaXYnKVxuXHRcdFx0XHRcdC5jc3Moe1xuXHRcdFx0XHRcdFx0cG9zaXRpb246ICdhYnNvbHV0ZScsXG5cdFx0XHRcdFx0XHRib3R0b206ICctMTBweCcsXG5cdFx0XHRcdFx0XHRoZWlnaHQ6ICcxcHgnLFxuXHRcdFx0XHRcdFx0d2lkdGg6ICcxcHgnXG5cdFx0XHRcdFx0fSk7XG5cdHZhciAkc2VhcmNoQ29tbWFuZCA9ICQoJzxwPicpXG4gICAgICAgICAgICAgICAgICAgIC5hdHRyKCdjbGFzcycsICdmaW5kUHJvamVjdC1zZWFyY2gtY29tbWFuZCcpXG4gICAgICAgICAgICAgICAgICAgIC50ZXh0KCdTYXkgXCJQcm9qZWN0IFRvcGljcyBcXCdyZWFjdCwgcmVkdXgsIGdpdGh1YiwgZXRjLi4uXFwnIFwiJyk7XG5cdHZhciAkaG9tZVBhZ2VCdG4gPSAkKCc8YSBjbGFzcz1cImJhY2stYnRuXCIgaHJlZj1cImh0dHBzOi8vdmVub21uZXJ0LmdpdGh1Yi5pby9jb2xsYWJvXCI+aG9tZTwvYT4nKTtcblxuXHQkc2VjdGlvbi5hcHBlbmQoJGhvbWVQYWdlQnRuICwgJHNlYXJjaFNlYWN0aW9uLCAkc2VhcmNoQ29tbWFuZCwgJHByb2plY3RMaXN0U2VhY3Rpb24sICRhamF4RGl2KTtcblx0cmV0dXJuIHtwYWdlTmFtZTogJ2ZpbmRQcm9qZWN0JywgaHRtbENvbnRlbnQ6ICRzZWN0aW9ufTtcbn1cblxubXlBcHAuZmV0Y2hVcmxJbmZvID0gZnVuY3Rpb24obmV3VXJsLCBxdWVyeSkge1xuXHRsZXQgdXJsID0gYCR7dGhpcy51cmxQcmVmaXh9L3JlcG9zLyR7dGhpcy51c2VyVXJsfWA7XG5cdGlmIChuZXdVcmwgPT09IGZhbHNlICYmIHF1ZXJ5ICE9PSB1bmRlZmluZWQpIHtcblx0XHR1cmwgPSBgJHt0aGlzLnVybFByZWZpeH0vcmVwb3MvJHt0aGlzLnVzZXJVcmx9LyR7cXVlcnl9YDtcblx0fVxuXHRpZiAobmV3VXJsICE9PSB1bmRlZmluZWQgJiYgcXVlcnkgPT09IGZhbHNlKSB7XG5cdFx0dXJsID0gbmV3VXJsO1xuXHR9XG5cdC8vIGNvbnNvbGUubG9nKHVybCk7XG5cdHJldHVybiAkLmFqYXgoe1xuXHRcdGhlYWRlcnM6IHtcblx0XHRcdEFjY2VwdDogdGhpcy5hY2NlcHRIZWFkZXJVbnN0YWJsZVxuXHRcdH0sXG5cdFx0dXJsOiB1cmwsXG5cdFx0dHlwZTogJ0dFVCcsXG5cdFx0ZGF0YVR5cGU6ICdqc29uJyxcblx0fSk7XG59XG5teUFwcC5mZXRjaEZyb21VcmwgPSBmdW5jdGlvbigpIHtcblx0JC53aGVuKHRoaXMuZmV0Y2hVcmxJbmZvKGZhbHNlKSlcblx0LnRoZW4oICh1cmxJbmZvKSA9PiB7XG5cdFx0Ly8gY2hlY2sgdG8gc2VlIGlmIHRoZSByZXR1cm5lZCBsYW5ndWFnZSBmb3Jcblx0XHQvLyB0aGUgdXNlciByZXBvIGlzIGEgcHJvZ3JhbW1pbmcgbGFuZ3VhZ2UuIElmIG5vdCBtYWtlIGEgcmVxdWVzdCBmb3IgYWxsIHRoZSBsYW5ndWFnZXNcblx0XHQvLyByZWxhdGVkIHRvIHRoZSBwcm9qZWN0XG5cdFx0dGhpcy51c2VyVXJsSW5mbyA9IHVybEluZm87XG5cdFx0bGV0IHByaW1hcnlMYW5ndWFnZSA9IG5vcm1hbGl6ZVN0cmluZ3ModXJsSW5mby5sYW5ndWFnZSlbMF07XG5cdFx0aWYgKF8uaW5kZXhPZih0aGlzLmF2b2lkTGFuZ3VhZ2VzLCBwcmltYXJ5TGFuZ3VhZ2UpID49IDApIHsgcmV0dXJuIHRoaXMuZmV0Y2hVcmxJbmZvKGZhbHNlLCAnbGFuZ3VhZ2VzJyk7IH1cblx0XHRlbHNlIHsgcmV0dXJuIHByaW1hcnlMYW5ndWFnZTt9XG5cdH0pXG5cdC5jYXRjaCgoZXJyKSA9PiB7XG5cdFx0Ly8gaGFuZGxlIGVycm9yIHdpdGggZmV0Y2hpbmcgdXJsXG5cdFx0JCgnLmNvbGxhYi1saXN0JykuZW1wdHkoKTtcblx0XHQkKCcuY29sbGFiLWxpc3QnKVxuXHRcdC5hcHBlbmQoZW1wdHlHaWZEaXYoKSk7XG5cdH0pXG5cdC50aGVuKChwcmltYXJ5TGFuZ3VhZ2UpID0+IHtcblx0XHRsZXQgbGFuZ3VhZ2UgPSBwcmltYXJ5TGFuZ3VhZ2U7XG5cdFx0aWYgKHR5cGVvZiBsYW5ndWFnZSAhPSAnc3RyaW5nJykge1xuXHRcdFx0bGFuZ3VhZ2UgPSBnZXRNb3N0VXNlZExhbmd1YWdlKHByaW1hcnlMYW5ndWFnZSk7XG5cdFx0fVxuXHRcdC8vIE1ha2Ugc3VyZSB0byByZW1vdmUgYW55IHRvcGljcyB0aGF0IGlzIHNwZWNpZmljIHRvIHRoZSB1c2VyIHJlcG9cblx0XHQvLyBUaGlzIGFsbG93cyBmb3IgYSBtb3JlIGdlbmVyYWwgc2VhcmNoIHJlc3VsdFxuXHRcdGxldCB0b3BpY3MgPSBfLmRpZmZlcmVuY2Uobm9ybWFsaXplU3RyaW5ncyh0aGlzLnVzZXJVcmxJbmZvLnRvcGljcyksIG5vcm1hbGl6ZVN0cmluZ3ModGhpcy51c2VyVXJsLnNwbGl0KCcvJykpKTtcblx0XHR0aGlzLmZldGNoUmVwb3NHaXRodWIoJ3VybCcsIGxhbmd1YWdlLCB0b3BpY3MpO1xuXHR9KTtcblxufVxubXlBcHAuZmV0Y2hSZXBvcyA9IGZ1bmN0aW9uKHF1ZXJ5KSB7XG5cdHJldHVybiAkLmFqYXgoe1xuXHRcdGhlYWRlcnM6IHtcblx0XHRcdEFjY2VwdDogdGhpcy5hY2NlcHRIZWFkZXJVbnN0YWJsZVxuXHRcdH0sXG5cdFx0dXJsOiBgJHt0aGlzLnVybFByZWZpeH0vc2VhcmNoL3JlcG9zaXRvcmllcz9xPSR7cXVlcnl9YCxcblx0XHR0eXBlOiAnR0VUJyxcblx0XHRkYXRhVHlwZTogJ2pzb24nXG5cdH0pXG5cdC5jYXRjaCgoZXJyKSA9PiB7XG5cdFx0YWxlcnQoJ0Vycm9yIHdpdGggc2VhcmNoLicpO1xuXHR9KVxufVxubXlBcHAuZmV0Y2hSZXBvc0dpdGh1YiA9IGZ1bmN0aW9uKHR5cGUsIHByaW1hcnlMYW5ndWFnZSwgdG9waWNzLCBjb250ZW50KSB7XG5cdGlmICh0eXBlID09PSAndXJsJykge1xuXHRcdFx0Ly8gcmVwb3MgPSAncT1zdHJpbmcxK3N0cmluZzIrLi4uK3N0cmluZ04raW46bmFtZSxkZXNjcmlwdGlvbitsYW5ndWFnZTpsYW5nMSt0b3BpYzp0b3BpYzErdG9waWMyKy4uLit0b3BpY04nO1xuXHRcdFx0Ly8gdG9waWMgaXMgb3B0aW9uYWwgdG9waWM6JHtfLmpvaW4odG9waWNzLCcrdG9waWM6Jyl9IGlzXG5cdFx0XHRsZXQgbG9va0luID0gWyduYW1lJywgJ2Rlc2NyaXB0aW9uJywgJ3JlYWRtZSddO1xuXHRcdFx0bGV0IHF1ZXJ5ID0gYCR7Xy5qb2luKHRvcGljcywgJysnKX0raW46JHtfLmpvaW4obG9va0luLCAnLCcpfStsYW5ndWFnZToke3ByaW1hcnlMYW5ndWFnZX1gO1xuXHRcdFx0Ly8gY29uc29sZS5sb2cocXVlcnkpO1xuXHRcdFx0JC53aGVuKHRoaXMuZmV0Y2hSZXBvcyhxdWVyeSkpXG5cdFx0XHQudGhlbigoZGF0YSkgPT4ge1xuXHRcdFx0XHRpZiAoZGF0YS5sZW5ndGggIT0wICkge1xuXHRcdFx0XHRcdHRoaXMuZmV0Y2hDb2xsYWIoZGF0YSk7XG5cdFx0XHRcdH1cblx0XHRcdFx0ZWxzZSB7XG5cdFx0XHRcdFx0JCgnLmNvbGxhYi1saXN0JykuZW1wdHkoKTtcblx0XHRcdFx0XHQkKCcuY29sbGFiLWxpc3QnKVxuXHRcdFx0XHRcdC5hcHBlbmQoZW1wdHlHaWZEaXYoKSk7XG5cdFx0XHRcdH1cblx0XHRcdH0pO1xuXHR9XG5cdGVsc2Uge1xuXHRcdC8vIGNvbnNvbGUubG9nKCd0b3BpYycsIHRvcGljcyk7XG5cdFx0Ly8gcmVwb3MgPSAncT1zdHJpbmcxK3N0cmluZzIrLi4uK3N0cmluZ04raW46bmFtZSxkZXNjcmlwdGlvbitsYW5ndWFnZTpsYW5nMSt0b3BpYzp0b3BpYzErdG9waWMyKy4uLit0b3BpY04nO1xuXHRcdC8vIHRvcGljIGlzIG9wdGlvbmFsIHRvcGljOiR7Xy5qb2luKHRvcGljcywnK3RvcGljOicpfSBpc1xuXHRcdGxldCBsb29rSW4gPSBbJ25hbWUnLCAnZGVzY3JpcHRpb24nLCAncmVhZG1lJ107XG5cdFx0bGV0IHF1ZXJ5ID0gYCR7Xy5qb2luKHRvcGljcywgJysnKX0raW46JHtfLmpvaW4obG9va0luLCAnLCcpfWA7XG5cdFx0Ly8gY29uc29sZS5sb2cocXVlcnkpO1xuXHRcdGlmIChjb250ZW50ICE9PSAncHJvamVjdCcgfHwgY29udGVudCA9PT0gdW5kZWZpbmVkKSB7XG5cdFx0XHQkLndoZW4odGhpcy5mZXRjaFJlcG9zKHF1ZXJ5KSlcblx0XHRcdC50aGVuKChkYXRhKSA9PiB7XG5cdFx0XHRcdGlmIChkYXRhLml0ZW1zLmxlbmd0aCAhPTAgKSB7XG5cdFx0XHRcdFx0dGhpcy5mZXRjaENvbGxhYihkYXRhKTtcblx0XHRcdFx0fVxuXHRcdFx0XHRlbHNlIHtcblx0XHRcdFx0XHQkKCcuY29sbGFiLWxpc3QnKS5lbXB0eSgpO1xuXHRcdFx0XHRcdCQoJy5jb2xsYWItbGlzdCcpLmFwcGVuZChlbXB0eUdpZkRpdigpKTtcblx0XHRcdFx0fVxuXHRcdFx0fSk7XG5cdFx0fVxuXHRcdGVsc2Uge1xuXHRcdFx0JC53aGVuKHRoaXMuZmV0Y2hSZXBvcyhxdWVyeSkpXG5cdFx0XHQudGhlbigoZGF0YSkgPT4ge1xuXHRcdFx0XHRpZiAoZGF0YS5pdGVtcy5sZW5ndGggIT0gMCkge1xuXHRcdFx0XHRcdC8vIEFsbG93IG92ZXJmbG93LXkgc28gYWpheCBsb2FkaW5nIGNhbiBmdW5jdGlvblxuXHRcdFx0XHRcdCQoJ2JvZHknKS5jc3MoJ292ZXJmbG93LXknLCAnc2Nyb2xsJyk7XG5cblx0XHRcdFx0XHQvLyBSZW1vdmUgdGhlIGxvYWRpbmcgZ2lmXG5cdFx0XHRcdFx0JCgnLmxvYWRpbmctZ2lmJykucmVtb3ZlKCk7XG5cdFx0XHRcdFx0JCgnLm5vdGhpbmctZ2lmJykucmVtb3ZlKCk7XG5cdFx0XHRcdFx0JCgnLm5vdGhpbmctcCcpLnJlbW92ZSgpO1xuXG5cdFx0XHRcdFx0Ly8gQWRkIGhlYWRlclxuXHRcdFx0XHRcdCQoJy5iLWZpbmRQcm9qZWN0LXBhZ2VfX2hlYWRpbmcnKS5jc3MoJ3Zpc2liaWxpdHknLCAndmlzaWJsZScpO1xuXHRcdFx0XHRcdCQod2luZG93KS51bmJpbmQoJ3Njcm9sbCcpO1xuXHRcdFx0XHRcdGxldCBjYWxsYmFjayA9IHRoaXMudXBkYXRlUHJvamVjdExpc3QoZGF0YS5pdGVtcyk7XG5cdFx0XHRcdFx0Y2FsbGJhY2soKTtcblx0XHRcdFx0XHR0aHJvdHRsZVBhZ2VDb250ZW50KGNhbGxiYWNrKTtcblx0XHRcdFx0XHRjb25zb2xlLmxvZygnZG9uZSBmZXRjaGluZycpO1xuXHRcdFx0XHR9XG5cdFx0XHRcdGVsc2Uge1xuXHRcdFx0XHRcdCQoJy5wcm9qZWN0LWxpc3QnKS5lbXB0eSgpO1xuXHRcdFx0XHRcdCQoJy5wcm9qZWN0LWxpc3QnKS5hcHBlbmQoZW1wdHlHaWZEaXYoKSk7XG5cdFx0XHRcdH1cblx0XHRcdH0pO1xuXHRcdH1cblx0fVxufVxuLy8gRmV0Y2ggYWxsIGdpdCB1c2VycyB3aG8gaGF2ZSBjb250cmlidXRlZCB0b1xuLy8gcmVwb3Mgc2ltaWxhciB0byBwYXNzZWQgaW4gcXVlcnkgdmFsdWVzXG5teUFwcC5mZXRjaENvbGxhYiA9IGZ1bmN0aW9uKGRhdGEpIHtcblx0bGV0IHRvcFJlcG9zID0gZGF0YS5pdGVtcztcblx0Ly8gY29uc29sZS5sb2coJ3JlbGF0ZWQgcmVwb3MnLCB0b3BSZXBvcyk7XG5cdGxldCBjb250cmlidXRvckxpc3QgPSBbXTtcblxuXHRpZiAodG9wUmVwb3MubGVuZ3RoIDwgNSl7XG5cdFx0Ly8gRmluZCBjb250cmlidXRvcnMgZnJvbSB0aGUgcmVwb3Mgd2hlbiB0aGUgcmVzdWx0IGlzIGxlc3MgdGhhbiA1XG5cdFx0Zm9yIChsZXQgaSA9IDA7IGkgPCB0b3BSZXBvcy5sZW5ndGg7IGkrKykge1xuXHRcdFx0Y29udHJpYnV0b3JMaXN0LnB1c2godGhpcy5mZXRjaFVybEluZm8odG9wUmVwb3NbaV0uY29udHJpYnV0b3JzX3VybCwgZmFsc2UpKTtcblx0XHR9XG5cdH1cblx0ZWxzZSB7XG5cdFx0Ly8gRmluZCBjb250cmlidXRvcnMgZnJvbSB0aGUgcmVwb3Mgd2hlbiB0aGUgcmVzdWx0IGlzIG1vcmUgdGhhbiA1XG5cdFx0Zm9yIChsZXQgaSA9IDA7IGkgPCA1OyBpKyspIHtcblx0XHRcdGNvbnRyaWJ1dG9yTGlzdC5wdXNoKHRoaXMuZmV0Y2hVcmxJbmZvKHRvcFJlcG9zW2ldLmNvbnRyaWJ1dG9yc191cmwsIGZhbHNlKSk7XG5cdFx0fVxuXHR9XG5cdFByb21pc2UuYWxsKGNvbnRyaWJ1dG9yTGlzdClcblx0LnRoZW4oKGRhdGEpID0+IHtcblx0XHQvLyBBbGxvdyBvdmVyZmxvdy15IHNvIGFqYXggbG9hZGluZyBjYW4gZnVuY3Rpb25cblx0XHQkKCdib2R5JykuY3NzKCdvdmVyZmxvdy15JywgJ3Njcm9sbCcpO1xuXG5cdFx0Ly8gUmVtb3ZlIHRoZSBsb2FkaW5nIGdpZlxuXHRcdCQoJy5sb2FkaW5nLWdpZicpLnJlbW92ZSgpO1xuXHRcdCQoJy5ub3RoaW5nLWdpZicpLnJlbW92ZSgpO1xuXHRcdCQoJy5ub3RoaW5nLXAnKS5yZW1vdmUoKTtcblxuXHRcdC8vIEFkZCBoZWFkZXJcblx0XHQkKCcuYi1maW5kQ29sbGFiLXBhZ2VfX2hlYWRpbmcnKS5jc3MoJ3Zpc2liaWxpdHknLCAndmlzaWJsZScpO1xuXHRcdC8vIEhhdmUgdG8gY2xlYXIgYW55IHByZXZpb3VzIHNjcm9sbCBoYW5kbGVyc1xuXHRcdCQod2luZG93KS51bmJpbmQoJ3Njcm9sbCcpO1xuXHRcdGxldCBjYWxsYmFjayA9IHRoaXMudXBkYXRlQ29sbGFiTGlzdChfLmZsYXR0ZW4oZGF0YSkpO1xuXHRcdC8vIEFwcGVuZCB0aGUgZmlyc3QgNiByZXN1bHRzIGFuZCB0aGVuIHBhc3MgdGhlIHJlc3BvbnNpYmxpdHkgdG9cblx0XHQvLyB0aGUgdGhyb3R0bGUgZnVuY3Rpb25cblx0XHRjYWxsYmFjaygpO1xuXHRcdHRocm90dGxlUGFnZUNvbnRlbnQoY2FsbGJhY2spO1xuXHR9KVxuXHQuY2F0Y2goKGVycikgPT4ge1xuXHRcdGNvbnNvbGUubG9nKCdlcnJvciBnZXR0aW5nIGNvbnRyaWJ1dG9ycycpO1xuXHR9KTtcbn1cblxuLy8gRWl0aGVyIHRoZSBwYXNzZWQgaW4gZGF0YSBpcyBmaWx0ZXJlZFxuLy8gYW5kIGFkZCB0aGUgZGF0YSB0byB0aGUgZG9tXG4vLyBvciB0aGUgZGF0YSBpcyBub3QgZmlsdGVyZWQsIHNvIGl0IG5lZWRzXG4vLyB0byBiZSBmaWx0ZXJlZCwgdGhlbiBhZGRlZCB0byB0aGUgZG9tXG5teUFwcC51cGRhdGVDb2xsYWJMaXN0ID0gZnVuY3Rpb24oY29sbGFib3JhdG9ycykge1xuXHR2YXIgcHJldiA9IDA7XG5cdHZhciBuZXh0ID0gMDtcblx0Ly8gY29uc29sZS5sb2coJ3RvcCcsIGNvbGxhYm9yYXRvcnMpO1xuXHRyZXR1cm4gKCkgPT4ge1xuXHRcdC8vIFJlbW92ZSBwcmV2aW91cyBjb2xsYWJvcmF0b3IgbGlzdFxuXHRcdHByZXYgPSBuZXh0O1xuXHRcdG5leHQrPTY7XG5cdFx0bGV0IGN1cnJlbnRDb2xsYWJvcmF0b3JzID0gW107XG5cdFx0Ly8gY29uc29sZS5sb2coJ2FsbCcsIGNvbGxhYm9yYXRvcnMpO1xuXHRcdC8vIGNvbnNvbGUubG9nKCdwcmV2JywgcHJldiwgJ25leHQnLCBuZXh0KTtcblxuXHRcdGlmIChuZXh0IDw9IGNvbGxhYm9yYXRvcnMubGVuZ3RoKSB7XG5cdFx0XHRjdXJyZW50Q29sbGFib3JhdG9ycyA9IF8uc2xpY2UoY29sbGFib3JhdG9ycywgcHJldiwgbmV4dCk7XG5cdFx0fVxuXHRcdGVsc2Uge1xuXHRcdFx0Y3VycmVudENvbGxhYm9yYXRvcnMgPSBfLnNsaWNlKGNvbGxhYm9yYXRvcnMsIHByZXYsIGNvbGxhYm9yYXRvcnMubGVuZ3RoKTtcblx0XHR9XG5cblx0XHQvLyBjb25zb2xlLmxvZygnY3VycmVudCBsaXN0JywgY3VycmVudENvbGxhYm9yYXRvcnMpO1xuXHRcdF8uZm9yRWFjaChjdXJyZW50Q29sbGFib3JhdG9ycywgKGNvbGxhYm9yYXRvcikgPT4ge1xuXHRcdFx0bGV0ICRsaSA9ICQoJzxsaT4nKVxuXHRcdFx0XHRcdC5hdHRyKCdjbGFzcycsICdjb2xsYWItbGlzdF9faXRlbScpXG5cdFx0XHRcdFx0LmFwcGVuZCh0aGlzLmdlbmVyYXRlVXNlckNhcmQoY29sbGFib3JhdG9yKSk7XG5cblx0XHRcdCQoJy5jb2xsYWItbGlzdCcpLmFwcGVuZCgkbGkpO1xuXHRcdH0pO1xuXHR9XG59XG5teUFwcC51cGRhdGVQcm9qZWN0TGlzdCA9IGZ1bmN0aW9uKHByb2plY3RzKSB7XG5cdHZhciBwcmV2ID0gMDtcblx0dmFyIG5leHQgPSAwO1xuXG5cdHJldHVybiAoKSA9PiB7XG5cdFx0cHJldiA9IG5leHQ7XG5cdFx0bmV4dCs9Njtcblx0XHRsZXQgY3VycmVudFByb2plY3RzID0gW11cblx0XHQvLyBjb25zb2xlLmxvZygnYWxsJywgcHJvamVjdHMpO1xuXHRcdGNvbnNvbGUubG9nKCdwcmV2JywgcHJldiwgJ25leHQnLCBuZXh0KTtcblxuXHRcdGlmIChuZXh0IDw9IHByb2plY3RzLmxlbmd0aCkge1xuXHRcdFx0Y3VycmVudFByb2plY3RzID0gXy5zbGljZShwcm9qZWN0cywgcHJldiwgbmV4dCk7XG5cdFx0fVxuXHRcdGVsc2Uge1xuXHRcdFx0Y3VycmVudFByb2plY3RzID0gXy5zbGljZShwcm9qZWN0cywgcHJldiwgcHJvamVjdHMubGVuZ3RoKTtcblx0XHR9XG5cblx0XHQvLyBjb25zb2xlLmxvZygnY3VycmVudCBsaXN0JywgY3VycmVudFByb2plY3RzKTtcblx0XHRfLmZvckVhY2goY3VycmVudFByb2plY3RzLCAocHJvamVjdCkgPT4ge1xuXHRcdFx0bGV0ICRsaSA9ICQoJzxsaT4nKVxuXHRcdFx0XHRcdC5hdHRyKCdjbGFzcycsICdwcm9qZWN0LWxpc3RfX2l0ZW0nKVxuXHRcdFx0XHRcdC5hcHBlbmQodGhpcy5nZW5lcmF0ZVByb2plY3RDYXJkKHByb2plY3QpKTtcblxuXHRcdFx0JCgnLnByb2plY3QtbGlzdCcpLmFwcGVuZCgkbGkpO1xuXHRcdH0pO1xuXHR9XG59XG5teUFwcC5nZW5lcmF0ZVVzZXJDYXJkID0gZnVuY3Rpb24oYykge1xuXHR2YXIgJGRpdiA9ICQoJzxkaXY+Jylcblx0XHRcdFx0LmF0dHIoJ2NsYXNzJywgJ3VzZXItY2FyZCcpXG5cblx0dmFyICRhdmF0YXIgPSAkKCc8aW1nPicpXG5cdFx0XHRcdFx0LmF0dHIoJ2NsYXNzJywgJ3VzZXItY2FyZF9fYXZhdGFyJylcblx0XHRcdFx0XHQuYXR0cignc3JjJywgYy5hdmF0YXJfdXJsKTtcblxuXHR2YXIgJHVzZXJJbmZvID0gJCgnPGRpdj4nKVxuXHRcdFx0XHRcdC5hdHRyKCdjbGFzcycsICd1c2VyLWluZm8nKTtcblx0dmFyICR1c2VyTmFtZSA9ICQoJzxoMz4nKVxuXHRcdFx0XHRcdC5hdHRyKCdjbGFzcycsICd1c2VyLWluZm9fX3VzZXJuYW1lJylcblx0XHRcdFx0XHQudGV4dChjLmxvZ2luKTtcblx0dmFyICR1c2VyTGluayA9ICQoJzxhPicpXG5cdFx0XHRcdFx0LmF0dHIoe1xuXHRcdFx0XHRcdFx0Y2xhc3M6ICd1c2VyLWluZm9fX2xpbmsnLFxuXHRcdFx0XHRcdFx0aHJlZjogYy5odG1sX3VybCxcblx0XHRcdFx0XHRcdHRhcmdldDogJ19ibGFuaydcblx0XHRcdFx0XHR9KVxuXHRcdFx0XHRcdC50ZXh0KCdWaWV3IFByb2ZpbGUnKTtcblxuXHQkdXNlckluZm8uYXBwZW5kKCR1c2VyTmFtZSwgJHVzZXJMaW5rKTtcblx0JGRpdi5hcHBlbmQoJGF2YXRhciwgJHVzZXJJbmZvKTtcblx0cmV0dXJuICRkaXY7XG59XG5teUFwcC5nZW5lcmF0ZVByb2plY3RDYXJkID0gZnVuY3Rpb24ocCkge1xuXHR2YXIgc3RhdHVzID0gWydmb3JrcycsICdzdGFyZ2F6ZXJzX2NvdW50JywgJ3dhdGNoZXJzJ11cblx0dmFyICRsaW5rID0gJCgnPGE+Jylcblx0XHRcdFx0LmF0dHIoe1xuXHRcdFx0XHRcdGNsYXNzOiAncHJvamVjdC1saW5rJyxcblx0XHRcdFx0XHRocmVmOiBgJHtwLmh0bWxfdXJsfWAsXG5cdFx0XHRcdFx0dGFyZ2V0OiAnX2JsYW5rJ1xuXHRcdFx0XHR9KTtcblx0dmFyICRkaXYgPSAkKCc8ZGl2PicpXG5cdFx0XHRcdC5hdHRyKCdjbGFzcycsICdwcm9qZWN0LWNhcmQnKVxuXG5cdHZhciAkYXZhdGFyID0gJCgnPGltZz4nKVxuXHRcdFx0XHRcdC5hdHRyKCdjbGFzcycsICdwcm9qZWN0LWNhcmRfX2F2YXRhcicpXG5cdFx0XHRcdFx0LmF0dHIoJ3NyYycsIHAub3duZXIuYXZhdGFyX3VybCk7XG5cblx0dmFyICRwcm9qZWN0TmFtZSA9ICQoJzxoMz4nKVxuXHRcdFx0XHRcdFx0LmF0dHIoJ2NsYXNzJywgJ3Byb2plY3QtY2FyZF9fcHJvamVjdE5hbWUnKVxuXHRcdFx0XHRcdFx0LnRleHQocC5uYW1lKTtcblxuXHR2YXIgJHByb2plY3RQb3B1bGFyaXR5TGlzdCA9ICQoJzx1bD4nKVxuXHRcdFx0XHRcdFx0XHRcdC5hdHRyKCdjbGFzcycsICdwcm9qZWN0LXBvcC1saXN0Jyk7XG5cdGZvciAobGV0IGkgPSAwOyBpIDwgMzsgaSsrKSB7XG5cdFx0bGV0ICRsaSA9ICQoJzxsaT4nKVxuXHRcdFx0XHRcdC5hdHRyKCdjbGFzcycsICdwcm9qZWN0LXBvcC1saXN0X19pdGVtJyk7XG5cdFx0bGV0ICRwb3BJdGVtID0gJCgnPGRpdj4nKVxuXHRcdFx0XHRcdFx0LmF0dHIoJ2NsYXNzJywgYHBvcC1pdGVtIHBvcC1pdGVtLS0ke3N0YXR1c1tpXX1gKTtcblx0XHRsZXQgJGg1ID0gJCgnPGg1PicpXG5cdFx0XHRcdFx0LmF0dHIoJ2NsYXNzJywgJ3BvcC1pdGVtX19oZWFkaW5nJylcblx0XHRcdFx0XHQuYXBwZW5kKGAke3N0YXR1c1tpXX06YCk7XG5cdFx0bGV0ICRwID0gJCgnPHA+Jylcblx0XHRcdFx0XHQuYXR0cignY2xhc3MnLCAncG9wLWl0ZW1fX3F0eScpXG5cdFx0XHRcdFx0LmFwcGVuZChgJHtwW3N0YXR1c1tpXV19YCk7XG5cblx0XHQkcG9wSXRlbS5hcHBlbmQoJGg1LCAkcCk7XG5cdFx0JGxpLmFwcGVuZCgkcG9wSXRlbSk7XG5cdFx0JHByb2plY3RQb3B1bGFyaXR5TGlzdC5hcHBlbmQoJGxpKTtcblx0fVxuXHQkZGl2LmFwcGVuZCgkYXZhdGFyLCAkcHJvamVjdE5hbWUsICRwcm9qZWN0UG9wdWxhcml0eUxpc3QpO1xuXHQkbGluay5hcHBlbmQoJGRpdik7XG5cdHJldHVybiAkbGluaztcblxufVxubXlBcHAudm9pY2VTZWFyY2ggPSBmdW5jdGlvbih0b3BpY3MsIGNvbnRlbnQpIHtcblx0Y29uc29sZS5sb2coJ2luc2lkZScsIHRvcGljcylcblx0aWYgKGNvbnRlbnQgPT09ICdwcm9qZWN0Jykge1xuXHRcdHRoaXMuZmV0Y2hSZXBvc0dpdGh1YigndG9waWNzJywgJycsIHRvcGljcywgY29udGVudCk7XG5cdH1cblx0ZWxzZSB7XG5cdFx0dGhpcy5mZXRjaFJlcG9zR2l0aHViKCd0b3BpY3MnLCAnJywgdG9waWNzKTtcblx0fVxufVxuXG4kKGZ1bmN0aW9uKCl7XG5cdHdpbmRvdy5teUFwcCA9IG15QXBwO1xuXHQvLyBDcmVkaXRzIGdvZXMgdG8gTWFnbmFyIGZyb21cblx0Ly8gaHR0cHM6Ly9zdGFja292ZXJmbG93LmNvbS9xdWVzdGlvbnMvOTIwMjM2L2hvdy1jYW4taS1kZXRlY3QtaWYtYS1zZWxlY3Rvci1yZXR1cm5zLW51bGxcblx0JC5mbi5leGlzdHMgPSBmdW5jdGlvbiAoKSB7IHJldHVybiB0aGlzLmxlbmd0aCAhPT0gMDsgfVxuXG5cdC8vIEluaXRpYWxpemUgbXlBcHAgb2JqZWN0XG5cdG15QXBwLmluaXQoKTtcblxuXHQvLyBBZnRlciBpbml0aWFsaXppbmcgbXlBcHAgc2V0dXAgdm9pY2UgcmVjb2duaXRpb25cblx0aWYgKGFubnlhbmcpIHtcblx0XHRhbm55YW5nLmRlYnVnKHRydWUpO1xuXHQgIC8vIERlZmluZSB2b2ljZSBjb21tYW5kcyBhbmQgaXRzIGFwcHJvcHJpYXRlIGZ1bmN0aW9uXG5cdCAgdmFyIGNvbW1hbmRzID0ge1xuXHQgICAgJ3NlYXJjaCAqJzogZnVuY3Rpb24oYWN0aW9uKSB7XG5cdCAgICBcdGNvbnNvbGUubG9nKCdmaW5kaW5nICcsIGFjdGlvbik7XG5cdCAgICBcdCQoJyNmaW5kJylbMF0ucGxheSgpO1xuXHQgICAgXHQvLyBSZW5kZXIgZmluZENvbGxhYiBQYWdlXG5cdCAgICBcdG15QXBwLmhhbmRsZUNvbGxhYk9yUHJvamVjdCgnZmluZENvbGxhYicpO1xuXHQgICAgfSxcblx0ICAgICdjaGVjayAqJzogIGZ1bmN0aW9uKGFjdGlvbikge1xuXHQgICAgXHRjb25zb2xlLmxvZygnc2VhcmNoaW5nICcsIGFjdGlvbik7XG5cdFx0ICAgICQoJyNzZWFyY2gnKVswXS5wbGF5KCk7XG5cdFx0ICAgIC8vIFJlbmRlciBmaW5kU2VhcmNoIFBhZ2Vcblx0ICAgIFx0bXlBcHAuaGFuZGxlQ29sbGFiT3JQcm9qZWN0KCdmaW5kUHJvamVjdCcpO1xuXHQgICAgfSxcblx0ICAgICdwcm9qZWN0IHRvcGljcyAqYWN0aW9uJzogIGZ1bmN0aW9uKGFjdGlvbikge1xuXHQgICAgXHRjb25zb2xlLmxvZygndG9waWNzICcpO1xuXHQgICAgXHQkKCcjc2VhcmNoaW5nJylbMF0ucGxheSgpO1xuXHRcdFx0XHQvLyBDbGVhciBsaXN0IHdoZW4gYSBuZXcgc2VhcmNoIGlzIG1hZGVcblx0XHRcdFx0JCgnLnByb2plY3QtbGlzdCcpLmVtcHR5KCk7XG5cblx0ICAgIFx0Ly8gRXhlY3V0ZWQgdG9waWMgc2VhcmNoIGZvciBwcm9qZWN0XG5cdCAgICBcdG15QXBwLnZvaWNlU2VhcmNoKF8uc3BsaXQoYWN0aW9uLCBcIiBcIiksIFwicHJvamVjdFwiKTtcblx0ICAgIFx0c2V0VGltZW91dCgoKSA9PiAkKCcjZmluaXRvJylbMF0ucGxheSgpLCAxMDAwKTtcblx0ICAgIH0sXG5cdCAgICAndG9waWNzICphY3Rpb24nOiAgZnVuY3Rpb24oYWN0aW9uKSB7XG5cdCAgICBcdGNvbnNvbGUubG9nKCd0b3BpY3MgJyk7XG5cdCAgICBcdCQoJyNzZWFyY2hpbmcnKVswXS5wbGF5KCk7XG5cdFx0XHRcdC8vIENsZWFyIGxpc3Qgd2hlbiBhIG5ldyBzZWFyY2ggaXMgbWFkZVxuXHRcdFx0XHQkKCcuY29sbGFiLWxpc3QnKS5lbXB0eSgpO1xuXG5cdCAgICBcdC8vIEV4ZWN1dGVkIHRvcGljIHNlYXJjaCBmb3IgY29sbGFib3JhdG9yc1xuXHQgICAgXHRteUFwcC52b2ljZVNlYXJjaChfLnNwbGl0KGFjdGlvbiwgXCIgXCIpKTtcblx0ICAgIFx0c2V0VGltZW91dCgoKSA9PiAkKCcjZmluaXRvJylbMF0ucGxheSgpLCAxMDAwKTtcblx0ICAgIH1cblx0ICB9O1xuXHQgIC8vIEFkZCBteSBjb21tYW5kcyB0byBhbm55YW5nXG5cdFx0YW5ueWFuZy5hZGRDb21tYW5kcyhjb21tYW5kcyk7XG5cblx0XHQkKCcjYW5ueWFuZy1hY3RpdmUnKS5vbignY2xpY2snLCBmdW5jdGlvbigpIHtcblx0XHRcdGlmIChhbm55YW5nLmlzTGlzdGVuaW5nKCkpIHtcblx0XHRcdFx0YW5ueWFuZy5hYm9ydCgpO1xuXHRcdFx0XHQkKCcuZmluZENvbGxhYi1jb21tYW5kJykuYW5pbWF0ZSh7XCJvcGFjaXR5XCI6IDB9LCA3MDApO1xuXHRcdFx0XHQkKCcuZmluZFByb2plY3QtY29tbWFuZCcpLmFuaW1hdGUoe1wib3BhY2l0eVwiOiAwfSwgNzAwKTtcblx0XHRcdFx0JCh0aGlzKVxuXHRcdFx0XHQuaHRtbCgnQWN0aXZhdGUgVm9pY2UgQ29tbWFuZCcpXG5cdFx0XHRcdC5jc3MoXCJiYWNrZ3JvdW5kLWNvbG9yXCIsIFwiI0ZFM0Y4MFwiKTtcblx0XHRcdH1cblx0XHRcdGVsc2Uge1xuXHRcdFx0XHRhbm55YW5nLnN0YXJ0KCk7XG5cblx0XHRcdFx0Ly8gU3RhcnQgbGlzdGVuaW5nLiBZb3UgY2FuIGNhbGwgdGhpcyBoZXJlLCBvciBhdHRhY2ggdGhpcyBjYWxsIHRvIGFuIGV2ZW50LCBidXR0b24sIGV0Yy5cblx0XHRcdFx0YWxlcnQoJ1dhcm5pbmc6IFRoZSB2b2ljZSByZWNvZ25pdGlvbiBmdW5jdGlvbiBpcyBleHBlcmltZW50YWwsIGl0IHdpbGwgbm90IHdvcmsgcHJvcGVybHkgaW4gYSBub2lzZXkgZW52aXJvbmVtZW50LicpO1xuXHRcdFx0XHQkKCcuZmluZENvbGxhYi1jb21tYW5kJykuYW5pbWF0ZSh7XCJvcGFjaXR5XCI6IDF9LCA3MDApO1xuXHRcdFx0XHQkKCcuZmluZFByb2plY3QtY29tbWFuZCcpLmFuaW1hdGUoe1wib3BhY2l0eVwiOiAxfSwgNzAwKTtcblx0XHRcdFx0JCh0aGlzKVxuXHRcdFx0XHQuaHRtbCgnRGVhY3RpdmF0ZSBWb2ljZSBDb21tYW5kJylcblx0XHRcdFx0LmNzcyhcImJhY2tncm91bmQtY29sb3JcIiwgXCIjQzExODVBXCIpO1xuXHRcdFx0fVxuXHRcdFx0Ly8gJCh0aGlzKS5yZXBsYWNlV2l0aCgnPGJ1dHRvbiBpZD1cImFubnlhbmctYWJvcnRcIj5EZWFjdGl2YXRlIFZvaWNlIENvbW1hbmQ8L2J1dHRvbj4nKVxuXHRcdH0pO1xuXHR9XG59KTtcbiIsImNvbnN0IF9waXBlID0gKGYsZykgPT4gKC4uLmFyZ3MpID0+IGcoZiguLi5hcmdzKSk7XG5leHBvcnQgY29uc3QgcGlwZSA9ICguLi5mdW5jcykgPT4gZnVuY3MucmVkdWNlKF9waXBlKTtcblxuY29uc3QgZ2V0SHRtbENvbnRlbnQgPSAocGFnZU5hbWUpID0+IHtcbiAgLy8gR2V0IHRoZSBodG1sIGNvbnRlbnQgYmFzZWQgb24gdGhlIHBhZ2UgbmFtZVxuICBpZiAocGFnZU5hbWUgPT09ICdmaW5kQ29sbGFiJyB8fCBwYWdlTmFtZSA9PT0gJ2ZpbmRQcm9qZWN0Jykge1xuICAgICQoJ2JvZHknKS5jc3MoJ292ZXJmbG93LXknLCAnaGlkZGVuJyk7XG4gIH1cbiAgcmV0dXJuIF8uZmluZChteUFwcC5odG1sUGFnZXMsIFsncGFnZU5hbWUnLCBwYWdlTmFtZV0pLmh0bWxDb250ZW50O1xufVxuY29uc3QgcmVuZGVyUGFnZSA9IChodG1sUGFnZSkgPT4ge1xuICAvLyBUaGlzIGZ1bmN0aW9uIGlzIHJlc3BvbnNpYmxlIGZvciBkeW5hbWljYWxseSByZW5kZXJpbmcgbmV3IHBhZ2VzIG9mIHRoZSBhcHBsaWNhdGlvblxuICAvLyBBbmQgZm9yIGluaXRpYWxpemluZyBhbnkgcGx1Z2lucyB1c2VkIGJ5IHRoZSBwYWdlXG5cbiAgLy8gQXBwZW5kcyB0aGUgYmFzZWQgaW4gaHRtbCBjb250ZW50IHRvIHRoZSBtYWluIGNvbnRhaW5lclxuXHQkKCcuY29udGFpbmVyJykuaHRtbChodG1sUGFnZSk7XG5cblx0Ly8gVGhlIGNvZGUgaXMgdXNlZCB0byBpbml0aWFsaXplIHRoZSBpbnB1dCB0YWcgZm9yIGNvbGxhYm9yYXRpb24gcGFnZVxuXHRpZiAoJChcIiN0YWdzXCIpLmV4aXN0cygpKSB7XG5cdFx0JCgnI3RhZ3MnKS50YWdFZGl0b3Ioe1xuXHRcdFx0cGxhY2Vob2xkZXI6ICdFbnRlciB0b3BpY3MgLi4uJ1xuXHRcdH0pO1xuXHR9XG59XG5leHBvcnQgY29uc3QgZ2VuZXJhdGVDYXJkID0gKGNhcmROYW1lKSA9PiB7XG4gIHZhciBjYXJkcyA9IFtdO1xuXHR2YXIgJGZpbmRDb2xsYWJDYXJkID0gJCgnPGRpdj4nKVxuXHRcdFx0XHRcdC5hdHRyKHtcblx0XHRcdFx0XHRcdCdjbGFzcyc6ICdiLWNob2ljZS1jYXJkIGItY2hvaWNlLWNhcmQtLWZpbmRDb2xsYWInLFxuXHRcdFx0XHRcdFx0J2RhdGEtY2FyZE5hbWUnOiAnZmluZENvbGxhYidcblx0XHRcdFx0XHR9KTtcblx0dmFyICRmaW5kUHJvamVjdENhcmQgPSAkKCc8ZGl2PicpXG5cdFx0XHRcdFx0LmF0dHIoe1xuXHRcdFx0XHRcdFx0J2NsYXNzJzogJ2ItY2hvaWNlLWNhcmQgYi1jaG9pY2UtY2FyZC0tZmluZFByb2plY3QnLFxuXHRcdFx0XHRcdFx0J2RhdGEtY2FyZE5hbWUnOiAnZmluZFByb2plY3QnXG5cdFx0XHRcdFx0fSk7XG5cblx0dmFyICRmY19sb2dvID0gJCgnPGltZz4nKVxuXHRcdFx0XHRcdC5hdHRyKHtcblx0XHRcdFx0XHRcdGNsYXNzOiAnYi1jaG9pY2UtY2FyZF9fbG9nbyBiLWNob2ljZS1jYXJkX19sb2dvLS1maW5kQ29sbGFiJyxcblx0XHRcdFx0XHRcdHNyYzogJy4vaW1nL2ZpbmRDb2xsYWJfdy5zdmcnXG5cdFx0XHRcdFx0fSk7XG5cdHZhciAkZnBfbG9nbyA9ICQoJzxpbWc+Jylcblx0XHRcdFx0XHQuYXR0cih7XG5cdFx0XHRcdFx0XHRjbGFzczogJ2ItY2hvaWNlLWNhcmRfX2xvZ28gYi1jaG9pY2UtY2FyZF9fbG9nby0tZmluZFByb2plY3QnLFxuXHRcdFx0XHRcdFx0c3JjOiAnLi9pbWcvZmluZFByb2plY3Quc3ZnJ1xuXHRcdFx0XHRcdH0pO1xuXG5cdHZhciAkZmNfaGVhZGluZyA9ICQoJzxoMz4nKVxuXHRcdFx0XHRcdC5hdHRyKCdjbGFzcycsICdiLWNob2ljZS1jYXJkX19oZWFkaW5nIGItY2hvaWNlLWNhcmRfX2hlYWRpbmctLWZpbmRDb2xsYWInKVxuXHRcdFx0XHRcdC50ZXh0KCdmaW5kIHlvdXIgbmV4dCBjb2xsYWJvcmF0b3JzJyk7XG5cdHZhciAkZnBfaGVhZGluZyA9ICQoJzxoMz4nKVxuXHRcdFx0XHRcdC5hdHRyKCdjbGFzcycsICdiLWNob2ljZS1jYXJkX19oZWFkaW5nIGItY2hvaWNlLWNhcmRfX2hlYWRpbmctLWZpbmRQcm9qZWN0Jylcblx0XHRcdFx0XHQudGV4dCgnRGlzY292ZXIgeW91ciBuZXh0IHByb2plY3QnKTtcblxuXHR2YXIgJGZjX3AgPSAkKCc8cD4nKVxuXHRcdFx0XHQuYXR0cignY2xhc3MnLCAnYi1jaG9pY2UtY2FyZF9fdGV4dCBiLWNob2ljZS1jYXJkX190ZXh0LS1maW5kQ29sbGFiJylcblx0XHRcdFx0LnRleHQoXCJGaW5kIGNvbGxhYm9yYXRvcnMgZm9yIHlvdXIgbmV4dCBwcm9qZWN0LlwiKTtcblx0dmFyICRmcF9wID0gJCgnPHA+Jylcblx0XHRcdFx0LmF0dHIoJ2NsYXNzJywgJ2ItY2hvaWNlLWNhcmRfX3RleHQgYi1jaG9pY2UtY2FyZF9fdGV4dC0tZmluZFByb2plY3QnKVxuXHRcdFx0XHQudGV4dChcIkV4cGxvcmUgdGhvdXNhbmRzIG9mIHByb2plY3RzIGhvc3RlZCBvbiBHaXRIdWIuXCIpO1xuXG4gIHZhciAkZmNfY29tbWFuZCA9ICQoJzxwPicpXG4gICAgICAgICAgICAgICAgICAgIC5hdHRyKCdjbGFzcycsICdmaW5kQ29sbGFiLWNvbW1hbmQnKVxuICAgICAgICAgICAgICAgICAgICAudGV4dCgnU2F5IFwiU2VhcmNoXCInKTtcbiAgdmFyICRmcF9jb21tYW5kID0gJCgnPHA+JylcbiAgICAgICAgICAgICAgICAgICAgLmF0dHIoJ2NsYXNzJywgJ2ZpbmRQcm9qZWN0LWNvbW1hbmQnKVxuICAgICAgICAgICAgICAgICAgICAudGV4dCgnU2F5IFwiQ2hlY2tcIicpO1xuXG4gXHQvLyBBcHBlbmQgY29udGVudCBpbnRvIGVhY2ggY2FyZHNcblx0JGZpbmRDb2xsYWJDYXJkLmFwcGVuZCgkZmNfbG9nbywgJGZjX2hlYWRpbmcsICRmY19wLCAkZmNfY29tbWFuZCk7XG5cdCRmaW5kUHJvamVjdENhcmQuYXBwZW5kKCRmcF9sb2dvLCAkZnBfaGVhZGluZywgJGZwX3AsICRmcF9jb21tYW5kKTtcblxuXHQvLyBDcmVhdGUgY2FyZCBvYmplY3RzIGFuZCBhZGRlZCB0byBhbiBhcnJheVxuXHQvLyBUaGUgYXJyYXkgd2lsbCBiZSB1c2VkIHRvIHJldHJpZXZlIHRoZSBhcHByb3ByaWF0ZSBjYXJkXG5cdGNhcmRzLnB1c2goXG5cdFx0e2NhcmROYW1lOiAnZmluZENvbGxhYicsIGNhcmQ6ICRmaW5kQ29sbGFiQ2FyZH1cblx0XHQse2NhcmROYW1lOiAnZmluZFByb2plY3QnLCBjYXJkOiAkZmluZFByb2plY3RDYXJkfSk7XG5cdHJldHVybiBfLmZpbmQoY2FyZHMsIFsnY2FyZE5hbWUnLCBjYXJkTmFtZV0pLmNhcmQ7XG59XG5jb25zdCBnZXRQYWdlQW5kUmVuZGVyID0gcGlwZShnZXRIdG1sQ29udGVudCwgcmVuZGVyUGFnZSk7XG5leHBvcnQgY29uc3QgcmVuZGVyID0gKHBhZ2VOYW1lKSA9PiBnZXRQYWdlQW5kUmVuZGVyKHBhZ2VOYW1lKTtcbmV4cG9ydCBjb25zdCBjbGVhblVybCA9ICh1cmwpID0+IF8udHJpbUVuZCh1cmwsICcvJykucmVwbGFjZSgnaHR0cHM6Ly9naXRodWIuY29tLycsICcnKTtcbmV4cG9ydCBjb25zdCBub3JtYWxpemVTdHJpbmdzID0gKGFycmF5T2ZTdHJpbmdzKSA9PiB7XG4gIC8vYWx3YXlzIHJldHVybnMgYW4gYXJyYXkgb2Ygc3RyaW5ncyBvciBhcnJheSBvZiBzdHJpbmcgdGhhdCBoYXMgYmVlbiB0cmFuc2Zvcm1lZCB0byBsb3dlcmNhc2VcbiAgaWYgKCFBcnJheS5pc0FycmF5KGFycmF5T2ZTdHJpbmdzKSkgeyByZXR1cm4gXy5jb25jYXQoW10sXy50b0xvd2VyKGFycmF5T2ZTdHJpbmdzKSk7IH1cblx0ZWxzZSB7XG5cdFx0cmV0dXJuIF8ubWFwKGFycmF5T2ZTdHJpbmdzLCAoc3RyaW5nKSA9PiB7XG5cdFx0XHRyZXR1cm4gXy50b0xvd2VyKHN0cmluZyk7XG5cdFx0fSk7XG5cdH1cbn1cbmV4cG9ydCBjb25zdCBnZXRNb3N0VXNlZExhbmd1YWdlID0gKGdpdGh1YkxhbmdPYmplY3QpID0+IHtcbiAgcmV0dXJuIF8uc29ydEJ5KFxuXHRcdFx0XHRfLmZpbHRlcihcblx0XHRcdFx0XHRfLm1hcChnaXRodWJMYW5nT2JqZWN0LCAodmFsLCBrZXkpID0+IHtcblx0XHRcdFx0XHRcdFx0cmV0dXJuIHsnbGFuZ3VhZ2UnOiBub3JtYWxpemVTdHJpbmdzKGtleSlbMF0sICdxdHknOiB2YWx9XG5cdFx0XHRcdFx0fSksIChvYmopID0+IHtcblx0XHRcdFx0XHRcdFx0IHJldHVybiBfLmluZGV4T2YobXlBcHAuYXZvaWRMYW5ndWFnZXMsIG9iai5sYW5ndWFnZSkgPCAwXG5cdFx0XHRcdFx0fSksICdxdHknKVswXS5sYW5ndWFnZTtcbn1cbmV4cG9ydCBjb25zdCBlbXB0eUdpZkRpdiA9ICgpID0+ICc8ZGl2IGNsYXNzPVwibm90aGluZy1naWZcIiBzdHlsZT1cIndpZHRoOjEwMCU7aGVpZ2h0OjEwMHB4O3BhZGRpbmctYm90dG9tOjU2JTtwb3NpdGlvbjpyZWxhdGl2ZTtcIj48aWZyYW1lIHNyYz1cImh0dHBzOi8vZ2lwaHkuY29tL2VtYmVkL3k2M0gwOVp2SEpkZjJcIiB3aWR0aD1cIjEwMCVcIiBoZWlnaHQ9XCI3MCVcIiBzdHlsZT1cInBvc2l0aW9uOmFic29sdXRlXCIgZnJhbWVCb3JkZXI9XCIwXCIgY2xhc3M9XCJnaXBoeS1lbWJlZFwiIGFsbG93RnVsbFNjcmVlbj48L2lmcmFtZT48L2Rpdj48cD48YSBocmVmPVwiaHR0cHM6Ly9naXBoeS5jb20vZ2lmcy9ub3RoaW5nLXk2M0gwOVp2SEpkZjJcIj52aWEgR0lQSFk8L2E+PC9wPidcbmV4cG9ydCBjb25zdCB0aHJvdHRsZVBhZ2VDb250ZW50ID0gKHVwZGF0ZUNvbnRlbnQpID0+IHtcbiAgJCh3aW5kb3cpLnNjcm9sbChmdW5jdGlvbiAoKSB7XG4gICAgICAgIGlmICgkKGRvY3VtZW50KS5oZWlnaHQoKSA8PSAkKHdpbmRvdykuc2Nyb2xsVG9wKCkgKyAkKHdpbmRvdykuaGVpZ2h0KCkpIHtcbiAgICAgICAgXHRjb25zb2xlLmxvZygnYWxtb3N0IGF0IHRoZSBib3R0b20nKTtcbiAgICAgICAgICAgIHVwZGF0ZUNvbnRlbnQoKTtcbiAgICAgICAgfVxuICAgIH0pO1xufVxuZXhwb3J0IGNvbnN0IHJlbW92ZVRhZ3MgPSAoKSA9PiB7XG4gIHZhciB0YWdzID0gJCgnI3RhZ3MnKS50YWdFZGl0b3IoJ2dldFRhZ3MnKVswXS50YWdzO1xuICBmb3IgKHZhciBpID0gMDsgaSA8IHRhZ3MubGVuZ3RoOyBpKyspIHsgJCgnI3RhZ3MnKS50YWdFZGl0b3IoJ3JlbW92ZVRhZycsIHRhZ3NbaV0pOyB9XG4gIHJldHVybiB0YWdzO1xufVxuIl19
