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

	var $homePageBtn = $('<a class="back-btn" href="/">home</a>');

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
	var $homePageBtn = $('<a class="back-btn" href="/">home</a>');

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
	console.log('top', collaborators);
	return function () {
		// Remove previous collaborator list
		prev = next;
		next += 6;
		var currentCollaborators = [];
		console.log('all', collaborators);
		console.log('prev', prev, 'next', next);

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
		console.log('all', projects);
		console.log('prev', prev, 'next', next);

		if (next <= projects.length) {
			currentProjects = _.slice(projects, prev, next);
		} else {
			currentProjects = _.slice(projects, prev, projects.length);
		}

		console.log('current list', currentProjects);
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJkZXYvc2NyaXB0cy9hcHAuanMiLCJkZXYvc2NyaXB0cy91dGlsLmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7QUNHQTs7QUFLQSxJQUFJLFFBQVEsRUFBWjs7QUFFQTtBQVZBO0FBQ0M7QUFDQTtBQVNELE1BQU0sU0FBTixHQUFrQix3QkFBbEI7QUFDQSxNQUFNLGtCQUFOLEdBQTJCLGdDQUEzQjtBQUNBLE1BQU0sb0JBQU4sR0FBNkIsMkNBQTdCO0FBQ0EsTUFBTSxTQUFOLEdBQWtCLEVBQWxCLEMsQ0FBc0I7O0FBRXRCLE1BQU0sT0FBTixHQUFnQixFQUFoQixDLENBQW9CO0FBQ3BCLE1BQU0sZ0JBQU4sR0FBeUIsRUFBekIsQyxDQUE2Qjs7QUFFN0IsTUFBTSxjQUFOLEdBQXVCLENBQUMsS0FBRCxFQUFRLE1BQVIsRUFBZ0IsT0FBaEIsRUFBeUIsTUFBekIsQ0FBdkIsQyxDQUF5RDtBQUN6RCxNQUFNLFdBQU4sR0FBb0IsRUFBcEIsQyxDQUF3Qjs7QUFFeEI7QUFDQTtBQUNBLE1BQU0sSUFBTixHQUFhLFlBQVc7QUFDdkIsTUFBSyxXQUFMO0FBQ0EsbUJBQU8saUJBQVA7QUFDQSxDQUhEOztBQUtBO0FBQ0EsTUFBTSxXQUFOLEdBQW9CLFlBQVc7QUFDOUIsTUFBSyxTQUFMLENBQWUsSUFBZixDQUFvQixLQUFLLGVBQUwsRUFBcEI7QUFDQSxNQUFLLFNBQUwsQ0FBZSxJQUFmLENBQW9CLEtBQUssVUFBTCxFQUFwQjtBQUNBLE1BQUssU0FBTCxDQUFlLElBQWYsQ0FBb0IsS0FBSyxXQUFMLEVBQXBCO0FBQ0EsQ0FKRDs7QUFNQTtBQUNBO0FBQ0EsTUFBTSxlQUFOLEdBQXdCLFlBQVc7QUFDbEM7QUFDQSxHQUFFLFlBQUYsRUFBZ0IsTUFBaEIsQ0FBdUIsT0FBdkI7O0FBRUE7QUFDQSxLQUFJLFdBQVcsRUFBRSxXQUFGLEVBQ1gsSUFEVyxDQUNOLE9BRE0sRUFDRyxn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SUFBSSxJQUFJLENBQWIsRUFBZ0IsSUFBSSxLQUFLLE1BQXpCLEVBQWlDLEdBQWpDLEVBQXNDO0FBQUUsSUFBRSxPQUFGLEVBQVcsU0FBWCxDQUFxQixXQUFyQixFQUFrQyxLQUFLLENBQUwsQ0FBbEM7QUFBNkM7QUFDckYsUUFBTyxJQUFQO0FBQ0QsQ0FKTSIsImZpbGUiOiJnZW5lcmF0ZWQuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlc0NvbnRlbnQiOlsiKGZ1bmN0aW9uIGUodCxuLHIpe2Z1bmN0aW9uIHMobyx1KXtpZighbltvXSl7aWYoIXRbb10pe3ZhciBhPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7aWYoIXUmJmEpcmV0dXJuIGEobywhMCk7aWYoaSlyZXR1cm4gaShvLCEwKTt2YXIgZj1uZXcgRXJyb3IoXCJDYW5ub3QgZmluZCBtb2R1bGUgJ1wiK28rXCInXCIpO3Rocm93IGYuY29kZT1cIk1PRFVMRV9OT1RfRk9VTkRcIixmfXZhciBsPW5bb109e2V4cG9ydHM6e319O3Rbb11bMF0uY2FsbChsLmV4cG9ydHMsZnVuY3Rpb24oZSl7dmFyIG49dFtvXVsxXVtlXTtyZXR1cm4gcyhuP246ZSl9LGwsbC5leHBvcnRzLGUsdCxuLHIpfXJldHVybiBuW29dLmV4cG9ydHN9dmFyIGk9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtmb3IodmFyIG89MDtvPHIubGVuZ3RoO28rKylzKHJbb10pO3JldHVybiBzfSkiLCIvLyBQcm9qZWN0IFNjb3BlOlxuXHQvLyBQcm92aWRlIHRoZSBiZXN0IG1hdGNoXG5cdC8vIFByb3ZpZGUgdm9pY2UgcXVlcnlcbmltcG9ydCB7cGlwZSwgcmVuZGVyLFxuXHRcdFx0XHRnZW5lcmF0ZUNhcmQsIGNsZWFuVXJsLFxuXHRcdFx0ICBub3JtYWxpemVTdHJpbmdzLCBnZXRNb3N0VXNlZExhbmd1YWdlLFxuXHRcdFx0XHRlbXB0eUdpZkRpdiwgdGhyb3R0bGVQYWdlQ29udGVudCxcblx0XHRcdFx0cmVtb3ZlVGFnc30gZnJvbSAnLi91dGlsJztcbnZhciBteUFwcCA9IHt9O1xuXG4vLyBteUFwcCB2YXJpYWJsZXNcbm15QXBwLnVybFByZWZpeCA9ICdodHRwczovL2FwaS5naXRodWIuY29tJztcbm15QXBwLmFjY2VwdEhlYWRlclN0YWJsZSA9ICdhcHBsaWNhdGlvbi92bmQuZ2l0aHViLnYzK2pzb24nO1xubXlBcHAuYWNjZXB0SGVhZGVyVW5zdGFibGUgPSAnYXBwbGljYXRpb24vdm5kLmdpdGh1Yi5tZXJjeS1wcmV2aWV3K2pzb24nXG5teUFwcC5odG1sUGFnZXMgPSBbXTsgLy8gY29udGFpbnMgYWxsIHBhZ2VzIGZvciBhcHAgKGNvbGxhYk9yUHJvamVjdCwgZmluZENvbGxhYiwgZmluZFByb2plY3QpXG5cbm15QXBwLnVzZXJVcmwgPSAnJzsgLy8gVXNlcidzIHByb2plY3QgdXJsXG5teUFwcC51c2VyU2VhcmNoVG9waWNzID0gW107IC8vIFRvcGljcyBzZWFyY2hlZCBieSB1c2VyIHdoaWNoIGlzIHVzZWQgdG8gZmluZCBjb2xsYWJvcmF0aW9uXG5cbm15QXBwLmF2b2lkTGFuZ3VhZ2VzID0gWydjc3MnLCAnaHRtbCcsICdodG1sNScsICdjc3MzJ107IC8vIEdpdGh1YiByZXR1cm5zIG1vcmUgcmVzdWx0IGZvciBwcm9ncmFtbWluZyBsYW5ndWFnZXNcbm15QXBwLnVzZXJVcmxJbmZvID0gJyc7IC8vIE1ldGEgaW5mbyByZXRyaWV2ZWQgZnJvbSB1c2VyJ3MgcmVwbyB1cmxcblxuLy8gQ3JlYXRlIGFsbCBteSBwYWdlc1xuLy8gUmVuZGVyIHRoZSB0aGUgZmlyc3QgcGFnZSBjb2xsYWJPclByb2plY3Rcbm15QXBwLmluaXQgPSBmdW5jdGlvbigpIHtcblx0dGhpcy5jcmVhdGVQYWdlcygpO1xuXHRyZW5kZXIoJ2NvbGxhYk9yUHJvamVjdCcpO1xufVxuXG4vLyBSZXRyaWV2ZSB0aGUgcmV0dXJuZWQgcGFnZSBvYmplY3QgYW5kIHN0b3JlIGluIG15IGFycmF5IG9mIHBhZ2VzXG5teUFwcC5jcmVhdGVQYWdlcyA9IGZ1bmN0aW9uKCkge1xuXHR0aGlzLmh0bWxQYWdlcy5wdXNoKHRoaXMuY29sbGFiT3JQcm9qZWN0KCkpO1xuXHR0aGlzLmh0bWxQYWdlcy5wdXNoKHRoaXMuZmluZENvbGxhYigpKTtcblx0dGhpcy5odG1sUGFnZXMucHVzaCh0aGlzLmZpbmRQcm9qZWN0KCkpO1xufVxuXG4vLyBEaXNwbGF5cyB0aGUgY2hvaWNlcyBhbmQgc2V0dXAgYWN0aW9uIGxpc3RlbmVyXG4vLyBCYXNlZCBvbiB0aGUgY2FyZCBjaG9zZW4gZGlzcGxheSB0aGUgYXBwcm9wcmlhdGUgd2ViIHBhZ2Vcbm15QXBwLmNvbGxhYk9yUHJvamVjdCA9IGZ1bmN0aW9uKCkge1xuXHQvLyBSZW1vdmUgYW55IHByZXZpb3VzIGxpc3RlbmVycyBhdHRhY2hlZCB0byB0aGUgY29udGFpbmVyXG5cdCQoJy5jb250YWluZXInKS51bmJpbmQoJ2NsaWNrJyk7XG5cblx0Ly8gQ3JlYXRlIHRoZSBodG1sIGNvbnRlbnQgZm9yIHRoZSBob21lIHBhZ2Vcblx0dmFyICRzZWN0aW9uID0gJCgnPHNlY3Rpb24+Jylcblx0XHRcdFx0LmF0dHIoJ2NsYXNzJywgJ2ItY29sbGFiLW9yLXByb2plY3Qgd3JhcHBlci1sZycpO1xuXHR2YXIgJGNhcmRDb250YWluZXIgPSAkKCc8ZGl2PicpXG5cdFx0XHRcdFx0XHRcdC5hdHRyKCdjbGFzcycsICdjYXJkLWNvbnRhaW5lcicpO1xuXHR2YXIgJGZpbmRDb2xsYWJDYXJkID0gJCgnPGE+Jylcblx0XHRcdFx0XHRcdFx0LmFwcGVuZChnZW5lcmF0ZUNhcmQoJ2ZpbmRDb2xsYWInKSlcblx0XHRcdFx0XHRcdFx0LmF0dHIoJ2NsYXNzJywgJ2NhcmQtY29udGFpbmVyX19jYXJkJyk7XG5cdHZhciAkZmluZFByb2plY3RDYXJkID0gJCgnPGE+Jylcblx0XHRcdFx0XHRcdFx0LmFwcGVuZChnZW5lcmF0ZUNhcmQoJ2ZpbmRQcm9qZWN0JykpXG5cdFx0XHRcdFx0XHRcdC5hdHRyKCdjbGFzcycsICdjYXJkLWNvbnRhaW5lcl9fY2FyZCcpO1xuXHQkY2FyZENvbnRhaW5lci5hcHBlbmQoJGZpbmRDb2xsYWJDYXJkLCAkZmluZFByb2plY3RDYXJkKTtcblx0JHNlY3Rpb24uYXBwZW5kKCRjYXJkQ29udGFpbmVyKTtcblx0Ly8gU2V0dXAgdGhlIGNsaWNrIGV2ZW50IGZvciB0aGUgY29sbGFib3JhdGlvbiBhbmQgcHJvamVjdCBwYWdlc1xuXHQkKCcuY29udGFpbmVyJykub24oJ2NsaWNrJywgJy5iLWNob2ljZS1jYXJkJywgKGUpID0+IHtcblx0XHQvLyBSZW1vdmUgaGVhZGVyXG5cdFx0JCgnLmItYXBwLWluZm8nKS5yZW1vdmUoKTtcblx0XHR2YXIgcGFnZU5hbWUgPSBlLmN1cnJlbnRUYXJnZXQuZ2V0QXR0cmlidXRlKCdkYXRhLWNhcmROYW1lJyk7XG5cdFx0Ly8gY29uc29sZS5sb2cocGFnZU5hbWUpO1xuXG5cdFx0Ly8gT25jZSBhZ2FpbiByZW1vdmUgcHJldmlvdXMgY2xpY2sgZXZlbnRzIGF0dGFjaGVkIHRvIHRoZSBjb250YWluZXJcblx0XHQkKCcuY29udGFpbmVyJykudW5iaW5kKCdjbGljaycpO1xuXHRcdC8vIFJlbmRlciB0aGUgY2xpY2tlZCBwYWdlXG5cdFx0cmVuZGVyKHBhZ2VOYW1lKTtcblxuXHRcdC8vIERpc3BsYXkgdm9pY2UgY29tbWFuZCBpZiBpdCBpcyB0dXJuZWQgb25cblx0XHRpZiAoYW5ueWFuZy5pc0xpc3RlbmluZygpKSB7XG5cdFx0XHQkKGAuJHtwYWdlTmFtZX0tc2VhcmNoLWNvbW1hbmRgKS5jc3MoXCJvcGFjaXR5XCIsIDEpO1xuXHRcdH1cblx0fSk7XG5cdHJldHVybiB7cGFnZU5hbWU6ICdjb2xsYWJPclByb2plY3QnLCBodG1sQ29udGVudDogJHNlY3Rpb259O1xufVxubXlBcHAuaGFuZGxlQ29sbGFiT3JQcm9qZWN0ID0gZnVuY3Rpb24ocGFnZU5hbWUpIHtcblx0Ly8gY29uc29sZS5sb2coJ3RoaXMnLCB0aGlzKTtcblx0Ly8gUmVtb3ZlIGhlYWRlclxuXHQkKCcuYi1hcHAtaW5mbycpLnJlbW92ZSgpO1xuXHQkKFwiI3RhZ3NcIikucmVtb3ZlKCk7XG5cdCQoJy5jb250YWluZXInKS51bmJpbmQoJ2NsaWNrJyk7XG5cdC8vIERpc3BsYXkgdm9pY2UgY29tbWFuZCBpZiBpdCBpcyB0dXJuZWQgb25cblx0cmVuZGVyKHBhZ2VOYW1lKTtcblx0aWYgKGFubnlhbmcuaXNMaXN0ZW5pbmcoKSkge1xuXHRcdCQoYC4ke3BhZ2VOYW1lfS1zZWFyY2gtY29tbWFuZGApLmNzcyhcIm9wYWNpdHlcIiwgMSk7XG5cdH1cbn1cblxubXlBcHAuZmluZENvbGxhYiA9IGZ1bmN0aW9uKCkge1xuXG5cdHZhciBpbnB1dHMgPSBbXTtcblx0dmFyIGN1cnJJbnB1dFR5cGUgPSAndG9waWMnO1xuXG5cdHZhciAkc2VjdGlvbiA9ICQoJzxzZWN0aW9uPicpXG5cdFx0XHRcdC5hdHRyKCdjbGFzcycsICdiLWZpbmRDb2xsYWItcGFnZScpO1xuXHR2YXIgJHNlYXJjaFNlYWN0aW9uID0gJCgnPGRpdj4nKVxuXHRcdFx0XHRcdFx0XHQuYXR0cignY2xhc3MnLCAnYi1maW5kQ29sbGFiLXBhZ2VfX3NlYXJjaCcpO1xuXHR2YXIgJGNvbGxhYkxpc3RTZWFjdGlvbiA9ICQoJzxkaXY+Jylcblx0XHRcdFx0XHRcdFx0LmF0dHIoJ2NsYXNzJywgJ2ItZmluZENvbGxhYi1wYWdlX19jb2xsYWItbGlzdCcpO1xuXG5cdHZhciAkaGVhZGluZyA9ICQoJzxoMj4nKVxuXHRcdFx0XHRcdC5hdHRyKCdjbGFzcycsICdiLWZpbmRDb2xsYWItcGFnZV9faGVhZGluZycpXG5cdFx0XHRcdFx0LmFwcGVuZCgnQ2hvb3NlIHlvdXIgQ29sbGFib3JhdG9ycycpO1xuXG5cdHZhciB1cmxTZWFyY2hJbnB1dCA9ICQoJzxpbnB1dCBhdXRvZm9jdXM+Jylcblx0XHRcdFx0XHRcdFx0LmF0dHIoe1xuXHRcdFx0XHRcdFx0XHRcdHR5cGU6ICd1cmwnLFxuXHRcdFx0XHRcdFx0XHRcdG5hbWU6ICd1cmwtaW5wdXQnLFxuXHRcdFx0XHRcdFx0XHRcdHBsYWNlaG9sZGVyOiAndXJsLi4uJyxcblx0XHRcdFx0XHRcdFx0XHRjbGFzczogJ2ItaW5wdXQtY29udGFpbmVyLS11cmwtaW5wdXQnXG5cdFx0XHRcdFx0XHRcdH0pO1xuXHR2YXIgdG9waWNTZWFyY2hJbnB1dCA9ICQoJzxpbnB1dCBuYW1lPVwidGFnc1wiIGlkPVwidGFnc1wiLz4nKVxuXHRcdFx0XHRcdFx0XHQuYXR0cignY2xhc3MnLCAnYi1pbnB1dC1jb250YWluZXItLXRvcGljLWlucHV0Jyk7XG5cdGlucHV0cy5wdXNoKHVybFNlYXJjaElucHV0LCB0b3BpY1NlYXJjaElucHV0KTtcblxuXHQvLyBUaGlzIHNlY3Rpb24gaXMgZm9yIGNvbnRyb2xsaW5nIHRoZSB0b2dnbGUgYmV0d2VlbiB1cmwgb3IgdG9waWMgc2VhcmNoXG5cdHZhciB1cmxCdXR0b25UYWIgPSAkKCc8YnV0dG9uPicpXG5cdFx0XHRcdFx0XHQuYXR0cih7XG5cdFx0XHRcdFx0XHRcdG5hbWU6ICd1cmwnLFxuXHRcdFx0XHRcdFx0XHRjbGFzczogJ2ItdGFiX191cmwnXG5cdFx0XHRcdFx0XHR9KVxuXHRcdFx0XHRcdFx0LmFwcGVuZCgnVXJsJyk7XG5cdHZhciB0b3BpY0J1dHRvblRhYiA9ICQoJzxidXR0b24+Jylcblx0XHRcdFx0XHRcdC5hdHRyKHtcblx0XHRcdFx0XHRcdFx0bmFtZTogJ3RvcGljJyxcblx0XHRcdFx0XHRcdFx0Y2xhc3M6ICdiLXRhYl9fdG9waWMnXG5cdFx0XHRcdFx0XHR9KVxuXHRcdFx0XHRcdFx0LmFwcGVuZCgnVG9waWNzJyk7XG5cdHZhciBpbnB1dFRhYkNvbnRhaW5lciA9ICQoJzxkaXY+Jylcblx0XHRcdFx0XHRcdFx0LmF0dHIoJ2NsYXNzJywgJ2ItdGFiIHdyYXBwZXItbGcnKVxuXHRcdFx0XHRcdFx0XHQub24oJ2NsaWNrJywgJ2J1dHRvbicsIChlKSA9PiB7XG5cdFx0XHRcdFx0XHRcdFx0Ly8gQ2xlYXIgbGlzdCB3aGVuIGNoYW5naW5nIGlucHV0IHR5cGVcblx0XHRcdFx0XHRcdFx0XHQkKCcuY29sbGFiLWxpc3QnKS5lbXB0eSgpO1xuXG5cdFx0XHRcdFx0XHRcdFx0bGV0IGlucHV0VHlwZSA9IGUuY3VycmVudFRhcmdldC5uYW1lO1xuXHRcdFx0XHRcdFx0XHRcdGlmIChpbnB1dFR5cGUgPT09ICd0b3BpYycpIHtcblx0XHRcdFx0XHRcdFx0XHRcdGlmICghJCgnLmItaW5wdXQtY29udGFpbmVyLS10b3BpYy1pbnB1dCcpLmV4aXN0cygpKSB7XG5cdFx0XHRcdFx0XHRcdFx0XHRcdCQoJy5iLWlucHV0LWNvbnRhaW5lci0tdXJsLWlucHV0JykuZGV0YWNoKCk7XG5cdFx0XHRcdFx0XHRcdFx0XHRcdCQoJy5iLWlucHV0LWNvbnRhaW5lcicpLmFwcGVuZChpbnB1dHNbMV0pO1xuXHRcdFx0XHRcdFx0XHRcdFx0XHQkKCcjdGFncycpLnRhZ0VkaXRvcigpO1xuXHRcdFx0XHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdFx0XHRcdFx0Y3VycklucHV0VHlwZSA9ICd0b3BpYyc7XG5cdFx0XHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdFx0XHRcdGVsc2Uge1xuXHRcdFx0XHRcdFx0XHRcdFx0aWYgKCEkKCcuYi1pbnB1dC1jb250YWluZXItLXVybC1pbnB1dCcpLmV4aXN0cygpKSB7XG5cdFx0XHRcdFx0XHRcdFx0XHRcdCQoJy5iLWlucHV0LWNvbnRhaW5lci0tdG9waWMtaW5wdXQnKS5kZXRhY2goKTtcblx0XHRcdFx0XHRcdFx0XHRcdFx0JCgnLnRhZy1lZGl0b3InKS5yZW1vdmUoKTtcblx0XHRcdFx0XHRcdFx0XHRcdFx0JCgnLmItaW5wdXQtY29udGFpbmVyJykuYXBwZW5kKGlucHV0c1swXSk7XG5cdFx0XHRcdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0XHRcdFx0XHRjdXJySW5wdXRUeXBlID0gJ3VybCc7XG5cdFx0XHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdFx0XHR9KTtcblxuXHRpbnB1dFRhYkNvbnRhaW5lci5hcHBlbmQodXJsQnV0dG9uVGFiLCB0b3BpY0J1dHRvblRhYik7XG5cblx0dmFyIHNlYXJjaE9wdGlvbkNvbnRhaW5lciA9ICQoJzxkaXY+Jylcblx0XHRcdFx0XHRcdFx0XHQuYXR0cignY2xhc3MnLCAnYi1pbnB1dC1jb250YWluZXIgd3JhcHBlci1sZycpXG5cdFx0XHRcdFx0XHRcdFx0LmFwcGVuZChpbnB1dHNbMV0pXG5cdFx0XHRcdFx0XHRcdFx0Lm9uKCdrZXl1cCcsICdpbnB1dCcsIChlKSA9PiB7XG5cdFx0XHRcdFx0XHRcdFx0XHRpZihlLmtleUNvZGUgPT09IDEzKSB7XG5cdFx0XHRcdFx0XHRcdFx0XHRcdC8vIENsZWFyIGxpc3Qgd2hlbiBhIG5ldyBzZWFyY2ggaXMgbWFkZVxuXHRcdFx0XHRcdFx0XHRcdFx0XHQkKCcuY29sbGFiLWxpc3QnKS5lbXB0eSgpO1xuXG5cdFx0XHRcdFx0XHRcdFx0XHRcdC8vIEFkZCBsb2FkaW5nIGdpZlxuXHRcdFx0XHRcdFx0XHRcdFx0XHQkKCcuY29sbGFiLWxpc3QnKS5hcHBlbmQoJzxpbWcgY2xhc3M9XCJsb2FkaW5nLWdpZlwiIHNyYz1cIi4vaW1nL2JveC5naWZcIj4nKTtcblxuXHRcdFx0XHRcdFx0XHRcdFx0XHRpZiAoY3VycklucHV0VHlwZSA9PT0gJ3VybCcpIHtcblx0XHRcdFx0XHRcdFx0XHRcdFx0XHQvLyBGaXJzdCB0cmltIGFueSBlbmRpbmcgJy8nIHRoZW4gcmVtb3ZlIHByZWZpeCB1cmwgJ2h0dHBzOi8vZ2l0aHViLmNvbS8nXG5cdFx0XHRcdFx0XHRcdFx0XHRcdFx0Ly8gVGhlbiBieSBzcGxpdHRpbmcgdGhlIHJlbWFpbmluZyB1cmwgd2Ugd2lsbCBlbmQgdXAgd2l0aCB0aGUgW3VzZXIsIHJlcG9dXG5cdFx0XHRcdFx0XHRcdFx0XHRcdFx0Ly8gV2hpY2ggd2UgdGhlbiBqb2luIHRvZ2V0aGVyIHRvIHByb2R1Y2UgdXNlci9yZXBvXG5cdFx0XHRcdFx0XHRcdFx0XHRcdFx0Ly8gaHR0cHM6Ly9naXRodWIuY29tL2dhdHNieWpzL2dhdHNieVxuXHRcdFx0XHRcdFx0XHRcdFx0XHRcdHRoaXMudXNlclVybCA9IGNsZWFuVXJsKCQoJy5iLWlucHV0LWNvbnRhaW5lci0tdXJsLWlucHV0JykudmFsKCkpO1xuXHRcdFx0XHRcdFx0XHRcdFx0XHRcdC8vIGNvbnNvbGUubG9nKCdwYXJzZWQgdXJsJywgdGhpcy51c2VyVXJsKTtcblxuXHRcdFx0XHRcdFx0XHRcdFx0XHRcdCQoJy5iLWlucHV0LWNvbnRhaW5lci0tdXJsLWlucHV0JykudmFsKCcnKTtcblx0XHRcdFx0XHRcdFx0XHRcdFx0XHR0aGlzLmZldGNoRnJvbVVybCgpO1xuXHRcdFx0XHRcdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0XHRcdFx0XHRcdGVsc2Uge1xuXHRcdFx0XHRcdFx0XHRcdFx0XHRcdC8vIFJlbW92ZSBhbGwgdGFncyBhbmQgcmV0dXJuIHRoZW1cblx0XHRcdFx0XHRcdFx0XHRcdFx0XHR0aGlzLnVzZXJTZWFyY2hUb3BpY3MgPSByZW1vdmVUYWdzKCk7XG5cdFx0XHRcdFx0XHRcdFx0XHRcdFx0dGhpcy5mZXRjaFJlcG9zR2l0aHViKCd0b3BpY3MnLCAnJywgdGhpcy51c2VyU2VhcmNoVG9waWNzKTtcblx0XHRcdFx0XHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdFx0XHRcdH0pO1xuXG5cdHZhciAkY29sbGFib3JhdG9yTGlzdCA9ICQoJzx1bD4nKVxuXHRcdFx0XHRcdFx0XHQuYXR0cignY2xhc3MnLCAnY29sbGFiLWxpc3Qgd3JhcHBlci1sZycpO1xuXG5cdHZhciAkc2VhcmNoQ29tbWFuZCA9ICQoJzxwPicpXG4gICAgICAgICAgICAgICAgICAgIC5hdHRyKCdjbGFzcycsICdmaW5kQ29sbGFiLXNlYXJjaC1jb21tYW5kJylcbiAgICAgICAgICAgICAgICAgICAgLnRleHQoJ1NheSBcIlRvcGljcyBcXCdyZWFjdCwgcmVkdXgsIGdpdGh1YiwgZXRjLi4uXFwnIFwiJyk7XG5cblx0dmFyICRhamF4RGl2ID0gJCgnPGRpdj4nKVxuXHRcdFx0XHRcdC5hdHRyKCdjbGFzcycsICdhamF4LWRpdicpXG5cdFx0XHRcdFx0LmNzcyh7XG5cdFx0XHRcdFx0XHRwb3NpdGlvbjogJ2Fic29sdXRlJyxcblx0XHRcdFx0XHRcdGJvdHRvbTogJy0xMHB4Jyxcblx0XHRcdFx0XHRcdGhlaWdodDogJzFweCcsXG5cdFx0XHRcdFx0XHR3aWR0aDogJzFweCdcblx0XHRcdFx0XHR9KTtcblxuXHR2YXIgJGhvbWVQYWdlQnRuID0gJCgnPGEgY2xhc3M9XCJiYWNrLWJ0blwiIGhyZWY9XCIvXCI+aG9tZTwvYT4nKTtcblxuXHQkc2VhcmNoU2VhY3Rpb24uYXBwZW5kKHNlYXJjaE9wdGlvbkNvbnRhaW5lciwgaW5wdXRUYWJDb250YWluZXIpO1xuXHQkY29sbGFiTGlzdFNlYWN0aW9uLmFwcGVuZCgkaGVhZGluZywgJGNvbGxhYm9yYXRvckxpc3QpXG5cdCRzZWN0aW9uLmFwcGVuZCgkaG9tZVBhZ2VCdG4sICRzZWFyY2hTZWFjdGlvbiwgJHNlYXJjaENvbW1hbmQsICRjb2xsYWJMaXN0U2VhY3Rpb24sICRhamF4RGl2KTtcblxuXHRyZXR1cm4ge3BhZ2VOYW1lOiAnZmluZENvbGxhYicsIGh0bWxDb250ZW50OiAkc2VjdGlvbn1cbn1cbi8vQ3JlYXRlIHRoZSBodG1sIGZvciBmaW5kUHJvamVjdCBwYWdlc1xubXlBcHAuZmluZFByb2plY3QgPSBmdW5jdGlvbigpIHtcblx0Ly8gQ3JlYXRlIGEgaHRtbCBjb250ZW50IGZvciBwcm9qZWN0IHBhZ2Vcblx0dmFyICRzZWN0aW9uID0gJCgnPHNlY3Rpb24+Jylcblx0XHRcdFx0LmF0dHIoJ2NsYXNzJywgJ2ItZmluZFByb2plY3QtcGFnZScpO1xuXHR2YXIgJHNlYXJjaFNlYWN0aW9uID0gJCgnPGRpdj4nKVxuXHRcdFx0XHRcdFx0XHQuYXR0cignY2xhc3MnLCAnYi1maW5kUHJvamVjdC1wYWdlX19zZWFyY2gnKTtcblx0dmFyICRwcm9qZWN0TGlzdFNlYWN0aW9uID0gJCgnPGRpdj4nKVxuXHRcdFx0XHRcdFx0XHQuYXR0cignY2xhc3MnLCAnYi1maW5kUHJvamVjdC1wYWdlX19wcm9qZWN0LWxpc3QnKTtcblx0dmFyICRoZWFkaW5nID0gJCgnPGgyPicpXG5cdFx0XHRcdFx0LmF0dHIoJ2NsYXNzJywgJ2ItZmluZFByb2plY3QtcGFnZV9faGVhZGluZycpXG5cdFx0XHRcdFx0LmFwcGVuZCgnRmluZCBQcm9qZWN0Jyk7XG5cdHZhciB0b3BpY1NlYXJjaElucHV0ID0gJCgnPGlucHV0IG5hbWU9XCJ0YWdzXCIgaWQ9XCJ0YWdzXCIvPicpXG5cdFx0XHRcdFx0XHRcdC5hdHRyKCdjbGFzcycsICdiLWlucHV0LWNvbnRhaW5lciBiLWlucHV0LWNvbnRhaW5lci0tdG9waWMtaW5wdXQnKTtcblx0dmFyIHNlYXJjaE9wdGlvbkNvbnRhaW5lciA9ICQoJzxkaXY+Jylcblx0XHRcdFx0XHRcdFx0XHQuYXR0cignY2xhc3MnLCAnYi1pbnB1dC1jb250YWluZXItLXByb2plY3Qgd3JhcHBlci1sZycpXG5cdFx0XHRcdFx0XHRcdFx0LmFwcGVuZCh0b3BpY1NlYXJjaElucHV0KVxuXHRcdFx0XHRcdFx0XHRcdC5vbigna2V5dXAnLCAoZSkgPT4ge1xuXHRcdFx0XHRcdFx0XHRcdFx0aWYoZS5rZXlDb2RlID09PSAxMykge1xuXHRcdFx0XHRcdFx0XHRcdFx0XHQvLyBDbGVhciBsaXN0IHdoZW4gYSBuZXcgc2VhcmNoIGlzIG1hZGVcblx0XHRcdFx0XHRcdFx0XHRcdFx0JCgnLnByb2plY3QtbGlzdCcpLmVtcHR5KCk7XG5cblx0XHRcdFx0XHRcdFx0XHRcdFx0Ly8gQWRkIGxvYWRpbmcgZ2lmXG5cdFx0XHRcdFx0XHRcdFx0XHRcdCQoJy5wcm9qZWN0LWxpc3QnKS5hcHBlbmQoJzxpbWcgY2xhc3M9XCJsb2FkaW5nLWdpZlwiIHNyYz1cIi4vaW1nL2JveC1wcm9qZWN0LmdpZlwiPicpO1xuXG5cdFx0XHRcdFx0XHRcdFx0XHRcdC8vIFJlbW92ZSBhbGwgdGFncyBhbmQgcmV0dXJuIHRoZW1cblx0XHRcdFx0XHRcdFx0XHRcdFx0dGhpcy51c2VyU2VhcmNoVG9waWNzID0gcmVtb3ZlVGFncygpO1xuXHRcdFx0XHRcdFx0XHRcdFx0XHR0aGlzLmZldGNoUmVwb3NHaXRodWIoJ3RvcGljcycsICcnLCB0aGlzLnVzZXJTZWFyY2hUb3BpY3MsICdwcm9qZWN0Jyk7XG5cdFx0XHRcdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0XHRcdFx0fSk7XG5cdHZhciAkcHJvamVjdExpc3QgPSAkKCc8dWw+Jylcblx0XHRcdFx0XHRcdFx0LmF0dHIoJ2NsYXNzJywgJ3Byb2plY3QtbGlzdCB3cmFwcGVyLWxnJyk7XG5cdCRzZWFyY2hTZWFjdGlvbi5hcHBlbmQoc2VhcmNoT3B0aW9uQ29udGFpbmVyKTtcblx0JHByb2plY3RMaXN0U2VhY3Rpb24uYXBwZW5kKCRoZWFkaW5nLCAkcHJvamVjdExpc3QpO1xuXG5cdHZhciAkYWpheERpdiA9ICQoJzxkaXY+Jylcblx0XHRcdFx0XHQuYXR0cignY2xhc3MnLCAnYWpheC1kaXYnKVxuXHRcdFx0XHRcdC5jc3Moe1xuXHRcdFx0XHRcdFx0cG9zaXRpb246ICdhYnNvbHV0ZScsXG5cdFx0XHRcdFx0XHRib3R0b206ICctMTBweCcsXG5cdFx0XHRcdFx0XHRoZWlnaHQ6ICcxcHgnLFxuXHRcdFx0XHRcdFx0d2lkdGg6ICcxcHgnXG5cdFx0XHRcdFx0fSk7XG5cdHZhciAkc2VhcmNoQ29tbWFuZCA9ICQoJzxwPicpXG4gICAgICAgICAgICAgICAgICAgIC5hdHRyKCdjbGFzcycsICdmaW5kUHJvamVjdC1zZWFyY2gtY29tbWFuZCcpXG4gICAgICAgICAgICAgICAgICAgIC50ZXh0KCdTYXkgXCJQcm9qZWN0IFRvcGljcyBcXCdyZWFjdCwgcmVkdXgsIGdpdGh1YiwgZXRjLi4uXFwnIFwiJyk7XG5cdHZhciAkaG9tZVBhZ2VCdG4gPSAkKCc8YSBjbGFzcz1cImJhY2stYnRuXCIgaHJlZj1cIi9cIj5ob21lPC9hPicpO1xuXG5cdCRzZWN0aW9uLmFwcGVuZCgkaG9tZVBhZ2VCdG4gLCAkc2VhcmNoU2VhY3Rpb24sICRzZWFyY2hDb21tYW5kLCAkcHJvamVjdExpc3RTZWFjdGlvbiwgJGFqYXhEaXYpO1xuXHRyZXR1cm4ge3BhZ2VOYW1lOiAnZmluZFByb2plY3QnLCBodG1sQ29udGVudDogJHNlY3Rpb259O1xufVxuXG5teUFwcC5mZXRjaFVybEluZm8gPSBmdW5jdGlvbihuZXdVcmwsIHF1ZXJ5KSB7XG5cdGxldCB1cmwgPSBgJHt0aGlzLnVybFByZWZpeH0vcmVwb3MvJHt0aGlzLnVzZXJVcmx9YDtcblx0aWYgKG5ld1VybCA9PT0gZmFsc2UgJiYgcXVlcnkgIT09IHVuZGVmaW5lZCkge1xuXHRcdHVybCA9IGAke3RoaXMudXJsUHJlZml4fS9yZXBvcy8ke3RoaXMudXNlclVybH0vJHtxdWVyeX1gO1xuXHR9XG5cdGlmIChuZXdVcmwgIT09IHVuZGVmaW5lZCAmJiBxdWVyeSA9PT0gZmFsc2UpIHtcblx0XHR1cmwgPSBuZXdVcmw7XG5cdH1cblx0Ly8gY29uc29sZS5sb2codXJsKTtcblx0cmV0dXJuICQuYWpheCh7XG5cdFx0aGVhZGVyczoge1xuXHRcdFx0QWNjZXB0OiB0aGlzLmFjY2VwdEhlYWRlclVuc3RhYmxlXG5cdFx0fSxcblx0XHR1cmw6IHVybCxcblx0XHR0eXBlOiAnR0VUJyxcblx0XHRkYXRhVHlwZTogJ2pzb24nLFxuXHR9KTtcbn1cbm15QXBwLmZldGNoRnJvbVVybCA9IGZ1bmN0aW9uKCkge1xuXHQkLndoZW4odGhpcy5mZXRjaFVybEluZm8oZmFsc2UpKVxuXHQudGhlbiggKHVybEluZm8pID0+IHtcblx0XHQvLyBjaGVjayB0byBzZWUgaWYgdGhlIHJldHVybmVkIGxhbmd1YWdlIGZvclxuXHRcdC8vIHRoZSB1c2VyIHJlcG8gaXMgYSBwcm9ncmFtbWluZyBsYW5ndWFnZS4gSWYgbm90IG1ha2UgYSByZXF1ZXN0IGZvciBhbGwgdGhlIGxhbmd1YWdlc1xuXHRcdC8vIHJlbGF0ZWQgdG8gdGhlIHByb2plY3Rcblx0XHR0aGlzLnVzZXJVcmxJbmZvID0gdXJsSW5mbztcblx0XHRsZXQgcHJpbWFyeUxhbmd1YWdlID0gbm9ybWFsaXplU3RyaW5ncyh1cmxJbmZvLmxhbmd1YWdlKVswXTtcblx0XHRpZiAoXy5pbmRleE9mKHRoaXMuYXZvaWRMYW5ndWFnZXMsIHByaW1hcnlMYW5ndWFnZSkgPj0gMCkgeyByZXR1cm4gdGhpcy5mZXRjaFVybEluZm8oZmFsc2UsICdsYW5ndWFnZXMnKTsgfVxuXHRcdGVsc2UgeyByZXR1cm4gcHJpbWFyeUxhbmd1YWdlO31cblx0fSlcblx0LmNhdGNoKChlcnIpID0+IHtcblx0XHQvLyBoYW5kbGUgZXJyb3Igd2l0aCBmZXRjaGluZyB1cmxcblx0XHQkKCcuY29sbGFiLWxpc3QnKS5lbXB0eSgpO1xuXHRcdCQoJy5jb2xsYWItbGlzdCcpXG5cdFx0LmFwcGVuZChlbXB0eUdpZkRpdigpKTtcblx0fSlcblx0LnRoZW4oKHByaW1hcnlMYW5ndWFnZSkgPT4ge1xuXHRcdGxldCBsYW5ndWFnZSA9IHByaW1hcnlMYW5ndWFnZTtcblx0XHRpZiAodHlwZW9mIGxhbmd1YWdlICE9ICdzdHJpbmcnKSB7XG5cdFx0XHRsYW5ndWFnZSA9IGdldE1vc3RVc2VkTGFuZ3VhZ2UocHJpbWFyeUxhbmd1YWdlKTtcblx0XHR9XG5cdFx0Ly8gTWFrZSBzdXJlIHRvIHJlbW92ZSBhbnkgdG9waWNzIHRoYXQgaXMgc3BlY2lmaWMgdG8gdGhlIHVzZXIgcmVwb1xuXHRcdC8vIFRoaXMgYWxsb3dzIGZvciBhIG1vcmUgZ2VuZXJhbCBzZWFyY2ggcmVzdWx0XG5cdFx0bGV0IHRvcGljcyA9IF8uZGlmZmVyZW5jZShub3JtYWxpemVTdHJpbmdzKHRoaXMudXNlclVybEluZm8udG9waWNzKSwgbm9ybWFsaXplU3RyaW5ncyh0aGlzLnVzZXJVcmwuc3BsaXQoJy8nKSkpO1xuXHRcdHRoaXMuZmV0Y2hSZXBvc0dpdGh1YigndXJsJywgbGFuZ3VhZ2UsIHRvcGljcyk7XG5cdH0pO1xuXG59XG5teUFwcC5mZXRjaFJlcG9zID0gZnVuY3Rpb24ocXVlcnkpIHtcblx0cmV0dXJuICQuYWpheCh7XG5cdFx0aGVhZGVyczoge1xuXHRcdFx0QWNjZXB0OiB0aGlzLmFjY2VwdEhlYWRlclVuc3RhYmxlXG5cdFx0fSxcblx0XHR1cmw6IGAke3RoaXMudXJsUHJlZml4fS9zZWFyY2gvcmVwb3NpdG9yaWVzP3E9JHtxdWVyeX1gLFxuXHRcdHR5cGU6ICdHRVQnLFxuXHRcdGRhdGFUeXBlOiAnanNvbidcblx0fSlcblx0LmNhdGNoKChlcnIpID0+IHtcblx0XHRhbGVydCgnRXJyb3Igd2l0aCBzZWFyY2guJyk7XG5cdH0pXG59XG5teUFwcC5mZXRjaFJlcG9zR2l0aHViID0gZnVuY3Rpb24odHlwZSwgcHJpbWFyeUxhbmd1YWdlLCB0b3BpY3MsIGNvbnRlbnQpIHtcblx0aWYgKHR5cGUgPT09ICd1cmwnKSB7XG5cdFx0XHQvLyByZXBvcyA9ICdxPXN0cmluZzErc3RyaW5nMisuLi4rc3RyaW5nTitpbjpuYW1lLGRlc2NyaXB0aW9uK2xhbmd1YWdlOmxhbmcxK3RvcGljOnRvcGljMSt0b3BpYzIrLi4uK3RvcGljTic7XG5cdFx0XHQvLyB0b3BpYyBpcyBvcHRpb25hbCB0b3BpYzoke18uam9pbih0b3BpY3MsJyt0b3BpYzonKX0gaXNcblx0XHRcdGxldCBsb29rSW4gPSBbJ25hbWUnLCAnZGVzY3JpcHRpb24nLCAncmVhZG1lJ107XG5cdFx0XHRsZXQgcXVlcnkgPSBgJHtfLmpvaW4odG9waWNzLCAnKycpfStpbjoke18uam9pbihsb29rSW4sICcsJyl9K2xhbmd1YWdlOiR7cHJpbWFyeUxhbmd1YWdlfWA7XG5cdFx0XHQvLyBjb25zb2xlLmxvZyhxdWVyeSk7XG5cdFx0XHQkLndoZW4odGhpcy5mZXRjaFJlcG9zKHF1ZXJ5KSlcblx0XHRcdC50aGVuKChkYXRhKSA9PiB7XG5cdFx0XHRcdGlmIChkYXRhLmxlbmd0aCAhPTAgKSB7XG5cdFx0XHRcdFx0dGhpcy5mZXRjaENvbGxhYihkYXRhKTtcblx0XHRcdFx0fVxuXHRcdFx0XHRlbHNlIHtcblx0XHRcdFx0XHQkKCcuY29sbGFiLWxpc3QnKS5lbXB0eSgpO1xuXHRcdFx0XHRcdCQoJy5jb2xsYWItbGlzdCcpXG5cdFx0XHRcdFx0LmFwcGVuZChlbXB0eUdpZkRpdigpKTtcblx0XHRcdFx0fVxuXHRcdFx0fSk7XG5cdH1cblx0ZWxzZSB7XG5cdFx0Ly8gY29uc29sZS5sb2coJ3RvcGljJywgdG9waWNzKTtcblx0XHQvLyByZXBvcyA9ICdxPXN0cmluZzErc3RyaW5nMisuLi4rc3RyaW5nTitpbjpuYW1lLGRlc2NyaXB0aW9uK2xhbmd1YWdlOmxhbmcxK3RvcGljOnRvcGljMSt0b3BpYzIrLi4uK3RvcGljTic7XG5cdFx0Ly8gdG9waWMgaXMgb3B0aW9uYWwgdG9waWM6JHtfLmpvaW4odG9waWNzLCcrdG9waWM6Jyl9IGlzXG5cdFx0bGV0IGxvb2tJbiA9IFsnbmFtZScsICdkZXNjcmlwdGlvbicsICdyZWFkbWUnXTtcblx0XHRsZXQgcXVlcnkgPSBgJHtfLmpvaW4odG9waWNzLCAnKycpfStpbjoke18uam9pbihsb29rSW4sICcsJyl9YDtcblx0XHQvLyBjb25zb2xlLmxvZyhxdWVyeSk7XG5cdFx0aWYgKGNvbnRlbnQgIT09ICdwcm9qZWN0JyB8fCBjb250ZW50ID09PSB1bmRlZmluZWQpIHtcblx0XHRcdCQud2hlbih0aGlzLmZldGNoUmVwb3MocXVlcnkpKVxuXHRcdFx0LnRoZW4oKGRhdGEpID0+IHtcblx0XHRcdFx0aWYgKGRhdGEuaXRlbXMubGVuZ3RoICE9MCApIHtcblx0XHRcdFx0XHR0aGlzLmZldGNoQ29sbGFiKGRhdGEpO1xuXHRcdFx0XHR9XG5cdFx0XHRcdGVsc2Uge1xuXHRcdFx0XHRcdCQoJy5jb2xsYWItbGlzdCcpLmVtcHR5KCk7XG5cdFx0XHRcdFx0JCgnLmNvbGxhYi1saXN0JykuYXBwZW5kKGVtcHR5R2lmRGl2KCkpO1xuXHRcdFx0XHR9XG5cdFx0XHR9KTtcblx0XHR9XG5cdFx0ZWxzZSB7XG5cdFx0XHQkLndoZW4odGhpcy5mZXRjaFJlcG9zKHF1ZXJ5KSlcblx0XHRcdC50aGVuKChkYXRhKSA9PiB7XG5cdFx0XHRcdGlmIChkYXRhLml0ZW1zLmxlbmd0aCAhPSAwKSB7XG5cdFx0XHRcdFx0Ly8gQWxsb3cgb3ZlcmZsb3cteSBzbyBhamF4IGxvYWRpbmcgY2FuIGZ1bmN0aW9uXG5cdFx0XHRcdFx0JCgnYm9keScpLmNzcygnb3ZlcmZsb3cteScsICdzY3JvbGwnKTtcblxuXHRcdFx0XHRcdC8vIFJlbW92ZSB0aGUgbG9hZGluZyBnaWZcblx0XHRcdFx0XHQkKCcubG9hZGluZy1naWYnKS5yZW1vdmUoKTtcblx0XHRcdFx0XHQkKCcubm90aGluZy1naWYnKS5yZW1vdmUoKTtcblx0XHRcdFx0XHQkKCcubm90aGluZy1wJykucmVtb3ZlKCk7XG5cblx0XHRcdFx0XHQvLyBBZGQgaGVhZGVyXG5cdFx0XHRcdFx0JCgnLmItZmluZFByb2plY3QtcGFnZV9faGVhZGluZycpLmNzcygndmlzaWJpbGl0eScsICd2aXNpYmxlJyk7XG5cdFx0XHRcdFx0JCh3aW5kb3cpLnVuYmluZCgnc2Nyb2xsJyk7XG5cdFx0XHRcdFx0bGV0IGNhbGxiYWNrID0gdGhpcy51cGRhdGVQcm9qZWN0TGlzdChkYXRhLml0ZW1zKTtcblx0XHRcdFx0XHRjYWxsYmFjaygpO1xuXHRcdFx0XHRcdHRocm90dGxlUGFnZUNvbnRlbnQoY2FsbGJhY2spO1xuXHRcdFx0XHRcdGNvbnNvbGUubG9nKCdkb25lIGZldGNoaW5nJyk7XG5cdFx0XHRcdH1cblx0XHRcdFx0ZWxzZSB7XG5cdFx0XHRcdFx0JCgnLnByb2plY3QtbGlzdCcpLmVtcHR5KCk7XG5cdFx0XHRcdFx0JCgnLnByb2plY3QtbGlzdCcpLmFwcGVuZChlbXB0eUdpZkRpdigpKTtcblx0XHRcdFx0fVxuXHRcdFx0fSk7XG5cdFx0fVxuXHR9XG59XG4vLyBGZXRjaCBhbGwgZ2l0IHVzZXJzIHdobyBoYXZlIGNvbnRyaWJ1dGVkIHRvXG4vLyByZXBvcyBzaW1pbGFyIHRvIHBhc3NlZCBpbiBxdWVyeSB2YWx1ZXNcbm15QXBwLmZldGNoQ29sbGFiID0gZnVuY3Rpb24oZGF0YSkge1xuXHRsZXQgdG9wUmVwb3MgPSBkYXRhLml0ZW1zO1xuXHQvLyBjb25zb2xlLmxvZygncmVsYXRlZCByZXBvcycsIHRvcFJlcG9zKTtcblx0bGV0IGNvbnRyaWJ1dG9yTGlzdCA9IFtdO1xuXG5cdGlmICh0b3BSZXBvcy5sZW5ndGggPCA1KXtcblx0XHQvLyBGaW5kIGNvbnRyaWJ1dG9ycyBmcm9tIHRoZSByZXBvcyB3aGVuIHRoZSByZXN1bHQgaXMgbGVzcyB0aGFuIDVcblx0XHRmb3IgKGxldCBpID0gMDsgaSA8IHRvcFJlcG9zLmxlbmd0aDsgaSsrKSB7XG5cdFx0XHRjb250cmlidXRvckxpc3QucHVzaCh0aGlzLmZldGNoVXJsSW5mbyh0b3BSZXBvc1tpXS5jb250cmlidXRvcnNfdXJsLCBmYWxzZSkpO1xuXHRcdH1cblx0fVxuXHRlbHNlIHtcblx0XHQvLyBGaW5kIGNvbnRyaWJ1dG9ycyBmcm9tIHRoZSByZXBvcyB3aGVuIHRoZSByZXN1bHQgaXMgbW9yZSB0aGFuIDVcblx0XHRmb3IgKGxldCBpID0gMDsgaSA8IDU7IGkrKykge1xuXHRcdFx0Y29udHJpYnV0b3JMaXN0LnB1c2godGhpcy5mZXRjaFVybEluZm8odG9wUmVwb3NbaV0uY29udHJpYnV0b3JzX3VybCwgZmFsc2UpKTtcblx0XHR9XG5cdH1cblx0UHJvbWlzZS5hbGwoY29udHJpYnV0b3JMaXN0KVxuXHQudGhlbigoZGF0YSkgPT4ge1xuXHRcdC8vIEFsbG93IG92ZXJmbG93LXkgc28gYWpheCBsb2FkaW5nIGNhbiBmdW5jdGlvblxuXHRcdCQoJ2JvZHknKS5jc3MoJ292ZXJmbG93LXknLCAnc2Nyb2xsJyk7XG5cblx0XHQvLyBSZW1vdmUgdGhlIGxvYWRpbmcgZ2lmXG5cdFx0JCgnLmxvYWRpbmctZ2lmJykucmVtb3ZlKCk7XG5cdFx0JCgnLm5vdGhpbmctZ2lmJykucmVtb3ZlKCk7XG5cdFx0JCgnLm5vdGhpbmctcCcpLnJlbW92ZSgpO1xuXG5cdFx0Ly8gQWRkIGhlYWRlclxuXHRcdCQoJy5iLWZpbmRDb2xsYWItcGFnZV9faGVhZGluZycpLmNzcygndmlzaWJpbGl0eScsICd2aXNpYmxlJyk7XG5cdFx0Ly8gSGF2ZSB0byBjbGVhciBhbnkgcHJldmlvdXMgc2Nyb2xsIGhhbmRsZXJzXG5cdFx0JCh3aW5kb3cpLnVuYmluZCgnc2Nyb2xsJyk7XG5cdFx0bGV0IGNhbGxiYWNrID0gdGhpcy51cGRhdGVDb2xsYWJMaXN0KF8uZmxhdHRlbihkYXRhKSk7XG5cdFx0Ly8gQXBwZW5kIHRoZSBmaXJzdCA2IHJlc3VsdHMgYW5kIHRoZW4gcGFzcyB0aGUgcmVzcG9uc2libGl0eSB0b1xuXHRcdC8vIHRoZSB0aHJvdHRsZSBmdW5jdGlvblxuXHRcdGNhbGxiYWNrKCk7XG5cdFx0dGhyb3R0bGVQYWdlQ29udGVudChjYWxsYmFjayk7XG5cdH0pXG5cdC5jYXRjaCgoZXJyKSA9PiB7XG5cdFx0Y29uc29sZS5sb2coJ2Vycm9yIGdldHRpbmcgY29udHJpYnV0b3JzJyk7XG5cdH0pO1xufVxuXG4vLyBFaXRoZXIgdGhlIHBhc3NlZCBpbiBkYXRhIGlzIGZpbHRlcmVkXG4vLyBhbmQgYWRkIHRoZSBkYXRhIHRvIHRoZSBkb21cbi8vIG9yIHRoZSBkYXRhIGlzIG5vdCBmaWx0ZXJlZCwgc28gaXQgbmVlZHNcbi8vIHRvIGJlIGZpbHRlcmVkLCB0aGVuIGFkZGVkIHRvIHRoZSBkb21cbm15QXBwLnVwZGF0ZUNvbGxhYkxpc3QgPSBmdW5jdGlvbihjb2xsYWJvcmF0b3JzKSB7XG5cdHZhciBwcmV2ID0gMDtcblx0dmFyIG5leHQgPSAwO1xuXHRjb25zb2xlLmxvZygndG9wJywgY29sbGFib3JhdG9ycyk7XG5cdHJldHVybiAoKSA9PiB7XG5cdFx0Ly8gUmVtb3ZlIHByZXZpb3VzIGNvbGxhYm9yYXRvciBsaXN0XG5cdFx0cHJldiA9IG5leHQ7XG5cdFx0bmV4dCs9Njtcblx0XHRsZXQgY3VycmVudENvbGxhYm9yYXRvcnMgPSBbXTtcblx0XHRjb25zb2xlLmxvZygnYWxsJywgY29sbGFib3JhdG9ycyk7XG5cdFx0Y29uc29sZS5sb2coJ3ByZXYnLCBwcmV2LCAnbmV4dCcsIG5leHQpO1xuXG5cdFx0aWYgKG5leHQgPD0gY29sbGFib3JhdG9ycy5sZW5ndGgpIHtcblx0XHRcdGN1cnJlbnRDb2xsYWJvcmF0b3JzID0gXy5zbGljZShjb2xsYWJvcmF0b3JzLCBwcmV2LCBuZXh0KTtcblx0XHR9XG5cdFx0ZWxzZSB7XG5cdFx0XHRjdXJyZW50Q29sbGFib3JhdG9ycyA9IF8uc2xpY2UoY29sbGFib3JhdG9ycywgcHJldiwgY29sbGFib3JhdG9ycy5sZW5ndGgpO1xuXHRcdH1cblxuXHRcdC8vIGNvbnNvbGUubG9nKCdjdXJyZW50IGxpc3QnLCBjdXJyZW50Q29sbGFib3JhdG9ycyk7XG5cdFx0Xy5mb3JFYWNoKGN1cnJlbnRDb2xsYWJvcmF0b3JzLCAoY29sbGFib3JhdG9yKSA9PiB7XG5cdFx0XHRsZXQgJGxpID0gJCgnPGxpPicpXG5cdFx0XHRcdFx0LmF0dHIoJ2NsYXNzJywgJ2NvbGxhYi1saXN0X19pdGVtJylcblx0XHRcdFx0XHQuYXBwZW5kKHRoaXMuZ2VuZXJhdGVVc2VyQ2FyZChjb2xsYWJvcmF0b3IpKTtcblxuXHRcdFx0JCgnLmNvbGxhYi1saXN0JykuYXBwZW5kKCRsaSk7XG5cdFx0fSk7XG5cdH1cbn1cbm15QXBwLnVwZGF0ZVByb2plY3RMaXN0ID0gZnVuY3Rpb24ocHJvamVjdHMpIHtcblx0dmFyIHByZXYgPSAwO1xuXHR2YXIgbmV4dCA9IDA7XG5cblx0cmV0dXJuICgpID0+IHtcblx0XHRwcmV2ID0gbmV4dDtcblx0XHRuZXh0Kz02O1xuXHRcdGxldCBjdXJyZW50UHJvamVjdHMgPSBbXVxuXHRcdGNvbnNvbGUubG9nKCdhbGwnLCBwcm9qZWN0cyk7XG5cdFx0Y29uc29sZS5sb2coJ3ByZXYnLCBwcmV2LCAnbmV4dCcsIG5leHQpO1xuXG5cdFx0aWYgKG5leHQgPD0gcHJvamVjdHMubGVuZ3RoKSB7XG5cdFx0XHRjdXJyZW50UHJvamVjdHMgPSBfLnNsaWNlKHByb2plY3RzLCBwcmV2LCBuZXh0KTtcblx0XHR9XG5cdFx0ZWxzZSB7XG5cdFx0XHRjdXJyZW50UHJvamVjdHMgPSBfLnNsaWNlKHByb2plY3RzLCBwcmV2LCBwcm9qZWN0cy5sZW5ndGgpO1xuXHRcdH1cblxuXHRcdGNvbnNvbGUubG9nKCdjdXJyZW50IGxpc3QnLCBjdXJyZW50UHJvamVjdHMpO1xuXHRcdF8uZm9yRWFjaChjdXJyZW50UHJvamVjdHMsIChwcm9qZWN0KSA9PiB7XG5cdFx0XHRsZXQgJGxpID0gJCgnPGxpPicpXG5cdFx0XHRcdFx0LmF0dHIoJ2NsYXNzJywgJ3Byb2plY3QtbGlzdF9faXRlbScpXG5cdFx0XHRcdFx0LmFwcGVuZCh0aGlzLmdlbmVyYXRlUHJvamVjdENhcmQocHJvamVjdCkpO1xuXG5cdFx0XHQkKCcucHJvamVjdC1saXN0JykuYXBwZW5kKCRsaSk7XG5cdFx0fSk7XG5cdH1cbn1cbm15QXBwLmdlbmVyYXRlVXNlckNhcmQgPSBmdW5jdGlvbihjKSB7XG5cdHZhciAkZGl2ID0gJCgnPGRpdj4nKVxuXHRcdFx0XHQuYXR0cignY2xhc3MnLCAndXNlci1jYXJkJylcblxuXHR2YXIgJGF2YXRhciA9ICQoJzxpbWc+Jylcblx0XHRcdFx0XHQuYXR0cignY2xhc3MnLCAndXNlci1jYXJkX19hdmF0YXInKVxuXHRcdFx0XHRcdC5hdHRyKCdzcmMnLCBjLmF2YXRhcl91cmwpO1xuXG5cdHZhciAkdXNlckluZm8gPSAkKCc8ZGl2PicpXG5cdFx0XHRcdFx0LmF0dHIoJ2NsYXNzJywgJ3VzZXItaW5mbycpO1xuXHR2YXIgJHVzZXJOYW1lID0gJCgnPGgzPicpXG5cdFx0XHRcdFx0LmF0dHIoJ2NsYXNzJywgJ3VzZXItaW5mb19fdXNlcm5hbWUnKVxuXHRcdFx0XHRcdC50ZXh0KGMubG9naW4pO1xuXHR2YXIgJHVzZXJMaW5rID0gJCgnPGE+Jylcblx0XHRcdFx0XHQuYXR0cih7XG5cdFx0XHRcdFx0XHRjbGFzczogJ3VzZXItaW5mb19fbGluaycsXG5cdFx0XHRcdFx0XHRocmVmOiBjLmh0bWxfdXJsLFxuXHRcdFx0XHRcdFx0dGFyZ2V0OiAnX2JsYW5rJ1xuXHRcdFx0XHRcdH0pXG5cdFx0XHRcdFx0LnRleHQoJ1ZpZXcgUHJvZmlsZScpO1xuXG5cdCR1c2VySW5mby5hcHBlbmQoJHVzZXJOYW1lLCAkdXNlckxpbmspO1xuXHQkZGl2LmFwcGVuZCgkYXZhdGFyLCAkdXNlckluZm8pO1xuXHRyZXR1cm4gJGRpdjtcbn1cbm15QXBwLmdlbmVyYXRlUHJvamVjdENhcmQgPSBmdW5jdGlvbihwKSB7XG5cdHZhciBzdGF0dXMgPSBbJ2ZvcmtzJywgJ3N0YXJnYXplcnNfY291bnQnLCAnd2F0Y2hlcnMnXVxuXHR2YXIgJGxpbmsgPSAkKCc8YT4nKVxuXHRcdFx0XHQuYXR0cih7XG5cdFx0XHRcdFx0Y2xhc3M6ICdwcm9qZWN0LWxpbmsnLFxuXHRcdFx0XHRcdGhyZWY6IGAke3AuaHRtbF91cmx9YCxcblx0XHRcdFx0XHR0YXJnZXQ6ICdfYmxhbmsnXG5cdFx0XHRcdH0pO1xuXHR2YXIgJGRpdiA9ICQoJzxkaXY+Jylcblx0XHRcdFx0LmF0dHIoJ2NsYXNzJywgJ3Byb2plY3QtY2FyZCcpXG5cblx0dmFyICRhdmF0YXIgPSAkKCc8aW1nPicpXG5cdFx0XHRcdFx0LmF0dHIoJ2NsYXNzJywgJ3Byb2plY3QtY2FyZF9fYXZhdGFyJylcblx0XHRcdFx0XHQuYXR0cignc3JjJywgcC5vd25lci5hdmF0YXJfdXJsKTtcblxuXHR2YXIgJHByb2plY3ROYW1lID0gJCgnPGgzPicpXG5cdFx0XHRcdFx0XHQuYXR0cignY2xhc3MnLCAncHJvamVjdC1jYXJkX19wcm9qZWN0TmFtZScpXG5cdFx0XHRcdFx0XHQudGV4dChwLm5hbWUpO1xuXG5cdHZhciAkcHJvamVjdFBvcHVsYXJpdHlMaXN0ID0gJCgnPHVsPicpXG5cdFx0XHRcdFx0XHRcdFx0LmF0dHIoJ2NsYXNzJywgJ3Byb2plY3QtcG9wLWxpc3QnKTtcblx0Zm9yIChsZXQgaSA9IDA7IGkgPCAzOyBpKyspIHtcblx0XHRsZXQgJGxpID0gJCgnPGxpPicpXG5cdFx0XHRcdFx0LmF0dHIoJ2NsYXNzJywgJ3Byb2plY3QtcG9wLWxpc3RfX2l0ZW0nKTtcblx0XHRsZXQgJHBvcEl0ZW0gPSAkKCc8ZGl2PicpXG5cdFx0XHRcdFx0XHQuYXR0cignY2xhc3MnLCBgcG9wLWl0ZW0gcG9wLWl0ZW0tLSR7c3RhdHVzW2ldfWApO1xuXHRcdGxldCAkaDUgPSAkKCc8aDU+Jylcblx0XHRcdFx0XHQuYXR0cignY2xhc3MnLCAncG9wLWl0ZW1fX2hlYWRpbmcnKVxuXHRcdFx0XHRcdC5hcHBlbmQoYCR7c3RhdHVzW2ldfTpgKTtcblx0XHRsZXQgJHAgPSAkKCc8cD4nKVxuXHRcdFx0XHRcdC5hdHRyKCdjbGFzcycsICdwb3AtaXRlbV9fcXR5Jylcblx0XHRcdFx0XHQuYXBwZW5kKGAke3Bbc3RhdHVzW2ldXX1gKTtcblxuXHRcdCRwb3BJdGVtLmFwcGVuZCgkaDUsICRwKTtcblx0XHQkbGkuYXBwZW5kKCRwb3BJdGVtKTtcblx0XHQkcHJvamVjdFBvcHVsYXJpdHlMaXN0LmFwcGVuZCgkbGkpO1xuXHR9XG5cdCRkaXYuYXBwZW5kKCRhdmF0YXIsICRwcm9qZWN0TmFtZSwgJHByb2plY3RQb3B1bGFyaXR5TGlzdCk7XG5cdCRsaW5rLmFwcGVuZCgkZGl2KTtcblx0cmV0dXJuICRsaW5rO1xuXG59XG5teUFwcC52b2ljZVNlYXJjaCA9IGZ1bmN0aW9uKHRvcGljcywgY29udGVudCkge1xuXHRjb25zb2xlLmxvZygnaW5zaWRlJywgdG9waWNzKVxuXHRpZiAoY29udGVudCA9PT0gJ3Byb2plY3QnKSB7XG5cdFx0dGhpcy5mZXRjaFJlcG9zR2l0aHViKCd0b3BpY3MnLCAnJywgdG9waWNzLCBjb250ZW50KTtcblx0fVxuXHRlbHNlIHtcblx0XHR0aGlzLmZldGNoUmVwb3NHaXRodWIoJ3RvcGljcycsICcnLCB0b3BpY3MpO1xuXHR9XG59XG5cbiQoZnVuY3Rpb24oKXtcblx0d2luZG93Lm15QXBwID0gbXlBcHA7XG5cdC8vIENyZWRpdHMgZ29lcyB0byBNYWduYXIgZnJvbVxuXHQvLyBodHRwczovL3N0YWNrb3ZlcmZsb3cuY29tL3F1ZXN0aW9ucy85MjAyMzYvaG93LWNhbi1pLWRldGVjdC1pZi1hLXNlbGVjdG9yLXJldHVybnMtbnVsbFxuXHQkLmZuLmV4aXN0cyA9IGZ1bmN0aW9uICgpIHsgcmV0dXJuIHRoaXMubGVuZ3RoICE9PSAwOyB9XG5cblx0Ly8gSW5pdGlhbGl6ZSBteUFwcCBvYmplY3Rcblx0bXlBcHAuaW5pdCgpO1xuXG5cdC8vIEFmdGVyIGluaXRpYWxpemluZyBteUFwcCBzZXR1cCB2b2ljZSByZWNvZ25pdGlvblxuXHRpZiAoYW5ueWFuZykge1xuXHRcdGFubnlhbmcuZGVidWcodHJ1ZSk7XG5cdCAgLy8gRGVmaW5lIHZvaWNlIGNvbW1hbmRzIGFuZCBpdHMgYXBwcm9wcmlhdGUgZnVuY3Rpb25cblx0ICB2YXIgY29tbWFuZHMgPSB7XG5cdCAgICAnc2VhcmNoIConOiBmdW5jdGlvbihhY3Rpb24pIHtcblx0ICAgIFx0Y29uc29sZS5sb2coJ2ZpbmRpbmcgJywgYWN0aW9uKTtcblx0ICAgIFx0JCgnI2ZpbmQnKVswXS5wbGF5KCk7XG5cdCAgICBcdC8vIFJlbmRlciBmaW5kQ29sbGFiIFBhZ2Vcblx0ICAgIFx0bXlBcHAuaGFuZGxlQ29sbGFiT3JQcm9qZWN0KCdmaW5kQ29sbGFiJyk7XG5cdCAgICB9LFxuXHQgICAgJ2NoZWNrIConOiAgZnVuY3Rpb24oYWN0aW9uKSB7XG5cdCAgICBcdGNvbnNvbGUubG9nKCdzZWFyY2hpbmcgJywgYWN0aW9uKTtcblx0XHQgICAgJCgnI3NlYXJjaCcpWzBdLnBsYXkoKTtcblx0XHQgICAgLy8gUmVuZGVyIGZpbmRTZWFyY2ggUGFnZVxuXHQgICAgXHRteUFwcC5oYW5kbGVDb2xsYWJPclByb2plY3QoJ2ZpbmRQcm9qZWN0Jyk7XG5cdCAgICB9LFxuXHQgICAgJ3Byb2plY3QgdG9waWNzICphY3Rpb24nOiAgZnVuY3Rpb24oYWN0aW9uKSB7XG5cdCAgICBcdGNvbnNvbGUubG9nKCd0b3BpY3MgJyk7XG5cdCAgICBcdCQoJyNzZWFyY2hpbmcnKVswXS5wbGF5KCk7XG5cdFx0XHRcdC8vIENsZWFyIGxpc3Qgd2hlbiBhIG5ldyBzZWFyY2ggaXMgbWFkZVxuXHRcdFx0XHQkKCcucHJvamVjdC1saXN0JykuZW1wdHkoKTtcblxuXHQgICAgXHQvLyBFeGVjdXRlZCB0b3BpYyBzZWFyY2ggZm9yIHByb2plY3Rcblx0ICAgIFx0bXlBcHAudm9pY2VTZWFyY2goXy5zcGxpdChhY3Rpb24sIFwiIFwiKSwgXCJwcm9qZWN0XCIpO1xuXHQgICAgXHRzZXRUaW1lb3V0KCgpID0+ICQoJyNmaW5pdG8nKVswXS5wbGF5KCksIDEwMDApO1xuXHQgICAgfSxcblx0ICAgICd0b3BpY3MgKmFjdGlvbic6ICBmdW5jdGlvbihhY3Rpb24pIHtcblx0ICAgIFx0Y29uc29sZS5sb2coJ3RvcGljcyAnKTtcblx0ICAgIFx0JCgnI3NlYXJjaGluZycpWzBdLnBsYXkoKTtcblx0XHRcdFx0Ly8gQ2xlYXIgbGlzdCB3aGVuIGEgbmV3IHNlYXJjaCBpcyBtYWRlXG5cdFx0XHRcdCQoJy5jb2xsYWItbGlzdCcpLmVtcHR5KCk7XG5cblx0ICAgIFx0Ly8gRXhlY3V0ZWQgdG9waWMgc2VhcmNoIGZvciBjb2xsYWJvcmF0b3JzXG5cdCAgICBcdG15QXBwLnZvaWNlU2VhcmNoKF8uc3BsaXQoYWN0aW9uLCBcIiBcIikpO1xuXHQgICAgXHRzZXRUaW1lb3V0KCgpID0+ICQoJyNmaW5pdG8nKVswXS5wbGF5KCksIDEwMDApO1xuXHQgICAgfVxuXHQgIH07XG5cdCAgLy8gQWRkIG15IGNvbW1hbmRzIHRvIGFubnlhbmdcblx0XHRhbm55YW5nLmFkZENvbW1hbmRzKGNvbW1hbmRzKTtcblxuXHRcdCQoJyNhbm55YW5nLWFjdGl2ZScpLm9uKCdjbGljaycsIGZ1bmN0aW9uKCkge1xuXHRcdFx0aWYgKGFubnlhbmcuaXNMaXN0ZW5pbmcoKSkge1xuXHRcdFx0XHRhbm55YW5nLmFib3J0KCk7XG5cdFx0XHRcdCQoJy5maW5kQ29sbGFiLWNvbW1hbmQnKS5hbmltYXRlKHtcIm9wYWNpdHlcIjogMH0sIDcwMCk7XG5cdFx0XHRcdCQoJy5maW5kUHJvamVjdC1jb21tYW5kJykuYW5pbWF0ZSh7XCJvcGFjaXR5XCI6IDB9LCA3MDApO1xuXHRcdFx0XHQkKHRoaXMpXG5cdFx0XHRcdC5odG1sKCdBY3RpdmF0ZSBWb2ljZSBDb21tYW5kJylcblx0XHRcdFx0LmNzcyhcImJhY2tncm91bmQtY29sb3JcIiwgXCIjRkUzRjgwXCIpO1xuXHRcdFx0fVxuXHRcdFx0ZWxzZSB7XG5cdFx0XHRcdGFubnlhbmcuc3RhcnQoKTtcblxuXHRcdFx0XHQvLyBTdGFydCBsaXN0ZW5pbmcuIFlvdSBjYW4gY2FsbCB0aGlzIGhlcmUsIG9yIGF0dGFjaCB0aGlzIGNhbGwgdG8gYW4gZXZlbnQsIGJ1dHRvbiwgZXRjLlxuXHRcdFx0XHRhbGVydCgnV2FybmluZzogVGhlIHZvaWNlIHJlY29nbml0aW9uIGZ1bmN0aW9uIGlzIGV4cGVyaW1lbnRhbCwgaXQgd2lsbCBub3Qgd29yayBwcm9wZXJseSBpbiBhIG5vaXNleSBlbnZpcm9uZW1lbnQuJyk7XG5cdFx0XHRcdCQoJy5maW5kQ29sbGFiLWNvbW1hbmQnKS5hbmltYXRlKHtcIm9wYWNpdHlcIjogMX0sIDcwMCk7XG5cdFx0XHRcdCQoJy5maW5kUHJvamVjdC1jb21tYW5kJykuYW5pbWF0ZSh7XCJvcGFjaXR5XCI6IDF9LCA3MDApO1xuXHRcdFx0XHQkKHRoaXMpXG5cdFx0XHRcdC5odG1sKCdEZWFjdGl2YXRlIFZvaWNlIENvbW1hbmQnKVxuXHRcdFx0XHQuY3NzKFwiYmFja2dyb3VuZC1jb2xvclwiLCBcIiNDMTE4NUFcIik7XG5cdFx0XHR9XG5cdFx0XHQvLyAkKHRoaXMpLnJlcGxhY2VXaXRoKCc8YnV0dG9uIGlkPVwiYW5ueWFuZy1hYm9ydFwiPkRlYWN0aXZhdGUgVm9pY2UgQ29tbWFuZDwvYnV0dG9uPicpXG5cdFx0fSk7XG5cdH1cbn0pO1xuIiwiY29uc3QgX3BpcGUgPSAoZixnKSA9PiAoLi4uYXJncykgPT4gZyhmKC4uLmFyZ3MpKTtcbmV4cG9ydCBjb25zdCBwaXBlID0gKC4uLmZ1bmNzKSA9PiBmdW5jcy5yZWR1Y2UoX3BpcGUpO1xuXG5jb25zdCBnZXRIdG1sQ29udGVudCA9IChwYWdlTmFtZSkgPT4ge1xuICAvLyBHZXQgdGhlIGh0bWwgY29udGVudCBiYXNlZCBvbiB0aGUgcGFnZSBuYW1lXG4gIGlmIChwYWdlTmFtZSA9PT0gJ2ZpbmRDb2xsYWInIHx8IHBhZ2VOYW1lID09PSAnZmluZFByb2plY3QnKSB7XG4gICAgJCgnYm9keScpLmNzcygnb3ZlcmZsb3cteScsICdoaWRkZW4nKTtcbiAgfVxuICByZXR1cm4gXy5maW5kKG15QXBwLmh0bWxQYWdlcywgWydwYWdlTmFtZScsIHBhZ2VOYW1lXSkuaHRtbENvbnRlbnQ7XG59XG5jb25zdCByZW5kZXJQYWdlID0gKGh0bWxQYWdlKSA9PiB7XG4gIC8vIFRoaXMgZnVuY3Rpb24gaXMgcmVzcG9uc2libGUgZm9yIGR5bmFtaWNhbGx5IHJlbmRlcmluZyBuZXcgcGFnZXMgb2YgdGhlIGFwcGxpY2F0aW9uXG4gIC8vIEFuZCBmb3IgaW5pdGlhbGl6aW5nIGFueSBwbHVnaW5zIHVzZWQgYnkgdGhlIHBhZ2VcblxuICAvLyBBcHBlbmRzIHRoZSBiYXNlZCBpbiBodG1sIGNvbnRlbnQgdG8gdGhlIG1haW4gY29udGFpbmVyXG5cdCQoJy5jb250YWluZXInKS5odG1sKGh0bWxQYWdlKTtcblxuXHQvLyBUaGUgY29kZSBpcyB1c2VkIHRvIGluaXRpYWxpemUgdGhlIGlucHV0IHRhZyBmb3IgY29sbGFib3JhdGlvbiBwYWdlXG5cdGlmICgkKFwiI3RhZ3NcIikuZXhpc3RzKCkpIHtcblx0XHQkKCcjdGFncycpLnRhZ0VkaXRvcih7XG5cdFx0XHRwbGFjZWhvbGRlcjogJ0VudGVyIHRvcGljcyAuLi4nXG5cdFx0fSk7XG5cdH1cbn1cbmV4cG9ydCBjb25zdCBnZW5lcmF0ZUNhcmQgPSAoY2FyZE5hbWUpID0+IHtcbiAgdmFyIGNhcmRzID0gW107XG5cdHZhciAkZmluZENvbGxhYkNhcmQgPSAkKCc8ZGl2PicpXG5cdFx0XHRcdFx0LmF0dHIoe1xuXHRcdFx0XHRcdFx0J2NsYXNzJzogJ2ItY2hvaWNlLWNhcmQgYi1jaG9pY2UtY2FyZC0tZmluZENvbGxhYicsXG5cdFx0XHRcdFx0XHQnZGF0YS1jYXJkTmFtZSc6ICdmaW5kQ29sbGFiJ1xuXHRcdFx0XHRcdH0pO1xuXHR2YXIgJGZpbmRQcm9qZWN0Q2FyZCA9ICQoJzxkaXY+Jylcblx0XHRcdFx0XHQuYXR0cih7XG5cdFx0XHRcdFx0XHQnY2xhc3MnOiAnYi1jaG9pY2UtY2FyZCBiLWNob2ljZS1jYXJkLS1maW5kUHJvamVjdCcsXG5cdFx0XHRcdFx0XHQnZGF0YS1jYXJkTmFtZSc6ICdmaW5kUHJvamVjdCdcblx0XHRcdFx0XHR9KTtcblxuXHR2YXIgJGZjX2xvZ28gPSAkKCc8aW1nPicpXG5cdFx0XHRcdFx0LmF0dHIoe1xuXHRcdFx0XHRcdFx0Y2xhc3M6ICdiLWNob2ljZS1jYXJkX19sb2dvIGItY2hvaWNlLWNhcmRfX2xvZ28tLWZpbmRDb2xsYWInLFxuXHRcdFx0XHRcdFx0c3JjOiAnLi9pbWcvZmluZENvbGxhYl93LnN2Zydcblx0XHRcdFx0XHR9KTtcblx0dmFyICRmcF9sb2dvID0gJCgnPGltZz4nKVxuXHRcdFx0XHRcdC5hdHRyKHtcblx0XHRcdFx0XHRcdGNsYXNzOiAnYi1jaG9pY2UtY2FyZF9fbG9nbyBiLWNob2ljZS1jYXJkX19sb2dvLS1maW5kUHJvamVjdCcsXG5cdFx0XHRcdFx0XHRzcmM6ICcuL2ltZy9maW5kUHJvamVjdC5zdmcnXG5cdFx0XHRcdFx0fSk7XG5cblx0dmFyICRmY19oZWFkaW5nID0gJCgnPGgzPicpXG5cdFx0XHRcdFx0LmF0dHIoJ2NsYXNzJywgJ2ItY2hvaWNlLWNhcmRfX2hlYWRpbmcgYi1jaG9pY2UtY2FyZF9faGVhZGluZy0tZmluZENvbGxhYicpXG5cdFx0XHRcdFx0LnRleHQoJ2ZpbmQgeW91ciBuZXh0IGNvbGxhYm9yYXRvcnMnKTtcblx0dmFyICRmcF9oZWFkaW5nID0gJCgnPGgzPicpXG5cdFx0XHRcdFx0LmF0dHIoJ2NsYXNzJywgJ2ItY2hvaWNlLWNhcmRfX2hlYWRpbmcgYi1jaG9pY2UtY2FyZF9faGVhZGluZy0tZmluZFByb2plY3QnKVxuXHRcdFx0XHRcdC50ZXh0KCdEaXNjb3ZlciB5b3VyIG5leHQgcHJvamVjdCcpO1xuXG5cdHZhciAkZmNfcCA9ICQoJzxwPicpXG5cdFx0XHRcdC5hdHRyKCdjbGFzcycsICdiLWNob2ljZS1jYXJkX190ZXh0IGItY2hvaWNlLWNhcmRfX3RleHQtLWZpbmRDb2xsYWInKVxuXHRcdFx0XHQudGV4dChcIkZpbmQgY29sbGFib3JhdG9ycyBmb3IgeW91ciBuZXh0IHByb2plY3QuXCIpO1xuXHR2YXIgJGZwX3AgPSAkKCc8cD4nKVxuXHRcdFx0XHQuYXR0cignY2xhc3MnLCAnYi1jaG9pY2UtY2FyZF9fdGV4dCBiLWNob2ljZS1jYXJkX190ZXh0LS1maW5kUHJvamVjdCcpXG5cdFx0XHRcdC50ZXh0KFwiRXhwbG9yZSB0aG91c2FuZHMgb2YgcHJvamVjdHMgaG9zdGVkIG9uIEdpdEh1Yi5cIik7XG5cbiAgdmFyICRmY19jb21tYW5kID0gJCgnPHA+JylcbiAgICAgICAgICAgICAgICAgICAgLmF0dHIoJ2NsYXNzJywgJ2ZpbmRDb2xsYWItY29tbWFuZCcpXG4gICAgICAgICAgICAgICAgICAgIC50ZXh0KCdTYXkgXCJTZWFyY2hcIicpO1xuICB2YXIgJGZwX2NvbW1hbmQgPSAkKCc8cD4nKVxuICAgICAgICAgICAgICAgICAgICAuYXR0cignY2xhc3MnLCAnZmluZFByb2plY3QtY29tbWFuZCcpXG4gICAgICAgICAgICAgICAgICAgIC50ZXh0KCdTYXkgXCJDaGVja1wiJyk7XG5cbiBcdC8vIEFwcGVuZCBjb250ZW50IGludG8gZWFjaCBjYXJkc1xuXHQkZmluZENvbGxhYkNhcmQuYXBwZW5kKCRmY19sb2dvLCAkZmNfaGVhZGluZywgJGZjX3AsICRmY19jb21tYW5kKTtcblx0JGZpbmRQcm9qZWN0Q2FyZC5hcHBlbmQoJGZwX2xvZ28sICRmcF9oZWFkaW5nLCAkZnBfcCwgJGZwX2NvbW1hbmQpO1xuXG5cdC8vIENyZWF0ZSBjYXJkIG9iamVjdHMgYW5kIGFkZGVkIHRvIGFuIGFycmF5XG5cdC8vIFRoZSBhcnJheSB3aWxsIGJlIHVzZWQgdG8gcmV0cmlldmUgdGhlIGFwcHJvcHJpYXRlIGNhcmRcblx0Y2FyZHMucHVzaChcblx0XHR7Y2FyZE5hbWU6ICdmaW5kQ29sbGFiJywgY2FyZDogJGZpbmRDb2xsYWJDYXJkfVxuXHRcdCx7Y2FyZE5hbWU6ICdmaW5kUHJvamVjdCcsIGNhcmQ6ICRmaW5kUHJvamVjdENhcmR9KTtcblx0cmV0dXJuIF8uZmluZChjYXJkcywgWydjYXJkTmFtZScsIGNhcmROYW1lXSkuY2FyZDtcbn1cbmNvbnN0IGdldFBhZ2VBbmRSZW5kZXIgPSBwaXBlKGdldEh0bWxDb250ZW50LCByZW5kZXJQYWdlKTtcbmV4cG9ydCBjb25zdCByZW5kZXIgPSAocGFnZU5hbWUpID0+IGdldFBhZ2VBbmRSZW5kZXIocGFnZU5hbWUpO1xuZXhwb3J0IGNvbnN0IGNsZWFuVXJsID0gKHVybCkgPT4gXy50cmltRW5kKHVybCwgJy8nKS5yZXBsYWNlKCdodHRwczovL2dpdGh1Yi5jb20vJywgJycpO1xuZXhwb3J0IGNvbnN0IG5vcm1hbGl6ZVN0cmluZ3MgPSAoYXJyYXlPZlN0cmluZ3MpID0+IHtcbiAgLy9hbHdheXMgcmV0dXJucyBhbiBhcnJheSBvZiBzdHJpbmdzIG9yIGFycmF5IG9mIHN0cmluZyB0aGF0IGhhcyBiZWVuIHRyYW5zZm9ybWVkIHRvIGxvd2VyY2FzZVxuICBpZiAoIUFycmF5LmlzQXJyYXkoYXJyYXlPZlN0cmluZ3MpKSB7IHJldHVybiBfLmNvbmNhdChbXSxfLnRvTG93ZXIoYXJyYXlPZlN0cmluZ3MpKTsgfVxuXHRlbHNlIHtcblx0XHRyZXR1cm4gXy5tYXAoYXJyYXlPZlN0cmluZ3MsIChzdHJpbmcpID0+IHtcblx0XHRcdHJldHVybiBfLnRvTG93ZXIoc3RyaW5nKTtcblx0XHR9KTtcblx0fVxufVxuZXhwb3J0IGNvbnN0IGdldE1vc3RVc2VkTGFuZ3VhZ2UgPSAoZ2l0aHViTGFuZ09iamVjdCkgPT4ge1xuICByZXR1cm4gXy5zb3J0QnkoXG5cdFx0XHRcdF8uZmlsdGVyKFxuXHRcdFx0XHRcdF8ubWFwKGdpdGh1YkxhbmdPYmplY3QsICh2YWwsIGtleSkgPT4ge1xuXHRcdFx0XHRcdFx0XHRyZXR1cm4geydsYW5ndWFnZSc6IG5vcm1hbGl6ZVN0cmluZ3Moa2V5KVswXSwgJ3F0eSc6IHZhbH1cblx0XHRcdFx0XHR9KSwgKG9iaikgPT4ge1xuXHRcdFx0XHRcdFx0XHQgcmV0dXJuIF8uaW5kZXhPZihteUFwcC5hdm9pZExhbmd1YWdlcywgb2JqLmxhbmd1YWdlKSA8IDBcblx0XHRcdFx0XHR9KSwgJ3F0eScpWzBdLmxhbmd1YWdlO1xufVxuZXhwb3J0IGNvbnN0IGVtcHR5R2lmRGl2ID0gKCkgPT4gJzxkaXYgY2xhc3M9XCJub3RoaW5nLWdpZlwiIHN0eWxlPVwid2lkdGg6MTAwJTtoZWlnaHQ6MTAwcHg7cGFkZGluZy1ib3R0b206NTYlO3Bvc2l0aW9uOnJlbGF0aXZlO1wiPjxpZnJhbWUgc3JjPVwiaHR0cHM6Ly9naXBoeS5jb20vZW1iZWQveTYzSDA5WnZISmRmMlwiIHdpZHRoPVwiMTAwJVwiIGhlaWdodD1cIjcwJVwiIHN0eWxlPVwicG9zaXRpb246YWJzb2x1dGVcIiBmcmFtZUJvcmRlcj1cIjBcIiBjbGFzcz1cImdpcGh5LWVtYmVkXCIgYWxsb3dGdWxsU2NyZWVuPjwvaWZyYW1lPjwvZGl2PjxwPjxhIGhyZWY9XCJodHRwczovL2dpcGh5LmNvbS9naWZzL25vdGhpbmcteTYzSDA5WnZISmRmMlwiPnZpYSBHSVBIWTwvYT48L3A+J1xuZXhwb3J0IGNvbnN0IHRocm90dGxlUGFnZUNvbnRlbnQgPSAodXBkYXRlQ29udGVudCkgPT4ge1xuICAkKHdpbmRvdykuc2Nyb2xsKGZ1bmN0aW9uICgpIHtcbiAgICAgICAgaWYgKCQoZG9jdW1lbnQpLmhlaWdodCgpIDw9ICQod2luZG93KS5zY3JvbGxUb3AoKSArICQod2luZG93KS5oZWlnaHQoKSkge1xuICAgICAgICBcdGNvbnNvbGUubG9nKCdhbG1vc3QgYXQgdGhlIGJvdHRvbScpO1xuICAgICAgICAgICAgdXBkYXRlQ29udGVudCgpO1xuICAgICAgICB9XG4gICAgfSk7XG59XG5leHBvcnQgY29uc3QgcmVtb3ZlVGFncyA9ICgpID0+IHtcbiAgdmFyIHRhZ3MgPSAkKCcjdGFncycpLnRhZ0VkaXRvcignZ2V0VGFncycpWzBdLnRhZ3M7XG4gIGZvciAodmFyIGkgPSAwOyBpIDwgdGFncy5sZW5ndGg7IGkrKykgeyAkKCcjdGFncycpLnRhZ0VkaXRvcigncmVtb3ZlVGFnJywgdGFnc1tpXSk7IH1cbiAgcmV0dXJuIHRhZ3M7XG59XG4iXX0=
