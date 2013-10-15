/**
 * whenpad (C) 2013 William Lahti.
 * License: MIT License
 * 
 */

!function() {
	var WHENPAD_VERSION = "0.1";
	
	var $app = null;
	var timeBuffer = 0;
	var clockUpdater = null;
	var start = 0;
	var startTime = null;
	
	function zeroPad ( num, size ) {
		if (size <= 16)
			return ( Math.pow( 10, size ) + ~~num ).toString().substring( 1 );
		else
			return ('0').repeat(size - num.toString().length) + num;
	}
	
	function installMonkeyPatches() {
		String.prototype.repeat = function(count) { 
			return new Array (count + 1).join(this);
		};
		
		Number.prototype.zeroPad = function(size) { return zeroPad(this, size); };

		Date.prototype.getDateStamp = function() {
			return this.getFullYear()+(this.getMonth() + 1).zeroPad(2)+this.getDate().zeroPad(2);
		}
	}
	
	function usedTag(tag)
	{
		tag = tag.replace(/^ | $/g, '');
			
		var autos = window.localStorage.recentTags || '[]';
		autos = JSON.parse(autos);

		var newAutos = [tag];
		var limit = 10;

		$(autos).each(function(i,e) {
			if (e == tag)
				return;
			newAutos.push(e);
			if (i >= limit)
				return false;
		});

		window.localStorage.recentTags = JSON.stringify(newAutos);
		updateAutoTags();
	}
	
	function updateAutoTags()
	{
		var autos = window.localStorage.recentTags || '[]';
		autos = JSON.parse(autos);
		var $autoTags = $('select.auto-tag');
		
		$autoTags.find('option').not('.default').detach();

		var alreadyHave = [];
		
		$(autos).each(function(i,val) {
			val = val.replace(/^ | $/g, '');
			if (alreadyHave.indexOf(val) >= 0)
				return;
			
			$autoTags.append($('<option>'+val+'</option>').val(val));
			alreadyHave.push(val);
		});
		
		$autoTags.append('<option class="add">add...</option>');
		
		var currentTag = $('.new-tag').text();
		$autoTags.val(currentTag);
	}

	function formatTimeSegment(value)
	{
			if (value < 10)
				return '0' + value;
			return value;
	}
	
	function secondsToHMS(seconds)
	{
		var hours = Math.floor(seconds / (60*60));
		seconds = seconds % (60*60);
		var minutes = Math.floor(seconds / 60);
		seconds = Math.floor(seconds % 60);
		
		return {hours: hours, minutes: minutes, seconds: seconds};
	}
	
	function secondsToInterval(seconds)
	{
			var hms = secondsToHMS(seconds);
			
			return zeroPad(hms.hours, 2)+":"+
				   zeroPad(hms.minutes, 2)+":"+
				   zeroPad(hms.seconds, 2);
	}
	
	function setClockDisplay(seconds)
	{
		var hms = secondsToHMS(seconds);
		
		$('#clock .hour').html(zeroPad(hms.hours, 2));
		$('#clock .minute').html(zeroPad(hms.minutes, 2));
		$('#clock .second').html(zeroPad(hms.seconds, 2));
		$('#tabs .now.tab .total-time-plus').html(secondsToInterval(seconds + $('.main-panel .total-time').data('value')));
	}
	
	function pauseTimer()
	{
		var elapsed = timerElapsed();
		timeBuffer = elapsed;
		
		start = 0;
		clearInterval(clockUpdater);
		clockUpdater = null;
		
		$('#clock').addClass('warning').addClass('inactive');
	}
	
	function stopTimer()
	{
		pauseTimer();
		timeBuffer = 0;
		
		$('#clock').removeClass('warning');
		setClockDisplay(0);
		$('button.start').removeClass('pause').html('Start');
	}
	
	function startTimer()
	{
		timeBuffer = 0;
		resumeTimer();
		
		$('.main-panel button.finish').prop('disabled', false);
	}
	
	function resumeTimer()
	{
		if (start > 0)
			timeBuffer = timerElapsed();
		start = new Date().getTime();
		
		setClockDisplay(timeBuffer);
		
		clockUpdater = setInterval(function() {
			if (start == 0)
				return;
			
			var seconds = Math.floor(((new Date()).getTime() - start)/1000 + timeBuffer);
			setClockDisplay(seconds);
		}, 500);
		
		$('#clock').removeClass('inactive').removeClass('warning');
	}
	
	function timerElapsed()
	{
		if (start == 0)
			return timeBuffer;

		return Math.floor(((new Date()).getTime() - start)/1000) + timeBuffer;
	}
	
	function addTimeEntry(entry)
	{
		addTimeEntryUI(entry);
		
		if (!window.localStorage)
			return;
		
		if (!window.localStorage.timeEntries)
			window.localStorage.timeEntries = '[]';
		
		var entries = JSON.parse(window.localStorage.timeEntries);
		entries.push(entry);
		
		window.localStorage.timeEntries = JSON.stringify(entries);
	}
	
	function secondsToDateTime(seconds)
	{
		var date = new Date(parseInt(seconds));
		
		return date.toLocaleDateString()+' '+date.toLocaleTimeString();
	}
	
	function secondsToTime(seconds)
	{
		var date = new Date(parseInt(seconds));
		
		return date.toLocaleTimeString();
	}
	
	function intervalToSeconds(dt)
	{
		parts = dt.split(':');
		
		try {
			if (parts.length == 2)
				return parseInt(parts[0]*60) + parseInt(parts[1]);
			else if (parts.length == 3)
				return parseInt(parts[0]*60*60) + parseInt(parts[1]*60) + parseInt(parts[2]);
			else
				return parseInt(dt);
		} catch (e) {
			return -1;
		}
	}
	
	function addTimeEntryUI(entry, animate)
	{
		if (typeof animate == 'undefined')
			animate = true;
		
		var $entry = $('#templates .time-entry').clone();
		
		$entry.attr('data-id', entry.id);
		
		$entry.find('input.note').val(entry.note);
		$entry.find('input.time').val(entry.time);
		$entry.find('input.tag').val(entry.tag);
		$entry.find('input.startTime').val(entry.startTime);
		$entry.find('input.endTime').val(entry.endTime);
		
		$entry.find('.display-note').html(entry.note.replace(/\n/g, "<br/>\n"));
		$entry.find('.display-time-spent').html(secondsToInterval(entry.time));
		$entry.find('.display-start-time').html(secondsToTime(entry.startTime));
		$entry.find('.display-end-time').html(secondsToTime(entry.endTime));
		$entry.find('.display-tag').html(entry.tag);
	
		$entry.find('.display-note').click(function() {
			var $displayNote = $(this);
			var $textarea = $('<textarea style="min-width:10em;width:40em;max-width:100%;height:10em;"></textarea>');
			var initialValue = $entry.find('input.note').val();
			$textarea.val(initialValue);
			$displayNote.after($textarea).detach();
			$textarea.focus();
			
			$textarea.blur(function() {
				$entry.find('input.note').val($(this).val());
				$displayNote.html($(this).val().replace(/\n/g, "<br/>\n"));
				$(this).after($displayNote).detach();
				
				if ($(this).val() != initialValue) {
					window.localStorage.timeEntries = JSON.stringify(serializeTimeEntries($('.time-entries')));
				}
				updateStats();
			});
		});
		$entry.find('.display-time-spent').click(function() {
			var $displayTime = $(this);
			var $textarea = $('<input type="text" style="font-size:200%;width:4.5em;text-align:center;" />');
			var initialValue = $entry.find('input.time').val();
			$textarea.val(secondsToInterval(initialValue));
			
			$displayTime.after($textarea).detach();
			
			$textarea.focus();
			
			$textarea.blur(function() {
				var seconds = intervalToSeconds($(this).val());
				
				if (isNaN(seconds)) {
					alert('Please provide a valid interval. You provided \''+$(this).val()+'\'');
					$(this).val(secondsToInterval(seconds = initialValue));
				}
				
				$entry.find('input.time').val(seconds);
				$displayTime.html(secondsToInterval(seconds));
				
				$(this).after($displayTime).detach();
				
				if (seconds != initialValue) {
					window.localStorage.timeEntries = JSON.stringify(serializeTimeEntries($('.time-entries')));
				}
				updateStats();
			});
		});
		$entry.find('.display-tag').click(function() {
			var $display = $(this);
			var $html = $('<div style="height:1em;display:inline-block;"><input type="text" style="font-size:100%;margin-top:-1em;width:8em;text-align:center;padding:-0.2em 0.2em;" /></div>');
			var $textarea = $html.find('input');
			
			var initialValue = $entry.find('input.tag').val();
			$textarea.val(initialValue);
			
			$display.after($html).detach();
			
			$textarea.focus();
			
			$textarea.blur(function() {
				var value = $(this).val();
				$display.html(value);
				$entry.find('input.tag').val(value);	
				$(this).after($display).detach();
				
				if (value != initialValue) {
					window.localStorage.timeEntries = JSON.stringify(serializeTimeEntries($('.time-entries')));
				}
				updateStats();
				usedTag(value);
			});
		});
		
		$entry.find('a.select').click(function() {
			if ($entry.hasClass('selected')) {
				$entry.removeClass('selected');
				$(this).html('&#9634;');
			} else {
				$entry.addClass('selected');
				$(this).html('&#9635;');
			}
		});

		$entry.find('a.remove').click(function() {
			var $timeEntries = $(this).parents('.time-entries:first');
		
			$entry.slideUp(500, function() {	
				$entry.remove();
			
				var entries = serializeTimeEntries($timeEntries);
			
				//alert(JSON.stringify(entries));
				window.localStorage.timeEntries = JSON.stringify(entries);
				updateStats();
			});

		});
		
		var daysOfWeek = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
		var months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
		var day = new Date(parseInt(entry.startTime));
		var dateKey = day.getDateStamp();
		var dayLabel = daysOfWeek[day.getDay()] + ' ' + months[day.getMonth()] + ' ' + day.getDate();
		
		if (dateKey == (new Date()).getDateStamp())
			dayLabel = 'Today';
		
		var $dateTab = $('#tabs .days .date-'+dateKey);
		
		if ($dateTab.length == 0)
			$dateTab = buildDateTab(dayLabel, dateKey);
		
		var $timeEntries = $dateTab.find('.time-entries');
		
		$timeEntries.append($entry);
		$timeEntries.find('.empty').slideUp();

		if (animate) // hrm....
			updateStats();

		if (animate)
			$entry.hide().slideDown();
		else
			$entry.show();
	}
	
	function buildDateTab(dayLabel, dateKey)
	{
		// Create a new time-entry-list-view from the template 
		
		var $dateTab = $('#templates > .time-entry-list-view').clone();
		var $timeEntries = $dateTab.find('.time-entries');
		var $tabButton = $('<button></button>')
			.addClass('date-'+dateKey)
			.html(dayLabel);
		
		// Mark the new list view as being a tab, and stain it with the date key 
		// so we can find it later.
			
		$dateTab.addClass('tab');
		$dateTab.addClass('date-'+dateKey);
		$dateTab.data('hash', 'date-'+dateKey);
		$dateTab.data('date', dateKey);

		//////// Behaviors and Event Handlers ////////////
	
		$timeEntries.sortable({
			distance: 50,
			stop: function() {
				window.localStorage.timeEntries = JSON.stringify(serializeTimeEntries($('.time-entries')));
			}
		});
	
		$dateTab.find('button.export').click(function() {
			var $div = $('<div />');
			
			$div.addClass('overlay');
			
			$div.html($('#templates .export-box').clone());
			
			$div.find('textarea.export').val(JSON.stringify(serializeTimeEntries($('.time-entries'))));
			
			$div.find('button.close').click(function() {
				$div.remove();
			});
			
			$('body').append($div);
			
			$div.hide().fadeIn();
		});
		
		$dateTab.find('button.merge').click(function() {
			var ids = [];
			var serial = serializeTimeEntries($timeEntries);
			var $sentinal = null;			
			var $entries = $timeEntries.find('.time-entry.selected');

			if ($entries.length == 0) {
				alert('Click Merge next to each entry first, then click the top Merge button to combine them.');
				return;
			}

			// Go through the selected entries
			// - Select the first $entry as $sentinel, will be replaced later with the new entry.
			// - All the non-sentinals will be detached. 
			// - Get the [data-id] from each one into the ids array.
			
			$entries.each(function() {
				ids.push($(this).attr('data-id'));
				if ($sentinal == null) 
					$sentinal = $(this);
				else
					$(this).detach();
			});

			// Create an empty entry to hold the merged data from the selected entries.
			
			var entry = {
				id: Math.floor(Math.random()*10000000),
				time: 0,
				tag: null,
				startTime: null,
				endTime: null,
				note: ''
			};

			// We will run through the time entries in the overall data, finding
			// the IDs of the ones we are interested in and adding their data together
			// for our new entry.
						
			$(serial).each(function(i,e) {
				if (ids.indexOf(e.id) < 0)
					return;

				entry.time += parseInt(e.time);											// Add the times together
				
				if (entry.startTime === null || e.startTime < entry.startTime)			// Take the earliest start time.
					entry.startTime = e.startTime;
				
				if (entry.endTime === null || e.endTime > entry.endTime)				// Take the latest end time.
					entry.endTime = e.endTime;
				
				entry.note += "\n" + e.note;											// Just merge the notes in a dumb way,
				
				if (!entry.tag && e.tag != 'unlabeled')									// Pick this tag if we don't have one yet.
				
					entry.tag = e.tag;
			});

			// Make sure we haven't got a blank tag, and trim the leading newline from the note.
			
			if (!entry.tag)
				entry.tag = 'unlabeled';

			if (entry.note.length > 0)
				entry.note = entry.note.substr(1);

			// Add the time entry, and move it to where it is supposed to be.
				
			addTimeEntryUI(entry);
			$sentinal.after($newEntry).detach();

			// Update the data and statistics
			
			window.localStorage.timeEntries = JSON.stringify(serializeTimeEntries($('.time-entries')));
			updateStats();
			
			// Scroll to the new entry
			
			var $newEntry = $('.time-entries .time-entry[data-id='+entry.id+']');
			$newEntry[0].scrollIntoView();
			
			// A cool fading effect
			
			var baseColor = 'rgba(250, 162, 0';
			var opacity = 1;
			
			$newEntry.css('background-color', baseColor+', 1.0');
			
			var interval;
			interval = setInterval(function() {
				opacity -= 0.01;
				$newEntry.css('background-color', baseColor+', '+opacity+')');
				if (opacity <= 0.0001) {
					clearInterval(interval);
					$newEntry.css('background-color', '');
				}
			}, 33);

		});
	
		$tabButton.click(function() {
			showPrimaryTab($dateTab, $tabButton);
		});
			
		// Install the new tab 
		
		if (dayLabel == 'Today')
			$('#tabs .buttons .days').prepend($tabButton);
		else
			$('#tabs .buttons .days').append($tabButton);
		
		$('#tabs > .days').append($dateTab);
		
		$dateTab.hide();
		
		return $dateTab;
	}
	
	function produceStats(entries, selector)
	{
		var total = 0;
		var groups = {};
		var names = [];
		var count = 0;
		
		$(entries).each(function(i,e) {
			if (selector && !selector(e))
				return;
			
			total += parseInt(e.time);
			count += 1;
			
			if (e.tag) {
				if (!groups[e.tag])
					groups[e.tag] = 0;
				groups[e.tag] += parseInt(e.time);
				names.push(e.tag);
			}
		});
		
		names.sort(function(a, b) {
			if (a == b)
				return 0;
			
			return a > b ? 1 : 0;
		});
		
		return {
			total: total,
			count: count,
			groupTotals: groups,
			groups: names
		}
	}
	
	function populateStatsUI($stats, stats)
	{
		var $html = $([]);
		var $slides = $([]);
		
		$stats.find('> div').not('.ignore').addClass('removed');
		
		for (var i in stats.groups) {
			var key = stats.groups[i];
			var groupName = key, groupTime = secondsToInterval(stats.groupTotals[key]);
			var safeGroupName = groupName.replace(/\\/g, "\\\\").replace(/\'/g, "\\'");
			var $oldGroupStat = $stats.find('[data-group=\''+safeGroupName+'\']');
			var $groupStat = $('<div><label class="columnar">'+groupName+': </label>'+groupTime+'</div>');
			
			$groupStat.attr('data-group', groupName);
			
			if ($oldGroupStat.length == 0)
				$groupStat.attr('data-is-new', '1');
			
			//if ($oldGroupStat.length > 0)
			//	$oldGroupStat.after($groupStat);
			//else
				$stats.append($groupStat);
			
			$oldGroupStat.remove();
		}	
		
		$stats.find('> div.removed').slideUp(400, function() {
			$(this).detach();
		});
		
		$stats.find('[data-is-new=1]')
			.attr('data-is-new', '')
			.hide().slideDown();
		
		$stats.find('.total-time').data('value', stats.total).html(secondsToInterval(stats.total));
		//$stats.find('.total-time-plus').html(secondsToInterval(timerElapsed() + $('.main-panel .total-time').data('value')));
	}
	
	function updateStats()
	{
		var entries = serializeTimeEntries();
		var $stats = $('#tabs .now.tab .stats');
		var stats = produceStats(entries);
		
		populateStatsUI($stats, stats);
		
		$('#tabs > .days .tab').each(function() {
			var $tab = $(this);
			var $stats = $tab.find('.stats');
			var currentDateKey = $tab.data('date');
			
			var stats = produceStats(entries.filter(function(item) {
				return (currentDateKey == new Date(parseInt(item.startTime)).getDateStamp());
			}));
			
			populateStatsUI($stats, stats);
		});
	}
	
	function showPrimaryTab($tab, $tabButton, navigate) {
		var $app = $('#app');
		
		if (typeof navigate === 'undefined')
			navigate = true;
		
		if (navigate && $tab.data('hash')) {
			window.location.hash = '#/'+$tab.data('hash');
			return;
		}
		
		$app.find('#tabs > .tab, #tabs > .days > .tab').hide();
		$tab.show();
		
		$('#tabs .buttons button.active').removeClass('active');
		$tabButton.addClass('active');
	}
	
	function serializeTimeEntries($timeEntries)
	{
		if (typeof $timeEntries === 'undefined') {
			$timeEntries = $('.time-entries').not('.mirror');
		}
		
		var entries = [];
		
		$timeEntries.find('.time-entry').each(function() {
			entries.push({
				time: $(this).find('input.time').val(),
				note: $(this).find('input.note').val(),
				startTime: $(this).find('input.startTime').val(),
				endTime: $(this).find('input.endTime').val(),
				id: $(this).attr('data-id'),
				tag: $(this).find('input.tag').val()
			});
		});
		
		return entries;
	}
	
	function loadTimeEntries() {
		if (window.localStorage.timeEntries) {
			var entries = JSON.parse(window.localStorage.timeEntries);
			$(entries).each(function(i,entry) {
				addTimeEntryUI(entry, false);
			});
			updateStats();
			$('#time-entries .time-entries .time-entry').hide().slideDown(700);
		}	
	}
	
	function installAppBehaviors() {
	
		$('.whenpad-version').html(WHENPAD_VERSION);
		$('select.auto-tag').change(function() {
			var $autoTags = $(this);
			
			if ($autoTags.find(':selected').filter('.add').length > 0) {
				var tag = prompt("New tag:");
				
				if ($autoTags.find('option[value=\''+tag.replace(/\\/, "\\\\").replace(/'/, "\\'") +'\']').length == 0) {
					var $newTag = $('<option>'+tag+'</option>').val(tag);	
					
					$autoTags.find('option.add').before($newTag);
					$newTag.prop('selected', true);
					//$autoTags.change();
				}
				
				//return;
			}
			
			var val = $(this).val();
			$(this).prevAll('.new-tag:first').html(val);
			usedTag(val);
			updateAutoTags();
			//$(this).val('');
		});
	
		$app.find('#logo').click(function() {
			showPrimaryTab($('#tabs > .about.tab'), $(this));
		});
		
		$app.find('#tabs .buttons button.now').click(function() {
			showPrimaryTab($('#tabs > .now.tab'), $(this));
		});
			
		
		$app.find('button.finish').click(function() {
			if ($('textarea.note').val() == '') {
				alert('Please describe what you are doing so you can make sense of this later.');
				return;
			}
			
			var time = timerElapsed();
			stopTimer();
			var $note = $('textarea.note');
			var note = $note.val();
			var tag = $('span.new-tag').text();
		
			usedTag(tag);
	
			addTimeEntry({
				note: note,
				time: time,
				tag: tag,
				startTime: startTime.getTime(),
				endTime: (new Date()).getTime(),
				id: Math.floor(Math.random()*10000000)
			});
			
			$note.val('');
			startTimer();
		});

		$app.find('button.modify').click(function() {
			var $addTime = $('input.add-time');	
			var value = $addTime.val().replace(/^ | $/g, '');
			var negation = 1;

			if (value[0] == '-')
				negation = -1;

			var modifier = intervalToSeconds($addTime.val());
			timeBuffer += modifier * negation;

			$addTime.val('00:00:00');
		});
	
		$app.find('button.start').click(function() {
			
			if ($(this).hasClass('pause')) {
				$(this).removeClass('pause');
				$(this).addClass('resume');
				$(this).html('Resume');
				
				pauseTimer();
				return;
			}
			
			$(this).html('Pause');
			$(this).addClass('pause');
			
			if ($(this).hasClass('resume'))
				resumeTimer();
			else {
				startTimer();
				startTime = new Date();
			}
		});
	}
	
	function hashChanged() {
		var hash = window.location.hash;
		
		if (hash == '')
			hash = '#/now';
		
		hash = hash.substr(1);
		hash = hash.replace(/^\/+/, '');
		
		var $tab = $('#tabs fieldset.'+hash);
		var $button = $('#tabs .buttons button.'+hash);
		
		if ($tab.length > 0 && $button.length > 0) {
			showPrimaryTab($tab, $button, false);
		} else {
			showPrimaryTab($('#tabs > .about.tab'), $('#logo'), false);
		}
	}
	
	function installHash() {
		$(window).bind('hashchange', hashChanged);
		
		if (window.location.hash == '')
			window.location.hash = '#/now';
		else 
			hashChanged();
	}
	
	function initializeApp() {
		$app = $('#app');
		installMonkeyPatches();
		updateAutoTags();
		loadTimeEntries();
		installAppBehaviors();
		installHash();
	}
	
	$(document).ready(function() {
		initializeApp();
	});
}();
