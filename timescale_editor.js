//
// PBDB Timescale editor
//
// Author: Michael McClennen
// 
// This code is designed to work with the file timescale_editor.html to implement a Web
// application for editing timescales in the Paleobiology Database using the database's API.



// The following function is the constructor for the application controller object.  This should
// be called once, at load time, and provided with the following parameters:
// 
// data_url		base URL for the API
// is_contributor	true if the user is logged in to the database, false otherwise
// 
// After this object is instantiated, its initApp method should be called to initialize it.  It is
// a good idea to call this after the entire web page is loaded, so that all necessary DOM
// elements will be in place.

function TimescaleEditorApp ( data_url, resource_url, is_contributor )
{
    "use strict";
    
    // Initialize some private variables.
    
    var timescales_pane;
    var ts_attrs_pane;
    var bounds_pane;
    
    var pane_group = { 'ts_attrs_pane': 1, 'intervals_pane': 1,
		       'edit_attrs': 2, 'edit_intervals': 2 };
    
    var init_box;
    var intervals_box;
    var ts_attrs_box;
    var bound_selector_bounds_box;
    
    var edit_timescale_id;
    var edit_timescale_attrs;
    
    var edit_bounds_attrs;
    
    var base_timescale_id;
    var base_bound_id;
    
    var bound_selector_box;

    var valid_age = /^([0-9]+|[0-9]+[.][0-9]*)$/;
    var valid_frac = /^(0|0?[.][0-9]*)$/;
    var has_digit = /[0-9]/;
    
    var appstate = { current_timescale_id: undefined,
		     current_timescale_name: '',
		     timescale_selector: { },
		     bound_selector: { },
		     add_intervals: { },
		     ts_attrs: { },
		     bounds: { },
		     intervals: { } };
    
    this.appstate = appstate;
    
    var international_no = { 'tsc:1': 1, 'tsc:2': 2, 'tsc:3': 3,
			     'tsc:4': 4, 'tsc:5' : 5, 'tsc:10' : 10 };
    
    var form_elt = { };
    
    var bounds_edit = { };
    
    var hi_color = 'lightblue';
    
    var model_match_diff = 2.0;
    var model_match_frac = 0.05;
    
    var done_config1, done_config2;
    
    // Objects for holding data cached from the API
    
    var api_data = { timescales_id: { },
		     timescale_list: [ ],
		     timescale_bound_list: { },
		     bounds_id: { },
		     bounds_dep: { },
		     ics_ages: { },
		     ics_best: { },
		     refs_id: { } };
    
    this.api_data = api_data;
    
    // The following function initializes this application controller object.  It is exported as a
    // method, so that it can be called once the web page is fully loaded.  It intializes some of
    // the user interface elements, and also makes API calls to get a list of timescales and also
    // the bounds from the ICS timescales.  When both of these calls complete, the "initializing
    // form..." HTML floating element is hidden, signaling to the user that the application is
    // ready for use.
    
    function initApp ()
    {
	// Do various initialization steps
	
	selectPane('ts_attrs_pane', 'edit_attrs');
	
	init_box = myGetElement("db_initmsg");
	intervals_box = myGetElement("intervals_box");
	bound_selector_box = myGetElement("bound_selector");
	bound_selector_bounds_box = myGetElement("bound_selector_bounds")
	
	// if ( !init_box || ! timescales_box || ! bounds_box )
	//     return badInit();
 	
	// initialize some form elements
	
	form_elt.btps = [ 'absolute', 'spike', 'same', 'fraction' ];
	form_elt.btpnames = [ 'absolute', 'spike', 'same as', 'fraction' ];
	
	// Initialize some of the interface elements.
	
	var content;
	
	content = makeOptionList( [ '', '--',
				    'supereon', 'supereons', 'eon', 'eons',
				    'era', 'eras', 'period', 'periods', 'superepoch', 'superepochs',
				    'epoch', 'epochs', 'subepoch', 'subepochs',
				    'stage', 'stages', 'substage', 'substages',
				    'zone', 'zones', 'chron', 'chrons', 'multi', 'multiple' ] );
	
	setInnerHTML("ts_type", content);
	
	content = makeOptionList( [ 'absolute', 'absolute', 'spike', 'spike',
				    'same', 'same as', 'fraction', 'modeled as' ] );

	setInnerHTML("be_bound_type", content);

	content = makeOptionList( [ '', '--', '0', '0', '1', '1', '2', '2', '3', '3', '4', '4',
				    '5', '5', '6', '6', '7', '7', '8', '8', '9', '9', '10', '10' ] );

	setInnerHTML("ts_priority", content);
	
	clearTimescaleAttrs();
	
	// Initiate an API call to fetch necessary data.  This has a callback to handle the data
	// that comes back, and a failure callback too.
	
	$.getJSON(data_url + 'timescales/list.json?all_records&show=desc')
	    .done(callback1)
	    .fail(badInit);
	
	$.getJSON(data_url + 'timescales/bounds.json?timescale_id=tsc:1,tsc:2,tsc:3,tsc:4,tsc:5')
	    .done(callback2)
	    .fail(badInit);
    }
    
    this.initApp = initApp;
    
    function callback1 (response)
    {
	// If no results were received, we're in trouble.  The application can't be used if the
	// API is not working, so there's no point in proceeding further.
	
	if ( ! response.records ) return badInit();
	
	// Otherwise, store all of the response records and update the appropriate user interface
	// elements.
	
	cacheTimescaleData(response.records);
	
	// If both API calls are complete, finish the initialization process. 
	
	done_config1 = 1;
	if ( done_config2 ) finishInitApp();
	
    }

    function callback2 (response)
    {
	// If no results were received, we're in trouble.  The application can't be used if the
	// API is not working, so there's no point in proceeding further.
	
	if ( ! response.records ) return badInit();

	// Otherwise, store all of the response records and update the appropriate user interface
	// elements.
	
	cacheBoundData(response.records);
	
    	// If both API calls are complete, finish the initialization process. 
	
	done_config2 = 1;
	if ( done_config1 ) finishInitApp();
    }
    
    // This function notifies the user that this application is not able to be used.  It is called
    // if either of the configuration API calls fail.  If the API is not working, there's no point
    // in proceeding with this application.
    
    function badInit ( )
    {
	setElementContent("initmsg", "Initialization failed! Please contact admin@paleobiodb.org");
    }
    
    // This function is called when the configuration API calls are complete.  It hides the
    // "initializing form, please wait" HTML floating object, and then initializes the various
    // parts of the app.
    
    function finishInitApp ()
    {
	// Remove the initialization message box.
	
	init_box.style.display = 'none';
	
	// clear timescale attrs form
	
	// clearTimescaleAttrs();
    }
    
    // PANE SELECTION
    
    function selectPane ( pane_id, button_id )
    {
	var group_no = pane_group[pane_id];
	
	if ( group_no )
	{
	    var show_pane = document.getElementById(pane_id);
	    if ( show_pane )
		show_pane.style.display = '';
	    
	    for (var key in pane_group)
	    {
		if ( key != pane_id && pane_group[key] == group_no )
		{
		    var hide_pane = document.getElementById(key);
		    if ( hide_pane)
			hide_pane.style.display = 'none';
		}
	    }
	}
	
	else
	{
	    console.log("ERROR: invalid argument '" + pane_id + "' for selectPane");
	    return;
	}
	
	var button_no = pane_group[button_id];

	if ( button_no )
	{
	    var hilight_button = document.getElementById(button_id);
	    if ( hilight_button ) $(hilight_button).addClass('tsed_highlight');
	    
	    var buttons = otherElements(button_id);
	    for ( var i=0; i<buttons.length; i++ )
		$(buttons[i]).removeClass("tsed_highlight");
	}
    }
    
    this.selectPane = selectPane;

    function otherElements ( pane_id )
    {
	var result = [ ];

	var group_no = pane_group[pane_id];

	if ( group_no )
	{
	    for (var key in pane_group)
	    {
		if ( key != pane_id && pane_group[key] == group_no )
		{
		    var element = document.getElementById(key);
		    if ( element ) result.push(element);
		}
	    }	    
	}

	return result;
    }

    // API INTERFACE

    // Simple function for fetching records.
    
    function fetchAPIData ( operation_url, done_function, fail_function )
    {
	$.getJSON(data_url + operation_url)
	    .done(done_function)
	    .fail(fail_function);
    }

    // Function for reporting errors on failed API calls.

    function handleAPIError ( xhr, status, errorText )
    {
	var error_list = xhr.responseJSON.errors;

	if ( error_list && error_list.length )
	{
	    var error_str = error_list.join("\n");
	    window.alert(error_str);
	}

	else
	{
	    window.alert(errorText);
	}
    }
    
    // Cache timescale data in the 'api_data' object where, it can be referred to by the rest of
    // the application code. The object passed to this function must be an array containing the
    // attributes of *all* timescales in the database.
    
    function cacheTimescaleData ( records )
    {
	if ( ! records || records.length == 0 )
	{
	    console.log("ERROR: timescale query returned no records");
	    return;
	}
	
	// Delete all of the old timescale data, since we are replacing it with the most up-to-date query
	// result.
	
	api_data.timescale_list = [ ];
	api_data.timescales_id = { };
	
	// Store the new data in the api_data cache.
	
	for ( var i=0; i < records.length; i++ )
	{
	    var record = records[i];
	    
	    api_data.timescale_list.push(record.oid);
	    api_data.timescales_id[record.oid] = record;
	}
	
	// Then update the timescale lists in various user interface elements to reflect this
	// query result.
	
	refreshTimescales("timescale_selector", "timescale_selector_timescales");
	refreshTimescales("bound_selector", "bound_selector_timescales");
    }
    
    // Cache bound data in the 'api_data' object, where it can be referred to by the rest of the
    // application code. Also fetch any bounds referenced by the cached records, if they are not
    // already cached. The object passed to this database is assumed to be an array that contains
    // the attributes of all of the bounds in one or more timescales.
    
    function cacheBoundData ( records, completion_function )
    {
	if ( ! records || records.length == 0 )
	{
	    // console.log("ERROR: bound query returned no records");
	    if ( completion_function ) completion_function();
	    return;
	}
	
	// Otherwise, store all of the response records in the appropriate variables so that other
	// functions can access them.
	
	// api_data.bounds_timescale_id = { };
	// api_data.bounds_id = { };
	// api_data.ics_ages = [ ];
	// api_data.ics_best = { };
	
	// api_data.bounds_dep = { };
	
	// First determine which timescales have been queried.
	
	var fetched_tsc = { };
	
	for ( var i=0; i < records.length; i++ )
	{
	    var record = records[i];
	    if ( record.sid ) fetched_tsc[record.sid] = 1;
	}
	
	// Then delete the cached bound records for these timescales.
	
	for ( var sid in fetched_tsc )
	{
	    if ( api_data.timescale_bound_list[sid] )
	    {
		var list = api_data.timescale_bound_list[sid];
		
		for ( var i=0; i < list.length; i++ )
		{
		    if ( api_data.bounds_id[list[i]] ) api_data.bounds_id[list[i]] = null;
		}
	    }
	    
	    api_data.timescale_bound_list[sid] = [ ];
	    
	    // temporary debugging message
	    console.log("FETCHED timescale " + sid);
	}
	
	// Then add the new records to the api_data cache. Keep track of the identifiers of all
	// referenced bounds. Also compute a lower name for each bound that is the upper bound for
	// some interval.
	
	var ref_bounds_id = { };
	var lower_name = { };
	var min_age;
	var bad_sid;
	
	for ( var i=0; i < records.length; i++ )
	{
	    var record = records[i];
	    
	    // Ignore any record that was deleted, and also ignore any record that doesn't have
	    // both an sid field and an oid field. Any record that has an oid but no sid triggers
	    // a warning, unless it represents a deleted record.
	    
	    if ( record.sta == 'deleted' )
		continue;
	    
	    if ( ! record.sid || ! record.oid )
	    {
		if ( record.oid ) bad_sid = 1;
		continue;
	    }
	    
	    if ( international_no[record.sid] ) record.scale_no = international_no[record.sid];
	    
	    // Store each bounds record in each of the appropriate arrays.
	    
	    api_data.timescale_bound_list[record.sid].push(record.oid);
	    api_data.bounds_id[record.oid] = record;
	    
	    // Then record all of the bounds that are referenced by this record.
	    
	    if ( record.bid ) ref_bounds_id[record.bid] = 1;
	    if ( record.tid ) ref_bounds_id[record.tid] = 1;
	    if ( record.cid ) ref_bounds_id[record.cid] = 1;
	    if ( record.uid ) ref_bounds_id[record.uid] = 1;

	    // Finally, if this bound is the bottom of a named interval, store that name in
	    // conjunction with the upper bound. If more than one interval has the same upper
	    // bound, just store the first one.

	    if ( record.inm && record.uid && ! lower_name[record.uid] ) lower_name[record.uid] = record.inm;

	    // Also keep track of the minimum age.

	    if ( min_age == undefined || record.age < min_age ) min_age = record.age;
	}

	// Now go back and fill in the lower names. Also set an 'is_top' flag on the first record
	// we come to that has the minimum age.
	
	for ( i=0; i < records.length; i++ )
	{
	    var record = records[i];
	    if ( record.oid && lower_name[record.oid] ) record.one_lower = lower_name[record.oid];
	    if ( record.age == min_age ) record.is_top = 1;
	}
	
	// Report to the user if any records lacked an sid. This is an indication of something going seriously wrong.
	
	if ( bad_sid )
	{
	    window.alert("WARNING: at least one record had a bad or missing timescale id");
	}
	
	// Now go through the referenced bounds and check if any of them are not yet loaded. If
	// so, then load them.
	
	var load_list = [ ];
	
	for ( var id in ref_bounds_id )
	{
	    if ( ! api_data.bounds_id[id] ) load_list.push(id);
	}
	
	if ( load_list.length )
	{
	    var id_list = load_list.join(',');
	    
	    fetchAPIData(

		'timescales/bounds.json?id=' + id_list,

		function ( response ) {
		    cacheAdditionalBounds( response.records );
		    // temporary debugging message
		    console.log("FETCHED additional bounds: " + id_list);
		    if ( completion_function ) completion_function();
		},
		
		function ( xhr ) {
		    console.log("ERROR fetching additional bounds: " + id_list);
		}
	    );
	}

	else if ( completion_function )
	{
	    completion_function();
	}
    }
    
    function cacheAdditionalBounds ( records )
    {
	if ( records )
	{
	    for ( var i=0; i < records.length; i++ )
	    {
		var record = records[i];
		var oid = record.oid;

		api_data.bounds_id[oid] = record;
	    }
	}
    }
    
    function refreshTimescales ( modal_id, element_id )
    {
	var element = myGetElement(element_id);
	
	if ( ! element )
	{
	    alert("Could not find HTML element '" + element_id + "'");
	    return '';
	}
	
	var internationals = [ ];
	var others = [ ];
	var first_letter_select = { };
	
	for ( var i=0; i < api_data.timescale_list.length; i++ )
	{
	    var id = api_data.timescale_list[i];
	    var record = api_data.timescales_id[id];
	    
	    if ( ! record.oid ) continue;
	    
	    record.tno = Number(record.oid.replace(/^tsc:/, ''));
	    
	    if ( record.tno >= 1 && record.tno <= 10 )
		internationals.push(record);
	    else
		others.push(record);
	}
	
	internationals.sort( function(a, b) { return a.tno - b.tno } );
	others.sort( function(a, b) { return a.nam && b.nam ? a.nam.localeCompare(b.nam)
					   : a.nam ? a.nam : b.nam; } );

	// var selector_expr = "tsapp.modalChoice('" + modal_id + "','%oid')";
	var content = "";
	
	for ( var i=0; i < internationals.length; i++ )
	    content += generateTimescaleTableRow(internationals[i], modal_id);
	
	for ( var i=0; i < others.length; i++ )
	{
	    content += generateTimescaleTableRow(others[i], modal_id);

	    var letter = others[i].nam.slice(0,1).toUpperCase();
	    if ( ! first_letter_select[letter] ) first_letter_select[letter] = others[i].oid;
	}
	
	element.innerHTML = content;
	appstate[modal_id].first_letter_select = first_letter_select;
    }
    
    function generateTimescaleTableRow ( record, modal_id )
    {
	return '<tr><td title="' + record.oid + '" onclick="tsapp.modalChoice(\'' + modal_id +
	    '\', \'' + record.oid + '\', \'timescale\')">' + record.nam + "</td></tr>\n";
    }

    function generateBoundTableRow ( record, modal_id )
    {
	var content = record.age + ' - ';
	
	if ( record.inm ) content += record.inm;
	else if ( record.is_top ) content += ' - top of timescale';
	else if ( record.one_lower ) content += ' - top of ' + record.one_lower;
	else content += ' - ' + record.oid;
	
	return '<tr><td title="' + record.oid + '" onclick="tsapp.modalChoice(\'' + modal_id +
	    '\', \'' + record.oid + '\', \'bound\')">' + content + "</td></tr>\n";
    }

    // function selectTimescale ( timescale_id )
    // {
    // 	edit_timescale_id = timescale_id;
	
    // 	highlightTimescale(timescale_id);
	
    // 	displayBoundsList(bounds_box, edit_timescale_id);
    // 	displayTimescaleAttrs(edit_timescale_id);
    // }
    
    // this.selectTimescale = selectTimescale;
    
    function highlightTimescale ( timescale_id )
    {
	$("#timescales_box td").each(function () {
	    if ( this.title == timescale_id ) $(this).addClass("tsed_highlight");
	    else $(this).removeClass("tsed_highlight");
	});
    }

    // TIMESCALE SELECTION

    // This function is called when the "Open timescale" control is activated.
    
    function openTimescaleAction ( )
    {
	// If there are unsaved changes, ask if the user wants to save them. If not, then
	// abort this action.

	if ( checkTimescaleUnsaved() ) return;
	
	// Bring up the modal dialog box by which the user can select a timescale. The selection
	// callback will actually do so. If the user dismisses the dialog box, the current
	// timescale will be left in place.
	
	var modal_elt = myGetElement("timescale_selector");
	var input_elt = myGetElement("tsel_input");
	
	if ( modal_elt )
	{
	    modal_elt.style.display = "block";
	    if ( input_elt ) { input_elt.value = ''; input_elt.focus(); }
	    appstate.timescale_selector.choice_callback = function ( id, type ) {
		modalClose("timescale_selector");
		setCurrentTimescale(id);
	    };
	}
    }
    
    this.openTimescaleAction = openTimescaleAction;
    
    function openTimescaleKeypress ( modal_id, e )
    {
	if ( ! e ) return;
	if ( ! appstate[modal_id] || ! appstate[modal_id].first_letter_select ) return;
	
	var letter = e.key;
	
	setElementValue("tsel_input", "");
	
	if ( ! /^[a-zA-Z]/.test(letter) ) return;
	
	var first = letter.slice(0,1).toUpperCase();
	var found = appstate[modal_id].first_letter_select[first];
	
	$("#timescale_selector td").each(function () { if ( this.title == found ) this.scrollIntoView() });
	var a = 1;
    }
    
    this.openTimescaleKeypress = openTimescaleKeypress;
    
    // Set the application to edit the specified timescale.
    
    function setCurrentTimescale ( timescale_id )
    {
	if ( ! api_data.timescales_id[timescale_id] )
	{
	    alert("ERROR: could not find timescale '" + timescale_id + "'");
	    clearTimescaleAttrs();
	    clearIntervals();
	}
	    
	var name = api_data.timescales_id[timescale_id].nam;
	
	appstate.current_timescale_id = timescale_id;
	appstate.current_timescale_name = name;
	
	setElementContent("ts_name_intervals", name);
	setElementContent("ts_name_add_intervals", "Add Intervals to '" + name + "'");
	
	fetchAPIData(
	    
	    'timescales/single.json?show=desc&timescale_id=' + timescale_id,
	    
	    function ( response ) {
		if ( response.records && response.records.length )
		{
		    api_data.timescales_id[timescale_id] = response.records[0]
		    displayTimescaleAttrs(response.records[0]);
		}
		
		else
		{
		    clearTimescaleAttrs('error', "could not fetch the attributes of timescale '" + timscale_id + "'");
		}
	    },
	    
            function ( xhr ) {
		clearTimescaleAttrs('error', "could not fetch the attributes of timescale '" + timscale_id + "'");
	    }
	);
	
	fetchAPIData(

	    'timescales/bounds.json?timescale_id=' + timescale_id,

	    function ( response ) {
		cacheBoundData(response.records, function ( ) {
		    loadIntervals(timescale_id);
		    displayIntervals();
		    clearBoundEditor();
		    $(document.intervals_form.save).removeClass('tsed_active_save');
		});
	    },
	    
	    function ( xhr ) {
		clearTimescaleIntervals('error', "could not load bounds for timescale '" + timescale_id + "'");
	    }
	);
    }
    
    this.setCurrentTimescale = setCurrentTimescale;
    
    // This function is called when the "New timescale" control is activated.
    
    function newTimescaleAction ( )
    {
	// If there are unsaved changes, ask if the user wants to save them. If not, then
	// abort this action.

	if ( checkTimescaleUnsaved() ) return;

	// Otherwise, clear both the timescale attributes pane and the interval pane.
	
	appstate.current_timescale_id = undefined;
	appstate.current_timescale_name = '';
	
	clearTimescaleAttrs('new');
	clearIntervals('new');
	clearBoundEditor();
    }
    
    this.newTimescaleAction = newTimescaleAction;

    // If either the current timescale attributes or the current timescale intervals are dirty
    // (have unsaved changes) then return true unless the user clicks "ok" in a "confirm" dialog
    // box. Return false otherwise.
    
    function checkTimescaleUnsaved ( )
    {
	if ( appstate.ts_attrs.dirty )
	{
	    selectPane('ts_attrs_pane', 'edit_attrs');
	    var answer = window.confirm("There are unsaved changes to the attributes of timescale '" +
					appstate.current_timescale_name + "'. Discard them?");

	    if ( ! answer ) return 1;
	}
	
	if ( appstate.intervals.dirty )
	{
	    selectPane('intervals_pane', 'edit_intervals');
	    var answer = window.confirm("There are unsaved changes to the intervals of timescale '" +
					appstate.current_timescale_name + "'. Discard them?");

	    if ( ! answer ) return 1;
	}

	return;
    }
    
    // TIMESCALE ATTRS

    // This function is called when the "Delete timescale" control is activated.
    
    function deleteTimescaleAction ( )
    {
	// First make sure the user really wants to do this.

	var name = appstate.current_timescale_name;

	var answer = window.confirm("Delete timescale '" + name + "'?");

	if ( ! answer ) return;
	
	// Call the API to delete the timescale. If the call is rejected because of a caution,
	// then we need to ask the user whether to proceed.
	
	var timescale_id = appstate.current_timescale_id;
	
	if ( timescale_id )
	{
	    $.getJSON(data_url + 'timescales/delete.json?id=' + timescale_id)
		.done(function (response) {
		    clearTimescaleAttrs();
		    $.getJSON(data_url + 'timescales/list.json?all_records&show=desc')
			.done(function (response) {
			    cacheTimescaleData(response.records) });
		})
		.fail(fallbackDeleteTimescale);
	}
    }
    
    this.deleteTimescaleAction = deleteTimescaleAction;

    function fallbackDeleteTimescale ( xhr )
    {
	var a = 1;
	
	// $$$ must fix this
    }
    
    // This function is called when the "Save changes" control is activated.
    
    function saveTimescaleAttrsAction ( )
    {
	// Do nothing unless the timescale attributes have unsaved changes.
	
	if ( ! appstate.ts_attrs.dirty ) return;
	
	// Check that we have a non-empty timescale name and type.
	
	if ( ! appstate.ts_attrs.nam || appstate.ts_attrs.nam == 'New timescale' )
	{
	    window.alert("You must specify a timescale name");
	    return;
	}
	
	// if ( ! appstate.ts_attrs.typ )
	// {
	//     window.alert("You must specify a timescale type");
	//     return;
	// }
	
	// Now construct a record which will be submitted to the API.
	
	var new_record = { _label: "attrs" };
	
	if ( appstate.ts_attrs.is_new )
	{
	    new_record.timescale_name = appstate.ts_attrs.nam;

	    if ( appstate.ts_attrs.typ != '' )
		new_record.timescale_type = appstate.ts_attrs.typ;

	    if ( appstate.ts_attrs.ext != '' )
		new_record.timescale_extent = appstate.ts_attrs.ext;

	    if ( appstate.ts_attrs.txn != '' )
		new_record.timescale_taxon = appstate.ts_attrs.txn;

	    if ( appstate.ts_attrs.tsc != '' )
		new_record.timescale_comments = appstate.ts_attrs.tsc;
	    
	    if ( appstate.ts_attrs.rid != '' )
		new_record.reference_id = appstate.ts_attrs.rid;
	    
	    new_record.is_visible = appstate.ts_attrs.vis;
	    new_record.is_enterable = appstate.ts_attrs.enc;
	    // new_record.admin_lock = appstate.ts_attrs.lck;
	    
	    if ( appstate.ts_attrs.pri != '' && appstate.ts_attrs.pri != 0 )
		new_record.priority = appstate.ts_attrs.pri;
	}
	
	else
	{
	    new_record.timescale_id = appstate.current_timescale_id;
	    
	    var current = api_data.timescales_id[appstate.current_timescale_id];

	    if ( current == undefined )
	    {
		window.alert("ERROR: no timescale id was found");
		return;
	    }

	    if ( appstate.ts_attrs.nam != (current.nam || ''))
		new_record.timescale_name = appstate.ts_attrs.nam;
	    
	    if ( appstate.ts_attrs.typ != (current.typ || ''))
		new_record.timescale_type = appstate.ts_attrs.typ;
	    
	    if ( appstate.ts_attrs.ext != (current.ext || ''))
		new_record.timescale_extent = appstate.ts_attrs.ext;
	    
	    if ( appstate.ts_attrs.txn != (current.txn || ''))
		new_record.timescale_taxon = appstate.ts_attrs.txn;
	    
	    if ( appstate.ts_attrs.tsc != (current.tsc || ''))
		new_record.timescale_comments = appstate.ts_attrs.tsc;
	    
	    if ( appstate.ts_attrs.rid != (current.rid || ''))
		new_record.reference_id = appstate.ts_attrs.rid;
	    
	    var current_vis = current.vis ? 1 : 0;
	    var current_enc = current.enc ? 1 : 0;
	    var current_lck = current.lck ? 1 : 0;
	    var current_pri = current.pri ? current.pri : 0;

	    if ( appstate.ts_attrs.vis != current_vis )
		new_record.is_visible = appstate.ts_attrs.vis;

	    if ( appstate.ts_attrs.enc != current_enc )
		new_record.is_enterable = appstate.ts_attrs.enc;

	    if ( appstate.ts_attrs.lck != current_lck )
		new_record.admin_lock = appstate.ts_attrs.lck;
	    
	    if ( appstate.ts_attrs.pri != (current.pri || 0) )
		new_record.priority = appstate.ts_attrs.pri;
	}

	// Now encode the new record as JSON and send it in the body of an API request.

	var new_record_json = JSON.stringify(new_record);
	
        $.ajax({
	    url: data_url + 'timescales/addupdate.json?show=desc',
            type: 'PUT',
            data: new_record_json,
            contentType: 'application/json; charset=utf-8',
            dataType: 'json',
            async: false,
            success: saveTimescaleAttrsComplete,
            error: handleAPIError,
	});
	
	// We can stop here when debugging.

	var a = 1;
    }

    this.saveTimescaleAttrsAction = saveTimescaleAttrsAction;
    
    // Complete the save operation.

    function saveTimescaleAttrsComplete ( response )
    {
	if ( response && response.records && response.records.length )
	{
	    var record = response.records[0];
	    var timescale_id = record.oid;

	    api_data.timescales_id[timescale_id] = record;
	    displayTimescaleAttrs(record);

	    if ( ! appstate.current_timescale_id )
	    {
		appstate.current_timescale_id = record.oid;
		appstate.current_timescale_name = record.nam;
	    }
	}	
    }
    
    // This function is called when the "Revert" control is activated.
    
    function revertTimescaleAttrsAction ( )
    {
	if ( appstate.ts_attrs.is_new )
	{
	    clearTimescaleAttrs('new');
	    return;
	}
	
	else if ( appstate.ts_attrs.dirty )
	{
	    selectPane('ts_attrs_pane', 'edit_attrs');
	    var answer = window.confirm("There are unsaved changes to the attributes of timescale '" +
					appstate.current_timescale_name + "'. Discard them?");

	    if ( ! answer ) return;
	}
	
	displayTimescaleAttrs(api_data.timescales_id[appstate.current_timescale_id]);
    }

    this.revertTimescaleAttrsAction = revertTimescaleAttrsAction;
    
    function displayTimescaleAttrs ( record )
    {
	appstate.ts_attrs = { dirty: 0 };
	
	$(document.ts_attrs_form.save).removeClass('tsed_active_save');
	
	appstate.ts_attrs.nam = record.nam || '';
	setElementValue('ts_name', appstate.ts_attrs.nam);
	
	appstate.ts_attrs.oid = record.oid || '';
	setElementValue('ts_id', appstate.ts_attrs.oid);
	
	setElementValue('ts_min_age', record.lag != undefined ? record.lag : '');
	setElementValue('ts_max_age', record.eag != undefined ? record.eag : '');
	
	appstate.ts_attrs.ext = record.ext || '';
	setElementValue('ts_extent', appstate.ts_attrs.ext);
	
	appstate.ts_attrs.txn = record.txn || '';
	setElementValue('ts_taxon', appstate.ts_attrs.txn);
	
	appstate.ts_attrs.typ = record.typ || '';
	setElementValue('ts_type', appstate.ts_attrs.typ);

	appstate.ts_attrs.tsc = record.tsc || '';
	setElementValue('ts_comments', appstate.ts_attrs.tsc);
	
	appstate.ts_attrs.vis = record.vis ? 1 : 0;
	setElementValue('ts_visible', appstate.ts_attrs.vis);
	
	appstate.ts_attrs.enc = record.enc ? 1 : 0;
	setElementValue('ts_enterable', appstate.ts_attrs.enc);
	
	appstate.ts_attrs.lck = record.lck ? 1 : 0;
	setElementValue('ts_locked', appstate.ts_attrs.lck);

	appstate.ts_attrs.pri = record.pri || 0;
	setElementValue('ts_priority', appstate.ts_attrs.pri);
	
	appstate.ts_attrs.rid = record.rid || '';
	setElementValue('ts_refid', appstate.ts_attrs.rid);
	
	if ( record.rid ) fetchTimescaleRef(record.rid);
	else setElementValue('ts_ref', '');

	if ( record.err ) setInnerHTML("ts_attrs_msg", "Some intervals are improperly defined");
	else setInnerHTML("ts_attrs_msg", "");
    }
    
    function clearTimescaleAttrs ( arg, message )
    {
	appstate.ts_attrs = { dirty: 0 };
	
	$(document.ts_attrs_form.save).removeClass('tsed_active_save');
	
	setElementValue('ts_name', '');
	setElementValue('ts_id', '');
	setElementValue('ts_visible', 0);
	setElementValue('ts_enterable', 0);
	setElementValue('ts_locked', 0);
	setElementValue('ts_priority', '');
	setElementValue('ts_min_age', '');
	setElementValue('ts_max_age', '');
	setElementValue('ts_extent', '');
	setElementValue('ts_taxon', '');
	setElementValue('ts_type', '');
	setElementValue('ts_comments', '');
	setElementValue('ts_refid', '');
	setElementValue('ts_ref', '');
	
	if ( arg == 'new' )
	{
	    setElementValue('ts_name', 'New timescale');
	    setElementValue('ts_priority', '0');
	    appstate.ts_attrs.is_new = 1;
	}
	
	else if ( arg == 'error' )
	{
	    var new_text = 'ERROR ' + (message || 'ERROR: could not fetch timescale attributes');
	    setElementValue('ts_name', new_text);
	}
    }
    
    function fetchTimescaleRef ( rid )
    {
	if ( api_data.refs_id[rid] )
	{
	    displayTimescaleRef(api_data.refs_id[rid]);
	}

	else
	{
	    $.getJSON(data_url + 'refs/single.json?show=formatted&id=' + rid)
		.done(function ( response ) {
		    api_data.refs_id[rid] = response.records[0];
		    displayTimescaleRef(response.records[0])
		})
		.fail(function ( xhr ) { displayTimescaleRefError(xhr) });
	}
    }
    
    function displayTimescaleRef ( record )
    {
	appstate.ts_attrs.ref = record.ref || '';
	setElementValue('ts_ref', appstate.ts_attrs.ref);
    }

    function displayTimescaleRefError ( xhr )
    {
	setElementValue('ts_ref', "ERROR: not found");
    }
    
    function checkTimescaleAttrs ( )
    {
	// Go through the form contents row by row and see if any of the fields have changed.
	// Highlight any improper values.
	
	appstate.ts_attrs.nam = getElementValue('ts_name');
	appstate.ts_attrs.typ = getElementValue('ts_type');
	appstate.ts_attrs.ext = getElementValue('ts_extent');
	appstate.ts_attrs.txn = getElementValue('ts_taxon');
	appstate.ts_attrs.tsc = getElementValue('ts_comments');
	appstate.ts_attrs.vis = getElementValue('ts_visible');
	appstate.ts_attrs.enc = getElementValue('ts_enterable');
	appstate.ts_attrs.lck = getElementValue('ts_locked');
	appstate.ts_attrs.pri = getElementValue('ts_priority');
	
	var new_rid = getElementValue('ts_refid');
	
	var current = api_data.timescales_id[appstate.current_timescale_id] || { };
	
	var current_nam = current.nam || '';
	var current_typ = current.typ || '';
	var current_ext = current.ext || '';
	var current_txn = current.txn || '';
	var current_tsc = current.tsc || '';
	var current_rid = current.rid || '';
	var current_vis = current.vis ? 1 : 0;
	var current_enc = current.enc ? 1 : 0;
	var current_lck = current.lck ? 1 : 0;
	var current_pri = current.pri || 0;
	
	// check for empty timescale name; figure out a mechanism for error display;
	// on completion, clear the attrs

	appstate.ts_attrs.dirty = 0;
	
	if ( appstate.ts_attrs.nam != current_nam )
	{
	    appstate.ts_attrs.dirty = 1;
	}
	
	if ( appstate.ts_attrs.typ != current_typ )
	{
	    appstate.ts_attrs.dirty = 1;
	}
	
	if ( appstate.ts_attrs.ext != current_ext ||
	     appstate.ts_attrs.txn != current_txn ||
	     appstate.ts_attrs.tsc != current_tsc )
	{
	    appstate.ts_attrs.dirty = 1;
	}
	
	if ( new_rid != current_rid )
	{
	    appstate.ts_attrs.dirty = 1;
	}

	if ( new_rid != appstate.ts_attrs.rid )
	{
	    if ( new_rid ) fetchTimescaleRef(new_rid);
	    else setElementValue('ts_ref', '');

	    appstate.ts_attrs.rid = new_rid;
	}
	
	if ( appstate.ts_attrs.vis != current_vis ||
	     appstate.ts_attrs.enc != current_enc ||
	     appstate.ts_attrs.lck != current_lck ||
	     appstate.ts_attrs.pri != current_pri )
	{
	    appstate.ts_attrs.dirty = 1;
	}
		
	if ( appstate.ts_attrs.dirty )
	    $(document.ts_attrs_form.save).addClass('tsed_active_save');
	
	else
	    $(document.ts_attrs_form.save).removeClass('tsed_active_save');
    }
    
    this.checkTimescaleAttrs = checkTimescaleAttrs;

    // TIMESCALE INTERVALS 
    
    // Display the intervals and bounds for the specified timescale in the intervals pane. This
    // function assumes that the necessary data has already been fetched and cached in the
    // api_data object.
    
    function loadIntervals ( timescale_id )
    {
	// First grab the list of interval bound ids already cached for the specified timescale.
	
	var bound_id_list = api_data.timescale_bound_list[timescale_id];
	
	// Otherwise, clear the application state for the interval editor.
	
	appstate.intervals = { dirty: 0 };
	
	// Otherwise, generate an array of bound records by copying the bound record corresponding
	// to each id in the list. This array, kept as part of the application state, will keep
	// track of the locally edited attributes of each bound.
	
	appstate.intervals.bounds = [ ];
	appstate.intervals.bounds_id = { };

	if ( bound_id_list && bound_id_list.length )
	{
	    for ( var i=0; i<bound_id_list.length; i++ )
	    {
		var id = bound_id_list[i];
		var new_record = $.extend( { }, api_data.bounds_id[id]);
		appstate.intervals.bounds.push(new_record);
		appstate.intervals.bounds_id[id] = new_record;

		if ( new_record.err ) appstate.intervals.has_error = 1;
	    }
	}
    }
    
    function displayIntervals ( )
    {
	// If we have no interval bounds to display, clear the display pane.
	
	if ( ! appstate.intervals.bounds || appstate.intervals.bounds.length == 0 )
	{
	    clearIntervals();
	    computeBoundSelect();
	    updateOtherPanes();
	    return;
	}
	
	// Otherwise, organize these bounds into one or more columns of intervals and generate a
	// list of <option> elements that can be used to select a bound.
	
	computeIntervalStack();
	computeBoundSelect();
	updateOtherPanes();
	
	// Then generate the HTML content that will represent the intervals and bounds in this
	// timescale.
	
	intervals_box.innerHTML = generateIntervalDisplayContent( );
	
	// Decorate this content with an onclick handler for each sub-table row.
	
	$("#intervals_box tr").each(function () {
	    $(this).on("click", null, null, boundClick);
	});

	// Set or clear the has-errors message

	if ( appstate.intervals.has_error ) setInnerHTML("ts_intervals_msg", "Some intervals are improperly defined");
	else
	{
	    setInnerHTML("ts_intervals_msg", "");
	    setInnerHTML("ts_attrs_msg", "");
	}
    }
    
    // Build one or more sequences of intervals, each to be represented by a separate column in
    // the interval pane. If all of the intervals in this timescale fit together with no overlaps,
    // there will be only a single column. Each interval is placed in the leftmost column in which
    // it can fit without overlapping any of the other intervals already in that column. This
    // function also computes a sorted list of bound ages.
    
    function computeIntervalStack ( )
    {
	appstate.intervals.intervals = [ ];
	appstate.intervals.intervals_id = { };

	// appstate.intervals.columns = [ [ ] ];
	appstate.intervals.column_max = [ 0 ];
	
	appstate.intervals.ages = [ ];
	appstate.intervals.age_to_bound_id = { };
	appstate.intervals.age_has_error = { };
	appstate.intervals.age_multi_bounds = { };
	
	var bound_list = appstate.intervals.bounds;
	var bound_lookup = appstate.intervals.bounds_id;
	var age_to_bound_id = appstate.intervals.age_to_bound_id;
	var age_list = appstate.intervals.ages;
	
	// Map each age to the id of the first bound we find with that age. This will be used to
	// display the right-hand column of bounds.
	
	for ( var i=0; i < bound_list.length; i++ )
	{
	    var age = bound_list[i].age;
	    
	    if ( age == undefined || age == "" ) continue;
	    
	    if ( age_to_bound_id[age] == undefined )
	    {
		age_to_bound_id[age] = bound_list[i].oid;
	    }
	    
	    else
	    {
		if ( ! appstate.intervals.age_multi_bounds[age] )
		    appstate.intervals.age_multi_bounds[age] = [ age_to_bound_id[age] ];
		
		appstate.intervals.age_multi_bounds[age].push(bound_list[i].oid);
	    }

	    if ( bound_list[i].err ) appstate.intervals.age_has_error[age] = 1;
	}
	
	// Now make a sorted list of bound ages.
	
	var age_list = [ ];
	
	for (var age in age_to_bound_id)
	    age_list.push(age);
	
	appstate.intervals.ages = age_list.sort(function (a, b) { return a - b });
	
	var min_age = appstate.intervals.ages[0];
	
	// Then go through the bounds again. For each bound that is linked to a higher bound
	// through the uid field, add an interval record to the intervals list. Also add it to one
	// of the column lists.
	
	for ( var i=0; i < bound_list.length; i++ )
	{
	    var bound_id = bound_list[i].oid;
	    var top_id = bound_list[i].uid;
	    var age = bound_list[i].age;
	    var name = bound_list[i].inm || '';
	    
	    // Skip any bound with an empty age
	    
	    if ( age == undefined || age == "" ) continue;
	    
	    // Any bound that is linked to a top bound specifies an interval.
	    
	    if ( top_id && bound_lookup[top_id] )
	    {
		var top_age = bound_lookup[top_id].age;
		
		if ( top_age != undefined && top_age != "" )
		{
		    bound_lookup[bound_id].top_age = top_age;
		    bound_lookup[bound_id].upper_name = name;
		    bound_lookup[top_id].lower_name = bound_lookup[top_id].lower_name || [ ];
		    bound_lookup[top_id].lower_name.push(name);
		    bound_lookup[top_id].is_top = 1;
		    
		    var column = selectIntervalColumn(top_age);
		    
		    var interval = { bottom_id: bound_id,
				     top_id: top_id,
				     bottom_age: age,
				     top_age: top_age,
				     column: column,
				     name: name };
		    
		    // appstate.intervals.columns[select_col].push(interval);
		    appstate.intervals.column_max[column] = age;
		    appstate.intervals.intervals.push(interval);
		    appstate.intervals.intervals_id[bound_id] = interval;
		}
	    }
	    
	    // The first bound we find that has the minimum age counts as the top bound of the
	    // entire timescale.
	    
	    if ( age == min_age && ! appstate.intervals.top_bound_id )
		appstate.intervals.top_bound_id = bound_id;
	}
	
	var a = 1;	// we can stop here when debugging
    }
    
    function selectIntervalColumn ( top_age )
    {
	var select_col = 0;
	
	while ( ( top_age - appstate.intervals.column_max[select_col] ) < 0 )
	{
	    select_col++;
	    
	    if ( appstate.intervals.column_max[select_col] == undefined )
	    {
		// appstate.intervals.columns[select_col] = [ ];
		appstate.intervals.column_max[select_col] = 0;
	    }
	}
	
	return select_col;
    }
    
    function clearIntervals ( arg )
    {
	appstate.intervals = { dirty: 0 };
	appstate.intervals.bound_options = '';
	
	intervals_box.innerHTML = '<tr><td height="200px">&nbsp;</td></tr>';
    }

    this.clearIntervals = clearIntervals;
    
    // Generate a list of options for the bound select element.
    
    function computeBoundSelect ( )
    {
	var bound_list = appstate.intervals.bounds;
	
	// We start with an option for no bound at all.
	
	// var option_string = '<option value="">--</option>' + "\n";

	var option_string = '';
	
	// Add one option for each bound in this timescale.

	if ( bound_list && bound_list.length )
	{
	    for ( var i=0; i<bound_list.length; i++ )
	    {
		var option = '<option value="' + bound_list[i].oid + '">' +	bound_list[i].age + ' (';
		
		// If the bound has an interval name, use that. If it is the top bound for the entire
		// timescale, indicate that. Otherwise, use the bound id.
		
		if ( bound_list[i].inm )
		    option += bound_list[i].inm;
		
		else if ( bound_list[i].oid == appstate.intervals.top_bound_id )
		    option += 'top of timescale';
		
		else
		    option += bound_list[i].oid;
		
		option += ")</option>\n";
		option_string += option;
	    }
	}
	
	appstate.intervals.bound_options = option_string;
    }
    
    // Generate the content for the 'timescale intervals' display pane. This will be run every
    // time the interval list changes, for example if new intervals are added or the intervals are
    // rearranged.
    
    function generateIntervalDisplayContent ( )
    {
	var column_max = appstate.intervals.column_max;
	var interval_list = appstate.intervals.intervals;
	var max_age, min_age;
	
	// We set a target for the average interval height in pixels, so that each timescale will
	// be displayed in a reasonable height. We want the height of each interval to be roughly
	// proportional to its time span, but we also set a minimum pixel height to ensure that
	// there will be space for the interval names and also that the text for each interval
	// bound does not overlap with the next.
	
	const target_height = 50;
	const min_height = 20;
	
	// The basic purpose of this function is to generate one table row that displays the
	// entirety of the timescale in multiple columns.  If there is at least one interval to
	// display, then we proceed to iterate through the interval list.
	
	var content = "<tr>\n";
	
	if ( interval_list.length )
	{
	    // Start by computing the minimum and maximum age from all of the intervals defined in
	    // this timescale. We compute this directly from the intervals (which are computed
	    // from the bounds) rather than relying on the min_age and max_age attributes of the
	    // timescale. This is probably overkill, but will make sure that the display is
	    // calibrated to the set of intervals actually being displayed.
	    
	    min_age = interval_list[0].top_age;
	    max_age = interval_list[0].bottom_age;
	    
	    for ( var i=1; i < interval_list.length; i++ )
	    {
		var top_age = Number(interval_list[i].top_age);
		var bottom_age = Number(interval_list[i].bottom_age);
		
		if ( Number(top_age) < Number(min_age) ) min_age = top_age;
		if ( Number(bottom_age) > Number(max_age) ) max_age = bottom_age;
	    }
	    
	    // Then determine the height in pixels at which each boundary age in this timescale should be displayed.
	    // Compute a scale factor to convert interval age ranges to pixels.
	    
	    var bound_list = appstate.intervals.bounds;
	    var age_list = appstate.intervals.ages;
	    var age_to_pixels = { };
	    var cumulative_height = 0;
	    
	    var scale = bound_list.length * target_height / ( max_age - min_age );
	    
	    for ( var i=0; i < age_list.length; i++ )
	    {
		var this_age = age_list[i];
		var last_age = i > 0 ? age_list[i-1] : min_age;
		
		var interval_height = Math.max(Math.round((this_age - last_age) * scale), min_height);
		
		cumulative_height += interval_height;
		
		age_to_pixels[this_age] = cumulative_height;
	    }
	    
	    // Now, for each interval column previously computed by computeIntervalStack(), we
	    // create a table cell that itself contains a table displaying the column of intervals.
	    
	    for ( var i=0; i < column_max.length; i++ )
	    {
		content += '<td class="tsed_column_container"><table class="tsed_column">' + "\n";
		
		// var this_col = columns[i];
		var last_age = min_age;
		
		// We start with a gap at the top, which will provide space for the
		// top-of-timescale age label.

		// for ( var j=0; j < interval_list.length; j++ )
		// {
		//     if ( interval_list[j].column == i ) break;
		// }
		
		
		// Then add one single-cell table row for each interval or gap in the column,
		// starting with a gap at the top which will provide space for the
		// top-of-timescale age label.

		var found_top = 0;
		
		for ( var j=0; j < interval_list.length; j++ )
		{
		    if ( interval_list[j].column != i ) continue;

		    if ( ! found_top )
		    {
			content += intervalRow('tsint_' + interval_list[j].top_id, age_to_pixels[min_age], 'gap', '');
			found_top = 1;
		    }
		    
		    var top_age = interval_list[j].top_age;
		    var bottom_age = interval_list[j].bottom_age;
		    var top_id = interval_list[j].top_id;
		    var bottom_id = interval_list[j].bottom_id;
		    
		    // If the top age of the current interval is not equal to the bottom age of
		    // the previous one, we add a gap row.
		    
		    if ( Number(top_age) > Number(last_age) )
		    {
			var gap_height = age_to_pixels[top_age] - age_to_pixels[last_age];
			content += intervalRow('tsint_' + top_id, gap_height, 'gap', '');
		    }
		    
		    // Now add the interval row.
		    
		    var interval_height = age_to_pixels[bottom_age] - age_to_pixels[top_age];
		    
		    content += intervalRow('tsint_' + bottom_id, interval_height, 'interval', interval_list[j].name);
		    
		    last_age = bottom_age;
		    
		    // var height_px = Math.round((bottom_age - top_age) * scale);
		    
		    // content += '<tr><td class="tsed_interval" style="height: ' + height_px + 'px; ' +
		    // 	'">' + this_col[j].name;
		    // //'bottom: ' + bottom_px + 'px"><td>' + this_col[j].name;
		    // content += "</td></tr>\n";
		}
		
		// Then close the column.
		
		content += "</table></td>\n";
	    }

	    // Now we go back through the list of boundary ages, and create two more columns. The
	    // first will just display one horizontal mark at each interval boundary, and the
	    // second will display the boundary age and the basis for that age. Clicking on any of
	    // these entries will bring up the boundary editing pane.
	    
	    var ruler_column = '<td class="tsed_column_container"><table class="tsed_ruler_column">' + "\n";
	    var ages_column = '<td class="tsed_column_container"><table class="tsed_ages_column">' + "\n";
	    
	    var bound_lookup = appstate.intervals.bounds_id;
	    
	    // Iterate through each separate age. If multiple boundaries share the same age, the
	    // information describing the one in the leftmost column will be displayed. If the
	    // user clicks on a different interval then the cells corresponding to its upper and
	    // lower boundary ages will be changed to display its boundaries instead.
	    
	    var last_age = min_age;
	    
	    for ( j=0; j < age_list.length; j++ )
	    {
		var this_age = age_list[j];
		
		// The initial segment height is different for the mark and age columns, because
		// the age column must be offset that its text matches the marks.

		var mark_height = age_to_pixels[this_age] - age_to_pixels[last_age];
		var age_height = mark_height;

		if ( j == 0 )
		{
		    mark_height = min_height;
		    age_height = min_height + 3;
		}
		
		var bound_id = appstate.intervals.age_to_bound_id[this_age];
		var bound_record = bound_id ? bound_lookup[bound_id] : { "error": 1 };
		// var age_has_error = 0;
		
		// if ( appstate.intervals.age_multi_bounds[this_age] )
		// {
		//     var multi_list = appstate.intervals.age_multi_bounds[this_age];
		    
		//     for ( var k=0; k<multi_list.length; k++ )
		//     {
		// 	var other_id = multi_list[i];
		// 	if ( other_id && bound_lookup[other_id] && bound_lookup[other_id].err )
		// 	    age_has_error = 1;
		//     }
		// }

		// else if ( bound_record )
		// {
		//     if ( bound_record.err ) age_has_error = 1;
		// }

		// else
		// {
		//     age_has_error = 1;
		// }
		
		ruler_column += boundMarkRow('tsmark_' + bound_id, mark_height);
		ages_column += boundAgeBasisRow('tsbound_' + bound_id, age_height, this_age, bound_record,
						appstate.intervals.age_has_error[this_age]);
		
		last_age = this_age;
	    }

	    // Add rows for any bounds whose ages have been set to empty.

	    for ( j=0; j < bound_list.length; j++ )
	    {
		if ( bound_list[j].age != undefined && bound_list[j].age != "" ) continue;
		
		ruler_column += boundMarkRow('tsmark_' + bound_id, min_height);
		ages_column += boundAgeBasisRow('tsbound_' + bound_id, min_height, "", bound_list[j]);
	    }
	    
	    // Now close out those two columns and then add them to the display panel content.
	    
	    ruler_column += "</table></td>\n";
	    ages_column += "</table></td>\n";
	    
	    content += ruler_column + ages_column;
	}

	// If there are no intervals, create an empty table row.

	else
	{
	    content += "<td></td>";
	}
	
	content += "</tr>";
	
	return content;
    }
    
    // Return the HTML code for one single-cell table row representing either an interval or a gap
    // in one of the display columns for the current timescale.
    
    function intervalRow ( id, height_px, type, name )
    {
	var content = '<tr id="' + id + '" ' +
	    ' style="height: ' + height_px + 'px; max-height: ' +
	    height_px + 'px"><td class="tsed_' + type + '"><div style="height: 10px">' +
	    name + "</div></td></tr>\n";
	return content;
    }

    function intervalRowContent ( record )
    {
	return '<td class="tsed_interval"><div style="height: 10px">' + record.inm + '</div></td>';
    }
    
    // Return the HTML code for one single-cell table row marking one boundary age in the current
    // timescale.
    
    function boundMarkRow ( id, height_px )
    {
	var content = '<tr id="' + id + '" style="height: ' + height_px +
	    'px"><td class="tsed_time_mark"></td></tr>' + "\n";
	return content;
    }
    
    // Return the HTML code for one multi-cell table row displaying a boundary age and the basis
    // for that age.
    
    function boundAgeBasisRow ( id, height_px, age, record, has_error )
    {
	var class_str = has_error ? ' class="tsed_bound_error"' : '';
	
	var content = '<tr id="' + id + '" style="height: ' + height_px + 'px; max-height: ' +
	    height_px + 'px" title="' + record.oid + '"' + class_str + '>';
	
	// var content = '<tr id="' + id + '" onclick="tsapp.selectBounds(\'' + id +
	//     '\')" style="height: ' + height_px + 'px; max-height: ' +
	//     height_px + 'px" title="' + record.oid + '">';
	
	content += boundAgeBasisContent(age, record);

	content += '</tr>';

	return content;
    }

    function boundAgeBasisContent ( age, record )
    {
	var content = '<td class="tsed_age_basis"><div style="height: 10px">';
	
	// The first cell displays the boundary age.
	
	content += age;
	
	if ( record.ger )
	{
	    content += '&nbsp;&plusmn;&nbsp;' + record.ger;
	}

	else
	{
	    content += '&nbsp;&nbsp;';
	}
	
	content +=  '</div></td><td class="tsed_age_basis"><div style="height: 10px">';
	
	// The second cell displays the boundary type and the changed/unchanged indicator.
	
	var spike_img = '/blank.png';
	if ( record.spk || record.btp && record.btp == 'spike' ) spike_img = '/spike.png';
	
	content += '<img class="tsed_indicator" width="20" height="20" src="' +
	    resource_url + spike_img + '">&nbsp';
	
	var changed_img = '/blank.png';
	if ( record.dirty ) changed_img = '/changed.png';
	
	content += '<img class="tsed_indicator" width="20" height="20" src="' +
	    resource_url + changed_img + '">&nbsp;&nbsp;' + "\n";

	if ( record.age == undefined || record.age == "" )
	{
	    content += "<em>to be deleted</em></td><td></td>\n";
	}

	else
	{
	    if ( record.btp == 'absolute' || record.btp == 'spike' )
	    {
		content += '<em>' + record.btp + '</em>';
	    }
	    
	    else if ( record.btp == 'same' )
	    {
		content += '<em>same as</em>';
	    }
	    
	    else if ( record.btp == 'fraction' )
	    {
		content += '<em>modeled as</em>';
	    }
	    
	    content += '</td><td class="tsed_age_basis"><div style="height: 10px">'
	    
	    // The third cell displays the link information if any, plus the fraction for modeled bounds.
	    
	    if ( record.btp == 'same' )
	    {
		content += boundLinkContent(record.bid);
	    }
	    
	    else if ( record.btp == 'fraction' )
	    {
		content += boundLinkContent(record.bid, record.tid);
		content += '&nbsp;:&nbsp;' + record.frc;
	    }
	    
	    content += '&nbsp;';
	    
	    // Close out the row.
	    
	    content += "</div></td>\n";
	}
	
	return content;
    }

    function boundLinkContent ( bound_id, range_id )
    {
	console.log("bound_id = " + bound_id);
	console.log("api_data.bounds_id[bound_id] = " + api_data.bounds_id[bound_id]);
	var name = api_data.bounds_id[bound_id].inm;

	if ( ! name && api_data.bounds_id[bound_id].age == "0" )
	    name = "Present";

	var content = '<span class="tsed_timescale_label">' + name + '</span>';

	if ( range_id && range_id != api_data.bounds_id[bound_id].uid )
	{
	    var top_name = getLowerName(range_id);
	    
	    content += '&nbsp; - &nbsp;<span class="tsed_timescale_label">' + top_name + '</span>';
	}
	
	return content;
    }
    
    function getLowerName ( bound_id )
    {
	if ( api_data.bounds_id[bound_id] )
	{
	    return api_data.bounds_id[bound_id].one_lower || 'unknown';
	}
	
	else return 'cannot find bound';
    }
    
    // INTERVALS ACTIONS

    // This function is called when the "Add intervals" control is activated.
    
    function addIntervalsAction ( )
    {
	if ( ! appstate.current_timescale_id )
	{
	    window.alert("You must create a timescale or select an existing one before adding intervals");
	    return;
	}
	
	else if ( appstate.intervals.dirty )
	{
	    window.confirm("There are unsaved changes in this time scale. Save or revert them before adding new intervals");
	    return;
	}
	
	var modal_elt = myGetElement("add_intervals");
	
	if ( modal_elt )
	{
	    modal_elt.style.display = "block";
	}
    }
    
    this.addIntervalsAction = addIntervalsAction;

    // This function is called when the "Save changes" control is activated.
    
    function saveIntervalsAction ( )
    {
	// Do nothing unless the interval bounds have unsaved changes.
	
	if ( ! appstate.intervals.dirty ) return;
	
	// Check that the list of bounds meets the validity criteria.
	
	if ( validateBoundsList() ) return;
	
	// Now construct a list of update records which will be submitted to the API.
	
	var update_list = [ ];
	
      BOUND:
	for ( var i=0; i < appstate.intervals.bounds.length; i++ )
	{
	    var app_record = appstate.intervals.bounds[i];
	    var db_record = api_data.bounds_id[app_record.oid];
	    var update_record = { _label: 'b' + i };
	    var has_update = 0;
	    
	    update_record.oid = app_record.oid;
	    update_record.btp = app_record.btp;
	    
	    // If the application record has an empty age, then this bound should be deleted. It
	    // already has a bound_id (oid) value, so all that remains is to add the key
	    // '_operation' with the value 'delete'.
	    
	    if ( app_record.age == '' )
	    {
		update_record._operation = 'delete';
		update_list.push(update_record);
		continue BOUND;
	    }

	    // Otherwise, we fill in every field that is different between the new and past
	    // records.
	    
	    if ( app_record.age != db_record.age ) {
		update_record.age = app_record.age;
		has_update = 1;
	    }
	    
	    if ( app_record.ger != db_record.ger ) {
		update_record.ger = app_record.ger
		has_update = 1;
	    }
	    
	    if ( app_record.frc != db_record.frc ) {
		update_record.frc = app_record.frc;
		has_update = 1;
	    }
	    
	    if ( app_record.btp != db_record.btp ) {
		update_record.btp = app_record.btp;
		has_update = 1;
	    }
	    
	    if ( app_record.btp != 'fraction' && db_record.frc != '' && db_record.frc != undefined ) {
		update_record.frc = '';
		has_update = 1;
	    }
	    
	    if ( app_record.bid != db_record.bid ) {
		update_record.bid = app_record.bid;
		has_update = 1;
	    }
	    
	    if ( app_record.tid != db_record.tid ) {
		update_record.tid = app_record.tid;
		has_update = 1;
	    }
	    
	    if ( app_record.uid != db_record.uid ) {
		update_record.uid = app_record.uid;
	    }
	    
	    if ( app_record.cid != db_record.cid ) {
		update_record.cid = app_record.cid;
		has_update = 1;
	    }

	    if ( app_record.inm != db_record.inm ) {
		update_record.inm = app_record.inm;
		has_update = 1;
	    }
	    
	    if ( app_record.col != db_record.col ) {
		update_record.col = app_record.col;
		has_update = 1;
	    }

	    if ( has_update ) update_list.push(update_record);
	}
	
	// Now encode the new record as JSON and send it in the body of an API request.

	var update_json = JSON.stringify(update_list);
	
        $.ajax({
	    url: data_url + 'timescales/addupdate.json?show=desc',
            type: 'PUT',
            data: update_json,
            contentType: 'application/json; charset=utf-8',
            dataType: 'json',
            async: false,
            success: saveIntervalsComplete,
            error: handleAPIError,
	});
	
	// We can stop here when debugging.

	var a = 1;
    }
    
    this.saveIntervalsAction = saveIntervalsAction;
    
    // If the bounds list fails any of the validation criteria, return true.
    
    function validateBoundsList ( )
    {
	var bounds_list = appstate.intervals.bounds;
	var bounds_id = appstate.intervals.bounds_id;

	return;
	
	// Go through the bounds one by one, and check that they make sense. If we find any
	// problems, highlight that bound and display an alert.
	
	// for ( var i=0; i < bounds_list.length; i++ )
	// {
	//     if ( bounds_list[i].invalid )
		
	// }
	
	    // var age = bounds_list[i].age;
	    // var top_id = bounds_list[i].uid;
	    // var base_id = bounds_list[i].bid;
	    // var range_id = bounds_list[i].tid;
	    // var type = bounds_list[i].btp;
	    // var top_age, base_age, range_age;
	    
	    // if ( top_id ) top_age = bounds_id[top_id].age;
	    
	    // if ( age == undefined || age == '' )
	    // {
	    // 	continue;
	    // }
	    
	    // // Otherwise make sure that the age is not less than the age of the bound marked as
	    // // the top of its interval, if there is one.
	    
	    // if ( top_age != undefined && age <= top_age )
	    // {
	    // 	return boundFail(bounds_list[i], "must have an age greater than its next higher bound");
	    // }
	    
	    // // If the bound type is 'same', make sure we have a bound id and that the age matches up.
	    
	    // if ( type == 'same' )
	    // {
	    // 	if ( base_id == undefined )
	    // 	{
	    // 	    return boundFail(bounds_list[i], "has bound type 'same' so must have a base bound");
	    // 	}
		
	    // 	var base_record = appstate.intervals.bounds_id[base_id] || api_data.bounds_id[base_id];
		
	    // 	if ( base_record == undefined )
	    // 	{
	    // 	    return boundFail(bounds_list[i], ": base bound '" + base_id + "' cannot be found");
	    // 	}
		
	    // 	if ( base_record.age != age )
	    // 	{
	    // 	    return boundFail(bounds_list[i], ": age of base bound does not match age of this one");
	    // 	}
	    // }
	    
	    // else if ( type == 'fraction' )
	    // {
	    // 	if ( base_id == undefined )
	    // 	{
	    // 	    return boundFail(bounds_list[i], "has bound type 'same' so must have a base bound");
	    // 	}
		
	    // 	var base_record = appstate.intervals.bounds_id[base_id] || api_data.bounds_id[base_id];
		
	    // 	if ( base_record == undefined )
	    // 	{
	    // 	    return boundFail(bounds_list[i], ": base bound '" + base_id + "' cannot be found");
	    // 	}

	    // 	if ( base_record.age < age )
	    // 	{
	    // 	    return boundFail(bounds_list[i], ": age of base bound must be less than the age of this one");
	    // 	}
		
	    // 	var range_record = appstate.intervals.bounds_id[range_id] || api_data.bounds_id[range_id];
		
	    // 	if ( range_record == undefined )
	    // 	{
	    // 	    return boundFail(bounds_list[i], ": range bound '" + range_id + "' cannot be found");
	    // 	}
		
	    // 	if ( range_record.age > age )
	    // 	{
	    // 	    return boundFail(bounds_list[i], ": age of range bound must be less than the age of this one");
	    // 	}
	    // }
    }

    // If the specified bound record is valid, return undefined. Otherwise, return true to
    // indicate that the record has errors. If 'errors' is defined, it must be an array
    // reference. A list of error messages will be pushed to it. If 'highlight' is defined, it
    // must be an object reference. One or more of the keys 'top', 'age', 'type', 'base', 'range',
    // 'frac' may be given true values to indicate where errors were found.
    
    function validateBound ( bound_record, current_bound_by_id, errors, highlight )
    {
	var age = bound_record.age;
	var top_id = bound_record.uid;
	var base_id = bound_record.bid;
	var range_id = bound_record.tid;
	var type = bound_record.btp;
	var top_age, base_age, range_age;
	
	// Clear the 'invalid' flag for this bound. We will re-establish it if any errors are found.
	
	delete bound_record.invalid;
	
	// If the bound has an empty age, ignore it. Any bound that has an empty age will be
	// deleted when changes are saved to the database.
	
	if ( age == undefined || age == '' )
	{
	    return;
	}
	
	// If the bound is linked to a next-up bound, then make sure the link is valid. If it is,
	// check that the next-up age is actually less than the age of the bound being checked.
	
	if ( top_id )
	{
	    if ( current_bound_by_id[top_id] == undefined )
	    {
		if ( errors ) errors.push("next-up bound '" + top_id + "' was not found");
		if ( highlight ) highlight.top = 1;
		bound_record.invalid = 1;
	    }
	    
	    else
	    {
		top_age = current_bound_by_id[top_id].age;
		
		if ( top_age == undefined || Number(age) <= Number(top_age) )
		{
		    if ( errors ) errors.push("must have an age greater than its next higher bound");
		    if ( highlight ) highlight.top = 1;
		    bound_record.invalid = 1;
		}
	    }
	}

	// If the bound type is 'same', make sure we have a bound id and that the age matches up.

	if ( type == 'same' )
	{
	    if ( base_id == undefined )
	    {
		if ( errors ) errors.push("has bound type 'same', so must have a base bound");
		if ( highlight ) highlight.base = 1;
		bound_record.invalid = 1;
	    }

	    else
	    {
		var base_record = current_bound_by_id[base_id] || api_data.bounds_id[base_id];
		
		if ( base_record == undefined )
		{
		    if ( errors ) errors.push("base bound '" + base_id + "' was not found");
		    if ( highlight ) highlight.base = 1;
		    bound_record.invalid = 1;
		}
		
		else if ( Number(base_record.age) != Number(age) )
		{
		    if ( errors ) errors.push("age of base bound does not match age of this one");
		    if ( highlight ) highlight.base = 1;
		    bound_record.invalid = 1;
		}
	    }
	}
	
	else if ( type == 'fraction' )
	{
	    var base_age, range_age;
	    
	    if ( base_id == undefined )
	    {
		if ( errors ) errors.push("has bound type 'fraction', so must have a base bound");
		if ( highlight ) highlight.base = 1;
		bound_record.invalid = 1;
	    }
	    
	    else
	    {
		var base_record = current_bound_by_id[base_id] || api_data.bounds_id[base_id];
		
		if ( base_record == undefined )
		{
		    if ( errors ) errors.push("base bound '" + base_id + "' was not found");
		    if ( highlight ) highlight.base = 1;
		    bound_record.invalid = 1;
		}
		
		else if ( Number(base_record.age) < Number(age) )
		{
		    if ( errors ) errors.push("age of base bound must be greater than or equal to age of this one");
		    if ( highlight ) highlight.base = 1;
		    bound_record.invalid = 1;
		}

		else if ( base_record.age != undefined && base_record.age != '' )
		{
		    base_age = base_record.age;
		}
	    }

	    if ( range_id == undefined )
	    {
		if ( errors ) errors.push("has bound type 'fraction', so must have a range bound");
		if ( highlight ) highlight.range = 1;
		bound_record.invalid = 1;
	    }

	    else
	    {
		var range_record = current_bound_by_id[range_id] || api_data.bounds_id[range_id];
		
		if ( range_record == undefined )
		{
		    if ( errors ) errors.push("range bound '" + range_id + "' was not found");
		    if ( highlight ) highlight.range = 1;
		    bound_record.invalid = 1;
		}
		
		else if ( Number(range_record.age) > Number(age) )
		{
		    if ( errors ) errors.push("age of range bound must be less than or equal to age of this one");
		    if ( highlight ) highlight.range = 1;
		    bound_record.invalid = 1;
		}
		
		else if ( range_record.age != undefined && range_record.age != '' )
		{
		    range_age = range_record.age;
		}
	    }
	    
	    if ( bound_record.frc == undefined || bound_record.frc == '' )
	    {
		if ( errors ) errors.push("bound type is 'fraction', but fraction is empty");
		if ( highlight ) highlight.frac = 1;
		bound_record.invalid = 1;
	    }
	    
	    else if ( ! ( Number(bound_record.frc) >= 0 && Number(bound_record.frc) <= 1 ) )
	    {
		if ( errors ) errors.push("invalid fraction, must be between zero and one");
		if ( highlight ) highlight.frac = 1;
		bound_record.invalid = 1;
	    }

	    else if ( base_age != undefined && range_age != undefined )
	    {
		var calculated_age = base_age - bound_record.frc * ( base_age - range_age );

		if ( Number.isNaN(calculated_age) )
		{
		    if ( errors ) errors.push("age calculated from fraction gives NaN");
		    if ( highlight ) highlight.frac = 1;
		    bound_record.invalid = 1;
		}

		else if ( Math.abs(age - calculated_age) > 0.1 )
		{
		    if ( errors ) errors.push("age calculated from fraction does not match bound age");
		    if ( highlight ) highlight.frac = 1;
		    bound_record.invalid = 1;
		}
	    }
	}

	else if ( type != 'absolute' && type != 'spike' )
	{
	    if ( errors ) errors.push("invalid bound type '" + type + "'");
	    if ( highlight ) highlight.type = 1;
	    bound_record.invalid = 1;
	}
	
	return bound_record.invalid;
    }
    
    function boundFail ( bound_record, message )
    {
	var text = 'Bound ' + bound_record.oid;

	if ( bound_record.age != undefined && bound_record.age != '' )
	    text += ' (' + bound_record.age + ')';

	text += ' ' + message;

	window.alert(text);
	return 1;
    }
    
    // Respond to successful completion of an interval bound update.
    
    function saveIntervalsComplete ( response )
    {
	var timescale_id = appstate.current_timescale_id;
	
    	if ( response && response.records && response.records.length )
	{
	    cacheBoundData(response.records, function ( ) {
		loadIntervals(timescale_id);
		displayIntervals();
		clearBoundEditor();
		$(document.intervals_form.save).removeClass('tsed_active_save');
	    });
	}
	
	else
	{
	    window.alert("WARNING: all interval bounds in this timescale have been deleted.");
	    api_data.timescale_bound_list[timescale_id] = [ ];
	    loadIntervals(timescale_id);
	    displayIntervals();
	    clearBoundEditor();
	    $(document.intervals_form.save).removeClass('tsed_active_save');
	}
    }
    
    // This function is called when the 'Revert' control is activated.
    
    function revertIntervalsAction ( )
    {
	if ( appstate.intervals.dirty )
	{
	    var answer = window.confirm("There are unsaved changes to the intervals of timescale '" +
					appstate.current_timescale_name + "'. Discard them?");
	    
	    if ( ! answer ) return 1;
	}
	
	loadIntervals(appstate.current_timescale_id);
	displayIntervals();
	clearBoundEditor();
	$(document.intervals_form.save).removeClass('tsed_active_save');
    }
    
    this.revertIntervalsAction = revertIntervalsAction;

    // This function is called when the 'Redisplay' control is activated.
    
    function redisplayIntervalsAction ( )
    {
	displayIntervals();
    }
    
    this.redisplayIntervalsAction = redisplayIntervalsAction;
    
    // ADD INTERVALS MODAL
    
    // This function is called when the "Save" control on the Add Intervals modal dialog box is
    // activated.
    
    function addIntervalsSaveAction ( )
    {
	var timescale_id = appstate.current_timescale_id;

	// First go through the existing timescale bounds and map ages to bound ids. This will
	// allow us to match the ages typed in on this form to existing bounds.
	
	var age_to_id = { };
	
	if ( appstate.intervals.bounds )
	{
	    for ( var i=0; i < appstate.intervals.bounds.length; i++ )
	    {
		var bound_record = appstate.intervals.bounds[i];
		if ( bound_record.age != undefined )
		    age_to_id[bound_record.age] = age_to_id[bound_record.age] || bound_record.oid;
	    }
	}
	
	// Remove any error highlighting.
	
	$("#add_intervals_box input").each(function () {
	    $(this).removeClass('tsed_error');
	});
	
	// Then go through the form fields and create a list of bound records. Try to match each
	// bound to an upper bound whenever possible.
	
	var new_bounds = [ ];
	var last_age, last_bound_id;
	var start_index = 0;
	var last_index = 0;
	var error = 0;
	
	// If the top bound is one from this timescale, then that will be the top_id (uid) of the
	// first added interval. This allows us to link a new set of intervals to the bottom of
	// the existing timescale, or to provide an alternate sequence of intervals covering part
	// or all of the existing timescale.
	
	var top_bound = getElementValue("ia_select_0");
	
	if ( appstate.intervals.bounds_id && appstate.intervals.bounds_id[top_bound] )
	{
	    last_bound_id = top_bound;
	    last_age = appstate.intervals.bounds_id[top_bound].age;
	    last_index = 0;
	    start_index = 1;
	}
	
	// Otherwise, every record will correspond to a bound.
	
	for ( var i=start_index; i<=10; i++ )
	{
	    var bound_id = getElementValue('ia_select_' + i);
	    var bound_age = getElementValue('ia_age_' + i);
	    var bound_type = getElementValue('ia_type_' + i);
	    var bound_name = getElementValue('ia_name_' + i);
	    
	    var new_record = { sid: timescale_id, age: bound_age, inm: bound_name, _label: 'a' + i };
	    
	    if ( last_bound_id ) new_record.uid = last_bound_id;
	    
	    if ( bound_age == '' )
	    {
		break;
	    }
	    
	    else if ( ! valid_age.test(bound_age) )
	    {
		$('#ia_age_' + i).addClass('tsed_error');
		error = 1;
	    }

	    else if ( last_age != undefined && Number(bound_age) <= Number(last_age) )
	    {
		$('#ia_age_' + i).addClass('tsed_error');
		error = 1;
	    }

	    if ( bound_type != 'absolute' && bound_id != 'absolute' && ! api_data.bounds_id[bound_id] )
	    {
		$('#ia_select_' + i).addClass('tsed_error');
		error = 1;
	    }
	    
	    if ( bound_type == 'absolute' || bound_id == 'absolute' )
	    {
		new_record.btp = 'absolute';
	    }
	    
	    else if ( bound_type == 'same' )
	    {
		new_record.btp = 'same';
		
		if ( api_data.bounds_id[bound_id] )
		{
		    new_record.bid = bound_id;
		}
	    }
	    
	    else if ( bound_type == 'fraction' )
	    {
		new_record.btp = 'fraction';
		new_record.frc = getElementValue("ia_frac_" + i);

		if ( ! valid_frac.test(new_record.frc) )
		{
		    $('#ia_frac_' + i).addClass('tsed_error');
		    error = 1;
		}
		
		if ( api_data.bounds_id[bound_id] )
		{
		    new_record.bid = api_data.bounds_id[bound_id].oid;
		    new_record.tid = api_data.bounds_id[bound_id].uid;
		}
	    }

	    else
	    {
		$('#ia_select_' + i).addClass('tsed_error');
		error = 1;
	    }
	    
	    new_bounds.push(new_record);
	    
	    last_bound_id = '@a' + i;
	    last_age = bound_age;
	    last_index = i;
	}

	// Now make sure there aren't any gaps in the bound list.

	for ( i=last_index+1; i <= 10; i++ )
	{
	    var bound_age = getElementValue('ia_age_' + i);
	    if ( bound_age != '' )
	    {
		$('#ia_age_' + i).addClass('tsed_error');
		error = 1;
	    }
	}
	
	// // Start by matching the top bound. If we can't match it, then create a new bound.  This
	// // will either be the top bound of the entire timescale, or a floating bound somewhere in
	// // the middle.
	
	// var top_age = getElementValue("ia_age_0");
	// var last_age, last_bound_id;
	
	// if ( top_age == "" || ! valid_age.test(top_age) )
	// {
	//     $("#ia_age_0").addClass('tsed_error');
	//     error = 1;
	// }
	
	// else if ( age_to_id[top_age] )
	// {
	//     last_bound_id = age_to_id[top_age];
	//     last_age = top_age;
	// }
	
	// else
	// {
	//     new_bounds.push({ sid: timescale_id, btp: 'absolute',
	// 		      age: top_age, _label: 'a0' });
	//     last_bound_id = '@a0';
	//     last_age = top_age;
	// }
	
	// for ( var i=1; i <= 10; i++ )
	// {
	//     var interval_name = getElementValue("ia_name_" + i);
	//     var bound_age = getElementValue("ia_age_" + i);
	//     var record_label = 'a' + i;
	    
	//     if ( bound_age == "" && interval_name != "" )
	//     {
	// 	$("#ia_age_" + i).addClass('tsed_error');
	// 	error = 1;
	//     }

	//     else if ( bound_age == "" ) break;

	//     else if ( ! valid_age.test(bound_age) || bound_age <= last_age )
	//     {
	// 	$("#ia_age_" + i).addClass('tsed_error');
	// 	error = 1;
	//     }
	    
	//     new_bounds.push({ sid: timescale_id, btp: 'absolute', age: bound_age,
	// 		      inm: interval_name, uid: last_bound_id, _label: record_label });
	    
	//     last_bound_id = '@' + record_label;
	//     last_age = bound_age;
	// }

	if ( error ) return;

	var insert_json = JSON.stringify(new_bounds);
	
	$.ajax({
	    url: data_url + 'timescales/addupdate.json',
            type: 'PUT',
            data: insert_json,
            contentType: 'application/json; charset=utf-8',
            dataType: 'json',
            async: false,
            success: addIntervalsSaveComplete,
            error: handleAPIError,
	});
	
	// We can stop here when debugging.

	var a = 1;

    }
    
    this.addIntervalsSaveAction = addIntervalsSaveAction;
    
    function addIntervalsSaveComplete ( response )
    {
	var timescale_id = appstate.current_timescale_id;
	
    	if ( response && response.records && response.records.length )
	{
	    cacheBoundData(response.records, function ( ) {
		modalClose('add_intervals');
		addIntervalsClearAction();
		clearBoundEditor();
		loadIntervals(timescale_id);
		displayIntervals();
	    });
	}
	
	else
	{
	    modalClose('add_intervals');
	    window.alert("WARNING: all interval bounds in this timescale have been deleted.");
	    api_data.timescale_bound_list[timescale_id] = [ ];
	    addIntervalsClearAction();
	    loadIntervals(timescale_id);
	    displayIntervals();
	}	
    }
    
    function addIntervalsCheck ( which, i )
    {
	// var age = getElementValue("ia_age_" + i);
	// var fraction = getElementValue("ia_frac_" + i);
	
	if ( which == 'age' )
	{
	    var type = getElementValue("ia_type_" + i);
	    
	    if ( type == 'fraction' )
	    {
		addIntervalsCheckAge( which, i );
	    }
	    
	    else
	    {
		setElementValue("ia_select_" + i, 'absolute');
		setElementValue("ia_type_" + i, 'absolute');
		setElementValue("ia_frac_" + i, '');
		setElementDisabled("ia_frac_" + i, 1);
	    }
	}
	
	else if ( which == 'frac' )
	{
	    addIntervalsCheckAge( which, i );
	}
	
	else if ( which == 'link' )
	{
	    var adjust_link = getElementValue("ia_select_" + i);
	    var current_sid = appstate.add_intervals.current_sid || 'tsc:1';
	    
	    if ( adjust_link == 'absolute' )
	    {
		setElementValue("ia_type_" + i, 'absolute');
		setElementValue("ia_frac_" + i, '');
		setElementDisabled("ia_frac_" + i, 1);
	    }
	    
	    else if ( adjust_link == 'same' )
	    {
		setElementValue("ia_type_" + i, 'same');
		setElementValue("ia_frac_" + i, '');
		setElementDisabled("ia_frac_" + i, 1);
		openBoundSelectorForAdd('base', i, current_sid);
	    }
	    
	    else if ( adjust_link == 'fraction' )
	    {
		setElementValue("ia_type_" + i, 'fraction');
		setElementDisabled("ia_frac_" + i, 0);
		openBoundSelectorForAdd('interval', i, current_sid);
	    }
	    
	    else if ( appstate.intervals.bounds_id && appstate.intervals.bounds_id[adjust_link] )
	    {
		var selected_age = appstate.intervals.bounds_id[adjust_link].age;
		setElementValue("ia_age_" + i, selected_age);
		setElementValue("ia_type_" + i, 'same');
		setElementValue("ia_frac_" + i, '');
		setElementDisabled("ia_frac_" + i, 1);
	    }
	}
    }

    function addIntervalsCheckAge ( which, i )
    {
	var selected_id = getElementValue("ia_select_" + i);
	var bound_record = api_data.bounds_id[selected_id];
	
	if ( ! bound_record )
	{
	    window.alert("Could not find a bound record for '" + selected_id + "'");
	    return;
	}
	
	var base_age = bound_record.age;
	var range_age = api_data.bounds_id[bound_record.uid].age;
	
	if ( which == 'age' )
	{
	    var new_age = getElementValue("ia_age_" + i);
	    var new_fraction = (base_age - new_age) / (base_age - range_age);
	    new_fraction = Math.round(new_fraction * 100000) / 100000;

	    setElementValue("ia_frac_" + i, new_fraction);
	}

	else if ( which == 'frac' )
	{
	    var new_fraction = getElementValue("ia_frac_" + i);
	    var new_age = base_age - (base_age - range_age) * new_fraction;
	    new_age = Math.round(new_age * 100) / 100;

	    setElementValue("ia_age_" + i, new_age);
	}
    }
    
    function completeBoundAddSelector ( link_type, i, link_id )
    {
	var link_record = api_data.bounds_id[link_id];

	if ( ! link_record )
	{
	    winoow.alert("Could not find record for bound '" + link_id + "'");
	    return;
	}
	
	var adj = link_type == 'base' ? 'same as ' : 'modeled as ';
	
	var new_menu = '<option value="' + link_record.oid + '" selected>' + adj + link_record.inm + "</option>\n" +
	    '<option value="absolute">absolute</option>' + "\n" +
	    '<option value="same">same as...</option>' + "\n" +
	    '<option value="fraction">modeled as...</option>' + "\n" +
	    appstate.intervals.bound_options;
	
	setInnerHTML('ia_select_' + i, new_menu);
	
	if ( link_type == 'base' )
	{
	    setElementValue('ia_age_' + i, link_record.age);
	    setElementValue('ia_type_' + i, 'same');
	    setElementValue('ia_frac_' + i, '');
	    setElementDisabled('ia_frac_' + i, 1);
	    var next = i + 1;
	    $('ia_name_' + next).focus();
	}
	
	else if ( link_type == 'interval' )
	{
	    setElementValue('ia_type_' + i, 'fraction');
	    var frac_elt = myGetElement('ia_frac_' + i);
	    if ( frac_elt )
	    {
		frac_elt.value = '';
		frac_elt.disabled = 0;
		frac_elt.focus();
	    }
	}
	
	else
	{
	    window.alert("ERROR: completeBoundAddSelector was not given a link type");
	}

    }
    
    this.addIntervalsCheck = addIntervalsCheck;
    
    function addIntervalsClearAction ( )
    {
	setElementValue("ia_age_0", '');
	
	for ( var i=1; i <= 10; i++ )
	{
	    setElementValue("ia_age_" + i, '');
	    setElementValue("ia_name_" + i, '');
	    setElementValue("ia_frac_" + i, '');
	    setElementValue("ia_select_" + i, 'absolute');
	}
    }

    this.addIntervalsClearAction = addIntervalsClearAction;
    
    // INTERVALS INTERACTIVITY

    // Given the id of a table row in the interval panel, select that row and de-select the
    // others. The row can be either an interval row or a boundary row.
    
    function boundClick ( e )
    {
	if ( e.currentTarget.id ) selectBounds( e.currentTarget.id );
    }

    this.boundClick = boundClick;
    
    // Select the bounds associated with the specified table row, which can either be an interval
    // row or a bound row.
    
    function selectBounds ( row_id )
    {
	// Select the indicated row and de-select all others.
	
	$("#intervals_box tr").each(function () {
	    if ( this.id == row_id ) $(this).addClass("tsed_selected");
	    else $(this).removeClass("tsed_selected");
	});
	
	// If the argument is empty, then we are done.
	
	if ( row_id == undefined || row_id == "" ) return;
	
	// If the user clicked on an interval row, then check to make sure it isn't a gap. If it
	// is, then de-select it. Otherwise, select both the top and bottom boundary.
	
	if ( row_id.substr(0, 6) == 'tsint_' )
	{
	    var bottom_id = row_id.substr(6);
	    var int_record = appstate.intervals.intervals_id[bottom_id];
	    var bounds_record = appstate.intervals.bounds_id[bottom_id];
	    
	    if ( int_record )
	    {
		// Determine the bounds that are currently displayed for the top and bottom ages
		// of this interval. If there are overlapping intervals in this timescale, these
		// might not be the ones corresponding to this particular interval.
		
		var current_bottom_id = appstate.intervals.age_to_bound_id[int_record.bottom_age];
		var current_top_id = appstate.intervals.age_to_bound_id[int_record.top_age];

		// If the bottom bound displayed for the bottom age is not correct for this
		// interval, then update it to reflect the bottom bound of this interval.
		
		if ( current_bottom_id != bottom_id )
		{
		    appstate.intervals.age_to_bound_id[int_record.bottom_age] = bottom_id;
		    selectUpdateElement('tsbound_' + current_bottom_id, 'tsbound_' + bottom_id,
					bounds_record);
		}
		
		// Otherwise, just select the existing bound.
		
		else
		{
		    selectAddElement('tsbound_' + current_bottom_id);
		}

		// If the interval has a top bound, then select that bound as well. If the top
		// bound for this interval is different than the top bound currently displayed for
		// the top age, then update it to reflect the top bound of this interval.
		
		if ( int_record.top_id )
		{
		    if ( current_top_id != int_record.top_id )
		    {
			appstate.intervals.age_to_bound_id[int_record.top_age] = int_record.top_id;
			selectUpdateElement('tsbound_' + current_top_id, 'tsbound_' + int_record.top_id,
					    appstate.intervals.bounds_id[int_record.top_id]);
			
		    }

		    // If the proper bound is already displayed for the top age, then just select it.
		    
		    else
		    {
			selectAddElement('tsbound_' + current_top_id);
		    }
		}

		// If there is no top bound for this interval, then the user clicked on a gap. So
		// deselect the gap row and leave the bottom bound selected.
		
		else
		{
		    $("#intervals_box tr").each(function () {
			if ( this.id == row_id ) $(this).removeClass("tsed_selected");
		    });
		}
		
		// Now fill in the bound editor with the lower bound of the interval.
		
		fillBoundEditor(bottom_id);
	    }
	    
	    // If there is no interval record but there is a bound record, select that and
	    // deselect the interval row.
	    
	    else if ( bounds_record )
	    {
		var current_bottom_id = appstate.intervals.age_to_bound_id[bounds_record.age];
		
		// If the bottom bound displayed for the bottom age is not correct for this
		// interval, then update it to reflect the bottom bound of this interval.
		
		if ( current_bottom_id != bottom_id )
		{
		    appstate.intervals.age_to_bound_id[bounds_record.age] = bottom_id;
		    selectUpdateElement('tsbound_' + current_bottom_id, 'tsbound_' + bottom_id,
					bounds_record);
		}

		// Otherwise, just select the bounds row and deselect the interval row.
		
		else
		{
		    selectAddElement('tsbound_' + current_bottom_id);
		    
		    $("#intervals_box tr").each(function () {
			if ( this.id == row_id ) $(this).removeClass("tsed_selected");
		    });
		}

		// Now fill in the bound editor with the lower bound of the interval.
		
		fillBoundEditor(bottom_id);
	    }
	    
	    // If there is no record, then clear the selection entirely.
	    
	    else
	    {
		selectClear();
		clearBoundEditor();
	    }
	}
	
	// If the user clicked on a bound row, then select it plus all intervals for which it is
	// either a top or bottom bound.
	
	else if ( row_id.substr(0, 8) == 'tsbound_' )
	{
	    var bound_id = row_id.substr(8);
	    
	    selectAddElement('tsint_' + bound_id);
	    
	    if ( appstate.intervals.bounds_id[bound_id] )
	    {
		var top_id = appstate.intervals.bounds_id[bound_id].uid;
		
		if ( ! top_id ) selectRemoveElement('tsint_' + bound_id);
	    }
	    
	    // Now select any intervals that have this bound as their top.
	    
	    for ( var i=0; i < appstate.intervals.intervals.length; i++ )
	    {
		if ( appstate.intervals.intervals[i].top_id == bound_id )
		    selectAddElement('tsint_' + appstate.intervals.intervals[i].bottom_id);
	    }

	    // Now fill in the bound editor.

	    fillBoundEditor(bound_id);
	}
	
	var a = 1;	// we can stop here when debugging
    }
    
    this.selectBounds = selectBounds;

    function selectClear ( )
    {
	$("#intervals_box tr").each(function () {
	    $(this).removeClass("tsed_selected");
	});
    }
    
    function selectAddElement ( row_id )
    {
	var elt = myGetElement(row_id);
	if ( elt ) $(elt).addClass('tsed_selected');
    }

    function selectUpdateElement ( row_id, new_row_id, bound_record )
    {
	var elt = myGetElement(row_id);
	var content = boundAgeBasisContent(bound_record.age, bound_record);
	
	if ( elt )
	{
	    $(elt).addClass('tsed_selected');
	    
	    if ( content )
	    {
		elt.innerHTML = content;
		elt.title = bound_record.oid;
	    }
	    
	    if ( new_row_id )
		elt.id = new_row_id;
	}
    }
    
    function selectRemoveElement ( row_id )
    {
	var elt = myGetElement(row_id);
	if ( elt ) $(elt).removeClass('tsed_selected');
    }

    function updateOtherPanes ( )
    {
	var top_bound_menu = '<option value="">--</option>' + "\n" +
	    appstate.intervals.bound_options;
	var new_ints_menu = '<option value="absolute">absolute age</option>' + "\n" +
	    '<option value="same">same as...</option>' + "\n" +
	    '<option value="fraction">modeled as...</option>' + "\n" +
	    appstate.intervals.bound_options;
	
	setInnerHTML("be_top_bound", top_bound_menu);
	setInnerHTML("ia_select_0", new_ints_menu);
	setInnerHTML("ia_select_1", new_ints_menu);
	setInnerHTML("ia_select_2", new_ints_menu);
	setInnerHTML("ia_select_3", new_ints_menu);
	setInnerHTML("ia_select_4", new_ints_menu);
	setInnerHTML("ia_select_5", new_ints_menu);
	setInnerHTML("ia_select_6", new_ints_menu);
	setInnerHTML("ia_select_7", new_ints_menu);
	setInnerHTML("ia_select_8", new_ints_menu);
	setInnerHTML("ia_select_9", new_ints_menu);
	setInnerHTML("ia_select_10", new_ints_menu);
    }
    
    function fillBoundEditor ( bound_id )
    {
	appstate.intervals.current_bound_id = bound_id;
	
	var bound_record = appstate.intervals.bounds_id[bound_id];
	
	// If the bound record cannot be found for some reason, display a message and clear the
	// form.
	
	if ( ! bound_record )
	{
	    // msg.style.display = 'block';
	    // msg.textContent = "Bound '" + bound_id + "' was not found";
	    clearBoundEditor();
	    displayBoundError("Bound '" + bound_id + "' was not found");
	    return;
	}
	
	// Otherwise hide the message box.
	
	else
	{
	    setElementContent("be_error_msg", '');
	}
	
	// Remove any error highlighting.

	$("#be_age").removeClass('tsed_error');
	$("#be_bound_link").removeClass('tsed_error');
	$("#be_fraction").removeClass('tsed_error');
	$("#be_intname").removeClass('tsed_error');
	
	// Then fill in the form using the bound record. First the bound identifier. If there is
	// more than one for this age, make it a drop-down menu.

	if ( bound_record.age != undefined && appstate.intervals.age_multi_bounds[bound_record.age] )
	{
	    var multi_list = appstate.intervals.age_multi_bounds[bound_record.age];
	    var content = '<select id="be_multi" onchange="tsapp.checkBoundEditor(\'multi\')">';
	    
	    for ( var i=0; i < multi_list.length; i++ )
	    {
		var selected = multi_list[i] == bound_record.oid ? ' selected' : '';
		content += '<option value="' + multi_list[i] + '"' + selected + '>' + multi_list[i] + '</option>';
	    }

	    content += '</select>';

	    setElementContent("be_bound_id", "");
	    setInnerHTML("be_bound_id", content);
	}

	else
	{
	    setInnerHTML("be_bound_id", "");
	    setElementContent("be_bound_id", bound_record.oid);
	}
	
	// Then the upper interval.
	
	setElementValue('be_top_bound', bound_record.uid);
	
	// Then the interval name.

	if ( bound_record.inm != undefined && bound_record.inm != '' )
	    setElementValue('be_intname', bound_record.inm);
	else
	    setElementValue('be_intname', 'none');

	// Then the lower name(s).

	var lower = '';
	
	for ( var i=0; i < appstate.intervals.bounds.length; i++ )
	{
	    var record = appstate.intervals.bounds[i];

	    if ( record.uid && record.uid == bound_id && record.inm && record.inm != '' )
	    {
		if ( lower != '' ) lower += ' / ';
		lower += record.inm;
	    }
	}

	if ( lower == '' ) lower = 'none';
	
	setElementValue('be_lower', lower);
	
	// Then the age and age error.
	
	if ( bound_record.age != undefined && bound_record.age != '' )
	    setElementValue('be_age', bound_record.age);
	else
	    setElementValue('be_age', '');

	if ( bound_record.ger != undefined && bound_record.ger != '' )
	    setElementValue('be_age_err', bound_record.ger);
	else
	    setElementValue('be_age_err', '');
	
	// Spike or no spike.

	var spike_img = '/blank.png';
	if ( bound_record.spk || bound_record.btp && bound_record.btp == 'spike' )
	    spike_img = '/spike.png';
	
	myGetElement("be_spike").src = resource_url + spike_img;
	
	// Then the bound type and link(s).
	
	setElementValue('be_bound_type', bound_record.btp);
	setBoundLinkMenu(bound_record);
	
	// Then adjust the fraction field.
	
	if ( bound_record.btp == 'fraction' )
	{
	    setElementValue("be_fraction", bound_record.frc);
	    setElementDisabled("be_fraction", 0);
	}
	
	else
	{
	    setElementValue("be_fraction", '');
	    setElementDisabled("be_fraction", 1);
	}
    }
    
    this.fillBoundEditor = fillBoundEditor;
    
    function setBoundLinkMenu ( bound_record, new_type, new_base, new_range )
    {
	var link_menu = '<option value="">--</option>' + "\n";
	var btp = new_type || bound_record.btp;
	var bid = new_base || bound_record.bid;
	var tid = new_range || bound_record.tid;
	
	if ( btp == 'same' )
	{
	    if ( bid && api_data.bounds_id[bid] )
	    {
		var base_name = api_data.bounds_id[bid].inm;
		link_menu = '<option value="unchanged">' + base_name + '</option>' + "\n";
		link_menu += '<option value="base">choose a different bound...</option>' + "\n";
	    }

	    else if ( bid )
	    {
		link_menu = '<option value="unchanged">ERROR: ' + bid + ' not found</option>' + "\n";
		link_menu += '<option value="base">choose a different bound...</option' + "\n";		
	    }

	    else
	    {
		link_menu += '<option value="base">choose a bound...</option>' + "\n";
	    }
	}
	
	else if ( btp == 'fraction' )
	{
	    if ( bid && api_data.bounds_id[bid] )
	    {
		var base_name = api_data.bounds_id[bid].inm;
		
		if ( tid && tid == api_data.bounds_id[bid].uid )
		{
		    link_menu = '<option value="unchanged">' + base_name + '</option>' + "\n";
		    link_menu += '<option value="interval">choose a different interval...</option>' + "\n";
		    link_menu += '<option value="top">choose a different top age...</option>' + "\n";
		}
		
		else if ( tid && api_data.bounds_id[tid])
		{
		    var range_name = getLowerName(tid);
		    link_menu = '<option value="unchanged">' + base_name + ' - ' +
			range_name +'</option>' + "\n";
		    link_menu += '<option value="interval">choose a different interval...</option>' + "\n";
		    link_menu += '<option value="top">choose a different top age...</option>' + "\n";
		}

		else if ( tid )
		{
		    link_menu = '<option value="unchanged">' + base_name + ' - ERROR: ' + tid +
			' not found</option>' + "\n";
		    link_menu += '<option value="interval">choose a different interval...</option>' + "\n";
		    link_menu += '<option value="top">choose a different top age...</option>' + "\n";
		}

		else
		{
		    link_menu += '<option value="interval">choose an interval...</option>' + "\n";
		}
	    }

	    else if ( bid )
	    {
		link_menu = '<option value="unchanged">ERROR: ' + bid + ' not found</option>' + "\n";
		link_menu += '<option value="interval">choose a different interval...</option' + "\n";		
	    }
	    
	    else
	    {
		link_menu += '<option value="interval">choose an interval...</option>' + "\n";
	    }
	}
	
	setInnerHTML("be_bound_link", link_menu);
    }
    
    // function fillBoundEditorLinks ( bound_record )
    // {
    // 	var base_elt = myGetElement("be_base_bound");
    // 	var range_elt = myGetElement("be_range_bound");
    // 	var frac_elt = myGetElement("be_fraction");
	
    // 	if ( ! bound_record.btp || bound_record.btp != 'same' && bound_record.btp != 'fraction' )
    // 	{
    // 	    if ( base_elt ) base_elt.textContent = '';
    // 	    if ( range_elt ) range_elt.textContent = '';
    // 	    if ( frac_elt ) frac_elt.disabled = true;
    // 	    return;
    // 	}
	
    // 	var base_id = bound_record.bid;
    // 	var range_id = bound_record.rid;
	
    // 	var base_record, range_record;

    // 	if ( base_id ) base_record = api_data.bounds_id[base_id];
    // 	if ( range_id ) range_record = api_data.bounds_id[range_id];
	
    // 	var base_name = 'click to select';
	
    // 	if ( base_record )
    // 	{
    // 	    if ( base_record.inm && base_record.inm != '' )
    // 		name = base_record.inm;
	    
    // 	    else
    // 	    {
    // 		if ( base_record.age == 0 ) name = 'Present';
    // 		else name = base_record.age + ' (' + base_id + ')';
    // 	    }
    // 	}
	
    // 	base_elt.textContent = name;
	
    // 	if ( bound_record.btp == 'fraction' )
    // 	{
    // 	    name = 'click to select';
	    
    // 	    if ( base_record && range_record && base_record.tid != range_id )
    // 	    {
    // 		if ( range_record.age == 0 ) name = 'Present';
    // 		else name = range_record.age + ' (' + range_id + ')';

    // 		// $$$ once we pre-compute lower names, the lower name for the range bound should be displayed.
		
    // 		range_elt.textContent = name;
    // 		range_elt.style.display = 'inline';
    // 	    }
	    
    // 	    else
    // 	    {
    // 		range_elt.textContent = '';
    // 		range_elt.style.display = 'none';
    // 	    }

    // 	    var frac_value = '';
    // 	    if ( bound_record.frc != undefined ) frac_value = bound_record.frc;
	    
    // 	    frac_elt.disabled = false;	    
    // 	    frac_elt.value = frac_value;
    // 	}

    // 	else
    // 	{
    // 	    range_elt.textContent = '';
    // 	    range_elt.style.display = 'none';

    // 	    frac_elt.value = '';
    // 	    frac_elt.disabled = 'true';
    // 	}
    // }

    function displayBoundError ( text )
    {
	setElementContent("be_error_msg", text);
    }
    
    function clearBoundEditor ( message )
    {
	if ( ! message ) message = '';
	setElementContent('be_error_msg', message);
	setElementContent('be_bound_id', '');
	setElementValue('be_top_bound', '');
	setElementValue('be_intname', '');
	setElementValue('be_lower', '');
	setElementValue('be_age', '');
	setElementValue('be_age_err', '');
	setElementValue('be_fraction', '');
	setElementValue('be_bound_type', 'absolute');
	setElementValue('be_bound_link', '');
	setElementDisabled('be_fraction', 1);
	
	// msg.style.display = 'none';
	
	// range.style.display = 'none';
	
	// Remove any error highlighting.
	
	$("#be_age").removeClass('tsed_error');
	$("#be_fraction").removeClass('tsed_error');
	$("#be_intname").removeClass('tsed_error');
    }
    
    this.clearBoundEditor = clearBoundEditor;

    // This function is called whenever any of the valus displayed in the bound editor pane is
    // changed.
    
    function checkBoundEditor ( changed, new_base, new_range )
    {
	var current_id = appstate.intervals.current_bound_id;
	var app_record = appstate.intervals.bounds_id[current_id];
	var db_record = api_data.bounds_id[current_id];
	var redisplay_bound, redisplay_interval, redisplay_all;
	
	// If we are not editing an interval, just return.
	
	if ( current_id == undefined ) return;
	
	// If the 'multi' selector was chosen, switch to editing a different bound.

	if ( changed == 'multi' )
	{
	    var new_id = 'tsbound_' + getElementValue("be_multi");
	    selectBounds(new_id);
	    return;
	}
	
	// Otherwise, update the local record for this bound. Depending on the bound type, updating one
	// attribute may cause others to change as well.
	
	if ( changed == 'age' )
	{
	    var result = checkBoundAge(app_record, 'age');
	    if ( result && result == 'all' ) redisplay_all = 1;
	    else redisplay_bound = 1;
	}
	
	else if ( changed == 'age_err' )
	{
	    var new_age_err = getElementValue("be_age_err");
	    app_record.ger = new_age_err;
	    redisplay_bound = 1;
	}
	
	else if ( changed == 'fraction' )
	{
	    checkBoundAge(app_record, 'fraction');
	    redisplay_bound = 1;
	}
	
	else if ( changed == 'type' )
	{
	    checkBoundAge(app_record, 'type');
	    redisplay_bound = 1;
	}

	else if ( changed == 'link' )
	{
	    var link_adjust = getElementValue("be_bound_link");
	    // $$$ pass age and link_adjust, so that bound selector can highlight the appropriate
	    // element in any selected timescale.
	    
	    if ( link_adjust == "top" )
	    {
		var tid = app_record.tid;
		var sid = api_data.bounds_id[tid] ? api_data.bounds_id[tid].sid : 'tsc:1';
		openBoundSelectorForEdit(link_adjust, sid, tid);
	    }
	    
	    else if ( link_adjust == "base" || link_adjust == "interval" )
	    {
		var bid = app_record.bid;
		var sid = api_data.bounds_id[bid] ? api_data.bounds_id[bid].sid : 'tsc:1';
		openBoundSelectorForEdit(link_adjust, sid, bid);
	    }
	    
	    return;
	}
	
	else if ( changed == 'link_select' )
	{
	    checkBoundAge(app_record, 'links', new_base, new_range);
	    redisplay_bound = 1;
	}
	
	else if ( changed == 'top_bound' )
	{
	    var new_top = getElementValue("be_top_bound");
	    app_record.uid = new_top;
	    redisplay_all = 1;
	}
	
	else if ( changed == 'intname' )
	{
	    var new_intname = getElementValue("be_intname");

	    if ( app_record.uid )
	    {
		app_record.inm = new_intname;
		redisplay_all = 1;
		// redisplay_interval = 1;
	    }

	    else
	    {
		window.alert("You must specify an upper boundary for the interval before giving it a name.");
		setElementValue("be_intname", 'none');
	    }
	}
	
	else if ( changed == 'lower' )
	{
	    var new_lower = getElementValue("be_lower");
	    var lower_bound_index;
	    var lower_matches = 0;
	    
	    for ( var i=0; i < appstate.intervals.bounds.length; i++ )
	    {
		var bound_record = appstate.intervals.bounds[i];
		
		if ( bound_record.uid && bound_record.uid == current_id )
		{
		    lower_bound_index = i;
		    lower_matches++;
		}
	    }
	    
	    if ( lower_matches == 1 && lower_bound_index != undefined )
	    {
		appstate.intervals.bounds[lower_bound_index].inm = new_lower;
		appstate.intervals.bounds[lower_bound_index].dirty = 1;
		redisplay_all = 1;
	    }
	    
	    else if ( lower_matches > 1 )
	    {
		window.alert("More than one lower interval is defined for this boundary. Select one to changes its name.");
		setElementValue("be_lower", 'multiple');
	    }
	    
	    else
	    {
		window.alert("No lower interval is defined for this boundary.");
		setElementValue("be_lower", 'none');
	    }
	    
	}
	
	// Then compare the local record to the record as last fetched from the database. If it
	// differs, then the record has changes that need to be saved.
	
	app_record.dirty = 0;
	
	if ( app_record.inm != db_record.inm ) app_record.dirty = 1;
	if ( app_record.age != db_record.age ) app_record.dirty = 1;
	if ( app_record.ger != db_record.ger ) app_record.dirty = 1;
	if ( app_record.frc != db_record.frc &&
	   ( has_digit.test(app_record.frc) || has_digit.test(db_record.frc) ) ) app_record.dirty = 1;
	if ( app_record.uid != db_record.uid ) app_record.dirty = 1;
	if ( app_record.bid != db_record.bid ) app_record.dirty = 1;
	if ( app_record.tid != db_record.tid ) app_record.dirty = 1;
	if ( app_record.cid != db_record.cid ) app_record.dirty = 1;
	if ( app_record.typ != db_record.typ ) app_record.dirty = 1;
	if ( app_record.btp != db_record.btp ) app_record.dirty = 1;
	
	// If any of the boundaries in the current timescale have unsaved changes, we need to
	// highlight the save button.

	appstate.intervals.dirty = 0;
	
	for ( i=0; i < appstate.intervals.bounds.length; i++ )
	{
	    if ( appstate.intervals.bounds[i].dirty ) appstate.intervals.dirty = 1;
	}

	if ( appstate.intervals.dirty )
	    $(document.intervals_form.save).addClass('tsed_active_save');
	
	else
	    $(document.intervals_form.save).removeClass('tsed_active_save');

	
	// Now reflect the new values in the interval editor pane.

	if ( redisplay_all )
	{
	    displayIntervals();
	    return;
	}
	
	if ( redisplay_bound )
	{
	    var row_selector = '#tsbound_' + current_id.replace(':','\\:');
	    var new_content = boundAgeBasisContent(app_record.age, app_record);
	    
	    $(row_selector).html(new_content);
	}

	if ( redisplay_interval )
	{
	    var row_selector = '#tsint_' + current_id.replace(':', '\\:');
	    var new_content = intervalRowContent(app_record);

	    $(row_selector).html(new_content);
	}
    }
    
    this.checkBoundEditor = checkBoundEditor;

    function checkBoundAge ( app_record, what_changed, new_base, new_range )
    {
	var bound_type = app_record.btp;
	var base_id = app_record.bid;
	var range_id = app_record.tid;
	
	var new_age, new_fraction;
	var new_type;
	var check_range;
	
	clearBoundError();
	
	if ( what_changed == 'age' )
	{
	    new_age = getElementValue("be_age");
	    
	    if ( bound_type == 'fraction' && base_id && range_id && base_id != range_id )
	    {
		var base_age = appstate.intervals.bounds_id[base_id] ?
		    appstate.intervals.bounds_id[base_id].age : api_data.bounds_id[base_id].age;
		
		var range_age = appstate.intervals.bounds_id[range_id] ?
		    appstate.intervals.bounds_id[range_id].age : api_data.bounds_id[range_id].age;
		
		new_fraction = (base_age - new_age) / (base_age - range_age);
		new_fraction = Math.round(new_fraction * 100000) / 100000;
	    }
	}
	
	else if ( what_changed == 'fraction' )
	{
	    new_fraction = getElementValue("be_fraction");
	    
	    if ( new_fraction == '' )
	    {
		new_age = '';
	    }
	    
	    else if ( bound_type == 'fraction' && base_id && range_id && base_id != range_id &&
		      Number(new_fraction) <= 1 && Number(new_fraction) >= 0 )
	    {
		var base_age = appstate.intervals.bounds_id[base_id] ?
		    appstate.intervals.bounds_id[base_id].age : api_data.bounds_id[base_id].age;
		
		var range_age = appstate.intervals.bounds_id[range_id] ?
		    appstate.intervals.bounds_id[range_id].age : api_data.bounds_id[range_id].age;
		
		new_age = base_age - (base_age - range_age) * new_fraction;
		new_age = Math.round(new_age * 100) / 100;
	    }

	    else
	    {
		new_age = getElementValue("be_age");
	    }
	}
	
	else if ( what_changed == 'type' )
	{
	    new_type = getElementValue("be_bound_type");
	    
	    if ( new_type == 'absolute' || new_type == 'spike' )
	    {
		new_age = app_record.age;
		new_fraction = '';
		setElementValue("be_fraction", '');
		setElementDisabled("be_fraction", 1);
	    }
	    
	    else if ( new_type == 'same' )
	    {
		if ( range_id && getElementValue("be_fraction") > 0.5 )
		{
		    new_age = api_data.bounds_id[range_id].age;
		    new_base = range_id;
		    setElementValue("be_age", new_age);
		}
		
		else if ( base_id )
		{
		    new_age = api_data.bounds_id[base_id].age;
		    new_base = base_id;
		    setElementValue("be_age", new_age);
		}
		
		else
		    new_type = undefined;
		
		new_fraction = '';
		setElementValue("be_fraction", '');
		setElementDisabled('be_fraction', 1);
	    }
	    
	    else if ( new_type == 'fraction' )
	    {
		if ( base_id )
		{
		    new_base = base_id;
		    
		    if ( ! range_id || base_id == range_id )
		    {
			new_range = api_data.bounds_id[base_id].uid;
		    }
		}
		
		else
		{
		    new_base = chooseBestInterval(app_record.age, (appstate.intervals.source_timescale_id || 'tsc:1' ));
		    
		    if ( api_data.bounds_id[new_base] )
		    {
			new_range = api_data.bounds_id[new_base].uid;
		    }
		}
	    }
	    
	    else
	    {
		console.log("ERROR: unknown bound type '" + new_type + "'");
	    }
	    
	    setBoundLinkMenu(app_record, new_type, new_base, new_range);
	}
	
	else if ( what_changed == 'links' )
	{
	    // if only the range bound was changed, then the new base bound will be the same as the old.

	    if ( new_range ) new_base = new_base || app_record.bid;

	    setBoundLinkMenu(app_record, app_record.btp, new_base, new_range);
	}

	// Now check to make sure that the new values make sense.  If the new age is empty, this
	// indicates that the bound should be deleted when this timescale is saved. For any bounds
	// that have this one as a top_id, we re-link their top_id to the top_id of this one.
	
	if ( new_age == '' )
	{
	    app_record.age = '';
	    app_record.frc = '';
	    unlinkInterval(app_record.oid);
	    return 'all';
	}
	
	// If the age has changed, we need to check that the new age is between the next higher
	// and next lower bounds.
	
	if ( new_age != undefined )
	{
	    var top_id = app_record.uid;
	    var top_age = top_id ? appstate.intervals.bounds_id[top_id].age : undefined;
	    
	    var lower_age;
	    
	    for ( var i=0; i < appstate.intervals.bounds.length; i++ )
	    {
		if ( appstate.intervals.bounds[i].uid == app_record.oid &&
		     appstate.intervals.bounds[i].age != undefined )
		{
		    if ( lower_age == undefined || appstate.intervals.bounds[i].age < lower_age )
			lower_age = appstate.intervals.bounds[i].age;
		}
	    }
	    
	    if ( top_age != undefined && Number(new_age) <= Number(top_age) )
	    {
		$("#be_age").addClass('tsed_error');
		displayBoundError("age must be greater than next higher bound");
		return;
	    }
	    
	    if ( lower_age != undefined && Number(new_age) >= Number(lower_age) )
	    {
		$("#be_age").addClass('tsed_error');
		displayBoundError("age must be less than next lower bound");
		return;
	    }
	}
	
	// If the type is 'fraction', we need to make sure that the age falls within the specified bounds.
	
	var check_type = new_type || app_record.btp;
	var check_age = new_age != undefined ? new_age : app_record.age;
	var check_base = new_base || base_id;
	var check_range = new_range || range_id;
	
	if ( check_type == 'fraction' )
	{
	    if ( check_base )
	    {
		var base_age = appstate.intervals.bounds_id[check_base] ?
		    appstate.intervals.bounds_id[check_base].age :
		    api_data.bounds_id[check_base].age;
		
		if ( base_age != undefined && Number(app_record.age) > Number(base_age) )
		{
		    setBoundLinkMenu(app_record, new_type, new_base, new_range);
		    displayBoundError("the bound age is not within the selected range");
		    $("#be_bound_link").addClass('tsed_error');
		    if ( api_data.bound_id[check_base] )
			appstate.intervals.source_timescale_id = api_data.bounds_id[check_base].sid;
		    return;
		}
		
		if ( check_range )
		{
		    var range_age = appstate.intervals.bounds_id[check_range] ?
			appstate.intervals.bounds_id[check_range].age : api_data.bounds_id[check_range].age;
		    
		    if ( range_age != undefined && Number(app_record.age) < Number(range_age) )
		    {
			setBoundLinkMenu(app_record, new_type, new_base, new_range);
			displayBoundError("the bound age is not within the selected range");
			$("#be_bound_link").addClass('tsed_error');
			return;
		    }
		    
		    new_fraction = (base_age - app_record.age) / (base_age - range_age);
		    new_fraction = Math.round(new_fraction * 100000) / 100000;
		    
		    setElementDisabled('be_fraction', 0);
		}

		else
		{
		    setBoundLinkMenu(app_record, new_type, new_base);
		    displayBoundError("you must set a top bound for the modeled interval");
		    $("#bd_bound_link").addClass('tsed_error');
		}
	    }

	    else
	    {
		setBoundLinkMenu(app_record, new_type);
		displayBoundError("you must choose an interval in which to model this bound");
		$("#bd_bound_link").addClass('tsed_error');
	    }
	}
	
	// If the fraction has changed, we need to check that the new fraction is between 0 and 1.
	
	if ( new_fraction != undefined )
	{
	    if ( Number(new_fraction) >= 0 && Number(new_fraction) <= 1 )
	    {
		$("#be_fraction").removeClass('tsed_error');
	    }
	    
	    else if ( new_fraction != "" )
	    {
		$("#be_fraction").addClass('tsed_error');
		displayBoundError("fraction is out of range");
		return;
	    }
	}	
	
	// If we get here, then we can update the app record.
	
	if ( new_age != undefined )
	{
	    app_record.age = new_age;
	    setElementValue("be_age", new_age);
	    // $("#be_age").removeClass('tsed_error');
	}
	
	if ( new_fraction != undefined )
	{
	    app_record.frc = new_fraction;
	    setElementValue("be_fraction", new_fraction);
	    // $("#be_fraction").removeClass('tsed_error');
	}
	
	if ( new_type != undefined )
	{
	    app_record.btp = new_type;
	}
	
	if ( new_base != undefined )
	{
	    app_record.bid = new_base;
	    if ( api_data.bounds_id[new_base] )
		appstate.intervals.source_timescale_id = api_data.bounds_id[new_base].sid;
	}

	if ( new_range != undefined )
	{
	    app_record.tid = new_range;
	    if ( api_data.bounds_id[new_range] )
		appstate.intervals.source_timescale_id = api_data.bounds_id[new_range].sid;
	}
	
	//     if ( app_record.btp == 'fraction' )
	//     {
	// 	var bottom_id = app_record.bid;
	// 	var range_id = app_record.tid;
		
	// 	var bottom_age = appstate.intervals.bounds_id[bottom_id] ?
	// 	    appstate.intervals.bounds_id[bottom_id].age : api_data.bounds_id[bottom_id].age;
		
	// 	var range_age = appstate.intervals.bounds_id[range_id] ?
	// 	    appstate.intervals.bounds_id[range_id].age : api_data.bounds_id[range_id].age;
		
	// 	if ( app_record.age > bottom_age || app_record.age < range_age )
	// 	{
	// 	    $("#be_age").addClass('tsed_error');
	// 	}
		
	// 	else
	// 	{
	// 	    $("#be_age").removeClass('tsed_error');
	// 	}
		
	// 	var new_fraction = (bottom_age - app_record.age) / (bottom_age - range_age);
	// 	new_fraction = Math.round(new_fraction * 100000) / 100000;
		
	// 	app_record.frc = new_fraction;
	// 	setElementValue("be_fraction", new_fraction);
	//     }
	// }
	
    }

    function chooseBestInterval ( target_age, timescale_id )
    {
	var bound_list = api_data.timescale_bound_list[timescale_id];
	var best_bound;
	
	for ( var i=0; i < bound_list.length; i++ )
	{
	    var bound_record = api_data.bounds_id[bound_list[i]];
	    if ( bound_record && Number(bound_record.age) >= Number(target_age) )
	    {
		best_bound = bound_list[i];
		break;
	    }
	}

	return best_bound;
    }

    function clearBoundError ( )
    {
	$("#be_age").removeClass('tsed_error');
	$("#be_fraction").removeClass('tsed_error');
	$("#be_bound_type").removeClass('tsed_error');
	$("#be_bound_link").removeClass('tsed_error');
	setElementContent("be_error_msg", '');
    }

    // This function removes the specified bound from the timescale by changing any top links that point
    // to it. These links are changed to its own top_id.
    
    function unlinkInterval ( bound_id )
    {
	var bound_record = appstate.intervals.bounds_id[bound_id];
	
	if ( ! bound_record ) return;

	var new_top = bound_record.uid;

	if ( ! new_top ) return;
	
	for ( var i=0; i < appstate.intervals.bounds.length; i++ )
	{
	    if ( appstate.intervals.bounds[i].uid == bound_id )
	    {
		appstate.intervals.bounds[i].uid = new_top;
	    }
	}
    }
    
    function openBoundSelectorForEdit ( link_type, timescale_id, bound_id )
    {
	appstate.bound_selector.choice_callback = function ( choice_id, type ) {
	    if ( type == 'bound' )
	    {
		modalClose("bound_selector");
		completeBoundEditSelector(link_type, choice_id);
	    }
	    
	    else if ( type == 'timescale' )
	    {
		setBoundSelectorTimescale(choice_id);
	    }
	};

	openBoundSelectorBox(timescale_id, bound_id);
    }

    function openBoundSelectorForAdd ( link_type, i, timescale_id )
    {
	appstate.bound_selector.choice_callback = function ( choice_id, type ) {
	    if ( type == 'bound' )
	    {
		modalClose("bound_selector");
		completeBoundAddSelector(link_type, i, choice_id);
	    }
	    
	    else if ( type == 'timescale' )
	    {
		setBoundSelectorTimescale(choice_id);
	    }
	};
	
	openBoundSelectorBox(timescale_id);
    }
    
    function openBoundSelectorBox ( timescale_id, bound_id )
    {
	var modal_elt = myGetElement("bound_selector");
	var input_elt; // = myGetElement("bsel_input");
	
	if ( ! timescale_id ) timescale_id = 'tsc:1';
	setBoundSelectorTimescale(timescale_id, bound_id);
	
	if ( modal_elt )
	{
	    modal_elt.style.display = "block";
	    
	    if ( input_elt ) {
		input_elt.value = '';
		input_elt.focus();
	    }
	}
    }
    
    function setBoundSelectorTimescale ( timescale_id, bound_id )
    {
	if ( ! api_data.timescales_id[timescale_id] )
	{
	    timescale_id = 'tsc:1';
	    bound_id = undefined;
	}
	
    	appstate.bound_selector.timescale_id = timescale_id;
	
    	$("#bound_selector_timescales td").each(function () {
    	    if ( this.title == timescale_id ) $(this).addClass("tsed_highlight");
    	    else $(this).removeClass("tsed_highlight");
    	});
	
	if ( api_data.timescale_bound_list[timescale_id] )
	{
	    fillBoundSelector(timescale_id);
	    if ( bound_id ) highlightBoundSelectorBound(bound_id);
	}
	
	else
	{
    	    setInnerHTML("bound_selector_bounds", "<tr><td>loading...</td></tr>");

	    fetchAPIData(

		'timescales/bounds.json?timescale_id=' + timescale_id,
		
		function ( response ) {
		    cacheBoundData(response.records);
		    fillBoundSelector(timescale_id);
		    if ( bound_id ) highlightBoundSelectorBound(bound_id);
		},
		
		function ( xhr ) {
		    clearTimescaleIntervals('error', "could not load bounds for timescale '" + timescale_id + "'");
		});
	}
    }
    
    function fillBoundSelector ( timescale_id )
    {
	var bound_list = api_data.timescale_bound_list[timescale_id];
	var content = '';
	
	for ( var i=0; i < bound_list.length; i++ )
	{
	    var bound_id = bound_list[i];
	    
	    if ( api_data.bounds_id[bound_id] )
		content += generateBoundTableRow( api_data.bounds_id[bound_id], 'bound_selector' );
	    else
		console.log("ERROR: could not find cached bound record for '" + bound_id + "'");
	}
	
	setInnerHTML("bound_selector_bounds", content);
    }
    
    function highlightBoundSelectorBound ( bound_id )
    {
	appstate.bound_selector.bound_id = bound_id;
	
	$("#bound_selector_bounds td").each(function () {
    	    if ( this.title == bound_id ) $(this).addClass("tsed_highlight");
    	    else $(this).removeClass("tsed_highlight");
    	});
    }
    
    function completeBoundEditSelector ( link_type, link_id )
    {
	var current_id = appstate.intervals.current_bound_id;
	var new_base, new_range;
	
	if ( current_id && link_id && appstate.intervals.bounds_id[current_id] )
	{
	    if ( link_type == 'base' )
	    {
		new_base = link_id;
	    }
	    
	    else if ( link_type == 'interval' )
	    {
		var link_record = api_data.bounds_id[link_id];
		new_base = link_id;
		// appstate.intervals.bounds_id[current_id].bid = link_id;
		if ( link_record ) new_range = link_record.uid;
		// appstate.intervals.bounds_id[current_id].tid = link_record.uid;
	    }
	    
	    else if ( link_type == 'top' )
	    {
		// appstate.intervals.bounds_id[current_id].tid = link_id;
		new_range = link_id;
	    }
	}
	
	checkBoundEditor('link_select', new_base, new_range);
    }
    
    // OLD STUFF BELOW:
    
    // function timeTopContent ( height_px, age )
    // {
    // 	var content = '<tr><td class="tsed_time_mark" style="height: ' + height_px +
    // 	    'px; border-top: 0px">' + '<div class="tsed_mark_age" style="height: 10px; top: 3px">' +
    // 	    age + "</div></td></tr>\n";
	
    // 	return content;
    // }
    
    // function generateBoundsFormContent ( timescale_id, records )
    // {
    // 	appstate.bounds = bounds_edit;
	
    // 	// First go through the records and save the content under the application variable
    // 	// 'bounds_edit'. This is a singular variable, which means we can only be editing one set
    // 	// of bounds at once. In the process, determine which bounds are referenced as interval
    // 	// top by any bound other than the immediately following one. Also keep track of any base
    // 	// bounds, range bounds, and color bounds from other timescales so that we can query for
    // 	// them if necessary.
	
    // 	bounds_edit.n_bounds = records.length;
    // 	bounds_edit.values = [ ];
    // 	bounds_edit.lookup = { };
    // 	bounds_edit.labels = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
    // 	bounds_edit.next_label = 0;

    // 	bounds_edit.source_timescale_id = api_data.timescales_id[timescale_id].source_timescale_id || 1;
	
    // 	var base_bounds = [ ];
	
    // 	for ( var i=0; i < records.length; i++ )
    // 	{
    // 	    var oid = records[i].oid;
	    
    // 	    var top_oid = records[i].uid;
    // 	    var base_oid = records[i].bid;
    // 	    var range_oid = records[i].tid;
    // 	    var color_oid = records[i].cid;
	    
    // 	    bounds_edit.values[i] = { oid: oid, inm: records[i].inm, btp: records[i].btp,
    // 				      age: records[i].age, ger: records[i].ger,
    // 				      frc: records[i].frc, spk: records[i].spk,
    // 				      bid: base_oid, tid: range_oid, uid: top_oid, cid: color_oid };
	    
    // 	    if ( base_oid && ! api_data.bounds_id[base_oid] ) base_bounds.push(base_oid);
    // 	    if ( range_oid && ! api_data.bounds_id[range_oid] ) base_bounds.push(range_oid);
    // 	    if ( color_oid && ! api_data.bounds_id[color_oid] ) base_bounds.push(color_oid);

    // 	   bounds_edit.lookup[oid] = i;
    // 	}
	
    // 	// If we have found any base bounds, fire off a query to get their info as well. Once the
    // 	// query returns, we can update the form contents.
	
    // 	if ( base_bounds.length > 0 )
    // 	{
    // 	    var bounds_str = base_bounds.join(',');
	    
    // 	    $.getJSON(data_url + 'timescales/bounds.json?bound_id=' + bounds_str)
    // 		.done(function ( response ) { callbackBaseBounds( response.records ) })
    // 		.fail(function ( ) { window.alert('ERROR: could not query base bounds') });
    // 	}
	
    // 	// Go through the bounds again and figure out which bounds (if any) are referenced as interval
    // 	// top by any bound except the immediately following one. Mark these with the extended_top flag.
	
    // 	for ( var i=1; i < bounds_edit.values.length; i++ )
    // 	{
    // 	    var top_oid = bounds_edit.values[i].uid;
    // 	    var top_index = bounds_edit.lookup[top_oid];
	    
    // 	    if ( top_index && top_index != i-1 && ! bounds_edit.values[top_index].top_label )
    // 	    {
    // 		var letter = bounds_edit.next_label % 26;
    // 		var mult = (bounds_edit.next_label + 1) / 26;
    // 		var new_label = '';
		
    // 		for ( var i = 0; i < mult; i++ )
    // 		{
    // 		    new_label += bounds_edit.labels.charAt(letter);
    // 		}
		
    // 		bounds_edit.values[top_index].top_label = new_label;
    // 		bounds_edit.next_label++;
    // 	    }
    // 	}
	
    // 	// Now generate the bounds form from the data we received.
	
    // 	var content = "";
	
    // 	for ( var i=0; i < bounds_edit.values.length; i++ )
    // 	{
    // 	    content += generateBoundsFormRow(i, bounds_edit.values[i]);
    // 	}
	
    // 	return content;
    // }
    
    // function generateBoundsFormRow( i, record, prev_interval )
    // {
    // 	var content = '<tr class="tsed_bounds_row" id="bound_row_' + i + '"><td class="bound_cell">';
	
    // 	if ( i > 0 ) content += intervalInput(i, record);
    // 	content += oidField(i, record);
    // 	content += ageInput(i, record);
    // 	content += btpInput(i, record);

    // 	content += '</td><td id="bound_linktd_' + i + '">';
	
    // 	content += topInput(i, record);
	
    // 	content += '</td><td id="bound_reftd_' + i + '">';
	
    // 	content += baseInput( i, record );
	
    // 	content += "</td></tr>\n";
	
    // 	return content;
    // }
    
    // function oidField ( i, record )
    // {
    // 	var content = '<input type="hidden" id="bound_id_' + i + '" value="' + record.oid + "\"/>\n";
    // 	return content;
    // }

    // function intervalInput ( i, record )
    // {
    // 	// var name = (record.iid == undefined) ? '  --' : record.inm;
    // 	var name = record.inm || '  --';
    // 	var content = '<input type="text" class="tsed_control" id="bound_int_' + i + '" value="' + name + "\"/><br>\n";
    // 	return content;
    // }
    
    // function ageInput ( i, record )
    // {
    // 	var attrs = '';
    // 	if ( record.btp && record.btp != 'spike' && record.btp != 'absolute' ) attrs = ' disabled';
	
    // 	var age = record.age != undefined ? record.age : '';
    // 	var err = record.ger != undefined ? record.ger : '';
	
    // 	var content = '<input class="tsed_control" id="bound_age_' + i + 
    // 	    '" type="text" size="8" value="' + age + '"' + attrs + '> &plusmn; ';
    // 	content += '<input class="tsed_control" id="bound_age_err_' + i +
    // 	    '" type="text" size="5" value="' + err + '"' + attrs + '>';
    // 	return content;
    // }
    
    // function btpInput ( i, record )
    // {
    // 	var content = '&nbsp;<select class="tsed_control" id="bound_type_' + i + 
    // 	    '" onchange="tsapp.setBoundType(' + i + ')">\n';
	
    // 	var found;
	
    // 	for ( var j=0; j<form_elt.btps.length; j++ )
    // 	{
    // 	    var value = form_elt.btps[j];
    // 	    var selected = '';
	    
    // 	    if (value == record.btp)
    // 	    {
    // 		selected = ' selected';
    // 		found = 1;
    // 	    }
	    
    // 	    content += '<option value="' + value + '"' + selected + ">" + form_elt.btpnames[j] + "</option>\n";
    // 	}
	
    // 	if ( ! found ) content += '<option value ="' + record.btp + '" selected>' + record.btp + "</option>\n";
	
    // 	content += "</select>\n";
	
    // 	var src = '/blank.png';
    // 	if ( record.spk ) src = '/spike.png';
	
    // 	content += '<img class="spike" id="bound_spike_' + i + '" width="20" height="20" src="' + resource_url + src + '">' + "\n";
	
    // 	var frc = record.frc || '';
    // 	var attrs = record.btp == 'fraction' ? '' : ' style="display: none;"';
	
    // 	content += '&nbsp&nbsp;<input class="tsed_control" id="bound_frac_' + i +
    // 	    '" type="text" size="6" value="' + frc + '"' + attrs + ">\n";
	
    // 	return content;
    // }

    // function topInput ( i, record )
    // {
    // 	var content = '';
    // 	var top_oid;
	
    // 	if ( top_oid = record.uid )
    // 	{
    // 	    var top_index = bounds_edit.lookup[top_oid];
    // 	    var top_label = bounds_edit.values[top_index].top_label;

    // 	    if ( top_label ) content += '<span class="tsed_top_ref">' + top_label + "</span>\n";
    // 	}
	
    // 	if ( record.top_label )
    // 	{
    // 	    if ( content ) content += "<br>";
	    
    // 	    content += '<span class="tsed_top_label">' + record.top_label + "</span>\n";
    // 	}
	
    // 	return content;
    // }
    
    // function baseInput ( i, record )
    // {
    // 	var content = '';
	
    // 	var start_tag = '<span id="base_bound_' + i + '" class="tsed_timescale_label" ' +
    // 	    'onclick="tsapp.selectBaseBound(\'base\',' + i + ')">';
	
    // 	if ( record.btp == "same" )
    // 	{
    // 	    content = linkBoundBtn(i, record, 'base', api_data.bounds_id[record.bid]);
	    
    // 	    // content = start_tag + base_label + '</span>';
	    
    // 	    // if ( record.age_diff )
    // 	    // {
    // 	    // 	var rounded = Math.round(record.age_diff * 1000) / 1000;
    // 	    // 	content += '<span class="tsed_diff"> (' + rounded > 0 ? "+" : "" + rounded + ')</span>';
    // 	    // }
    // 	}
	
    // 	else if ( record.btp == "fraction" )
    // 	{
    // 	    content = linkBoundBtn(i, record, 'range', api_data.bounds_id[record.tid]);

    // 	    content += "<br>\n";

    // 	    content += linkBoundBtn(i, record, 'base', api_data.bounds_id[record.bid]);

	    	    
	    
    // 	//     var base_record = api_data.bounds_id[record.bid];
    // 	//     var top_record = api_data.bounds_id[record.tid];
    // 	//     var base_label = 'unknown';
    // 	//     var top_label = 'unknown';
	    
    // 	//     var fraction = record.frc != undefined ? record.frc : '';
    // 	//     var frcfield = '<input class="tsed_control" id="bound_frc_' + i + 
    // 	// 	'" type="text" size="6" value="' + fraction + '">';
	    
    // 	//     if ( base_record )
    // 	//     {
    // 	// 	base_label = base_record.inm || 'unknown';
    // 	// 	if ( base_record.sid > 5 && base_record.sid != record.sid )
    // 	// 	{
    // 	// 	    var base_tsrecord = api_data.timescales_id[base_record.sid];
    // 	// 	    base_label += ' [' + base_tsrecord.nam + ']';
    // 	// 	}
		
    // 	// 	top_label = top_record.inm || top_record.age || 'unknown';
		
    // 	//     	if ( (base_record.sid > 5 && base_record.sid != record.sid) ||
    // 	// 	     (top_record.sid > 5 && top_record.sid != record.sid) )
    // 	// 	{
    // 	// 	    var base_tsrecord = api_data.timescales_id[base_record.sid];
    // 	// 	    var top_tsrecord = api_data.timescales_id[top_record.sid];
		    
    // 	// 	    if ( base_record.sid == top_record.sid )
    // 	// 	    {
    // 	// 		top_label += ' [' + base_tsrecord.nam + ']';
    // 	// 	    }
		    
    // 	// 	    else
    // 	// 	    {
    // 	// 		base_label += ' [' + base_tsrecord.nam + ']';
    // 	// 		top_label += ' [' + top_tsrecord.nam + ']';
    // 	// 	    }
    // 	// 	}
		
    // 	// 	if ( base_record.age != undefined )
    // 	// 	    base_label += ' (' + base_record.age + ')';
    // 	// 	if ( top_record.age != undefined )
    // 	// 	    top_label += ' (' + top_record.age + ')';
		
    // 	// 	content = pctfield + start_tag + base_label + ' - ' + top_label + '</span>';
    // 	//     }

    // 	//     else if ( base_record )
    // 	//     {
    // 	// 	base_label = base_record.inm || 'unknown';

    // 	//     	if ( base_record.sid > 5 && base_record.sid != record.sid )
    // 	// 	{
    // 	// 	    var base_tsrecord = api_data.timescales_id[base_record.sid];
    // 	// 	    base_label += ' [' + base_tsrecord.nam + ']';
    // 	// 	}

    // 	// 	content = start_tag + base_label + '</span>';
    // 	//     }
	
    // 	// else
    // 	//     {
    // 	// 	content = start_tag + 'choose a boundary</span>';
    // 	//     }
    // 	}
	
    // 	// else if ( record.btp == "alternate" )
    // 	// {
    // 	//     var base_record = api_data.bounds_id[record.bid];
    // 	//     var top_record = api_data.bounds_id[record.tid];
    // 	//     var base_label = 'unknown';
    // 	//     var top_label = 'unknown';
	    
    // 	//     if ( base_record && top_record )
    // 	//     {
    // 	// 	base_label = base_record.inm || 'unknown';
    // 	// 	top_label = top_record.inm || top_record.age || 'unknown';
		
    // 	//     	if ( (base_record.sid > 5 && base_record.sid != record.sid) ||
    // 	// 	     (top_record.sid > 5 && top_record.sid != record.sid) )
    // 	// 	{
    // 	// 	    var base_tsrecord = api_data.timescales_id[base_record.sid];
    // 	// 	    var top_tsrecord = api_data.timescales_id[top_record.sid];
		    
    // 	// 	    if ( base_record.sid == top_record.sid )
    // 	// 	    {
    // 	// 		top_label += ' [' + base_tsrecord.nam + ']';
    // 	// 	    }
		    
    // 	// 	    else
    // 	// 	    {
    // 	// 		base_label += ' [' + base_tsrecord.nam + ']';
    // 	// 		top_label += ' [' + top_tsrecord.nam + ']';
    // 	// 	    }
    // 	// 	}
		
    // 	// 	content = start_tag + base_label + ' - ' + top_label + '</span>';
    // 	//     }
	    
    // 	//     else if ( base_record )
    // 	//     {
    // 	// 	base_label = base_record.inm || 'unknown';

    // 	//     	if ( base_record.sid > 5 && base_record.sid != record.sid )
    // 	// 	{
    // 	// 	    var base_tsrecord = api_data.timescales_id[base_record.sid];
    // 	// 	    base_label += ' [' + base_tsrecord.nam + ']';
    // 	// 	}

    // 	// 	content = start_tag + base_label + '</span>';
    // 	//     }

    // 	//     else if ( top_record )
    // 	//     {
    // 	// 	base_label = 'here';
    // 	// 	top_label = top_record.inm || top_record.age || 'unknown';
		
    // 	//     	if ( top_record.sid > 5 && top_record.sid != record.sid )
    // 	// 	{
    // 	// 	    var top_tsrecord = api_data.timescales_id[top_record.sid];
    // 	// 	    top_label += ' [' + top_tsrecord.nam + ']';
    // 	// 	}
		
    // 	// 	content = start_tag + 'this age' + ' - ' + top_label + '</span>';
    // 	//     }

    // 	//     else if ( record.iid == undefined )
    // 	//     {
    // 	// 	content = start_tag + 'this age</span>';
    // 	//     }
	    
    // 	//     else
    // 	//     {
    // 	// 	content = start_tag + 'choose a boundary</span>';
    // 	//     }
    // 	// }
	
    // 	// else if ( record.age == 0 )
    // 	// {
    // 	//     return '<span class="tsed_timescale_label">Present</span>';
    // 	// }
	
    // 	return content;
    // }

    // function linkBoundBtn ( i, record, type, link_record )
    // {
    // 	var link_label;
	
    // 	if ( link_record )
    // 	{
    // 	    link_label = link_record.inm || 'unknown';
	    
    // 	    if ( link_record.age == "0" )
    // 		link_label = 'Present';
	    
    // 	    else if ( link_label == "" )
    // 		link_label = link_record.oid;
	    
    // 	    if ( link_record.sid > 5 && link_record.sid != record.sid )
    // 	    {
    // 		var link_tsrecord = api_data.timescales_id[link_record.sid];
    // 		link_label += ' [' + link_tsrecord.nam + ']';
    // 	    }
    // 	}
	
    // 	else
    // 	{
    // 	    link_label = 'choose a boundary';
    // 	}
	
    // 	var content = '<span id="' + type + '_bound_' + i + '" class="tsed_timescale_label" ' +
    // 	    'onclick="tsapp.chooseLinkBound(\'' + type + "'," + i + ')">';

    // 	content += link_label;
    // 	content += '</span>';
	
    // 	return content;
    // }

    // function updateLinkBtn ( type, i, link_record )
    // {
    // 	var link_elt = myGetElement(type + '_bound_' + i);
    // 	var link_label;
	
    // 	if ( type == "base" )
    // 	    bounds_edit.values[i].bid = link_record.oid;
	
    // 	else if ( type == "range" )
    // 	    bounds_edit.values[i].tid = link_record.oid;
	
    // 	else if ( type == "color" )
    // 	    bounds_edit.values[i].cid = link_record.oid;
	
    // 	if ( link_elt )
    // 	{
    // 	    if ( type == 'top' )
    // 		link_label = link_record.top_label || link_record.oid;

    // 	    else
    // 		link_label = link_record.inm || 'unknown';
	    
    // 	    if ( link_record.age == "0" )
    // 		link_label = 'Present';

    // 	    else if ( link_label == "" )
    // 		link_label = link_record.oid;

    // 	    if ( link_record.sid > 5 && link_record.sid != bounds_edit.values[i].sid )
    // 	    {
    // 		var link_tsrecord = api_data.timescales_id[link_record.sid];
    // 		link_label += ' [' + link_tsrecord.nam + ']';
    // 	    }
	    
    // 	    link_elt.innerHTML = link_label;
    // 	}
    // }
    
    // function setBoundType ( i, bound_type )
    // {
    // 	var new_bound_type = bound_type || getElementValue('bound_type_' + i);
    // 	var age_element = myGetElement('bound_age_' + i);
    // 	var err_element = myGetElement('bound_age_err_' + i);
    // 	var reftd_element = myGetElement('bound_reftd_' + i);
	
    // 	bounds_edit.values[i].btp = new_bound_type;
	
    // 	if ( bound_type )
    // 	    setElementValue('bound_type_' + i, bound_type);
	
    // 	// var base_element = document.getElementById('base_bound_' + i);
    // 	// var range_element = document.getElementById('range_bound_' + i);
	
    // 	if ( new_bound_type == 'absolute' || new_bound_type == 'spike' )
    // 	{
    // 	    age_element.disabled = 0;
    // 	    err_element.disabled = 0;
    // 	    reftd_element.innerHTML = '';
    // 	}
	
    // 	else
    // 	{
    // 	    age_element.disabled = 1;
    // 	    err_element.disabled = 1;
    // 	    reftd_element.innerHTML = boundsBaseContent(i, bounds_edit.values[i]);
	    
    // 	    // if ( base_element ) base_element.style.display = '';
    // 	    // if ( new_bound_type == 'percent' && range_element ) range_element.style.display = '';
    // 	}
    // }
    
    // this.setBoundType = setBoundType;
    
    // function setBoundBase ( i, selector, bound_id )
    // {
    // 	if ( selector == 'base' )
    // 	    bounds_edit.values[i].bid = bound_id;
	
    // 	else if ( selector == 'range' || selector == 'top' )
    // 	    bounds_edit.values[i].tid = bound_id;
	
    // 	else
    // 	{
    // 	    console.log("ERROR: bad selector'" + selector + "'");
    // 	    return;
    // 	}
	
    // 	var reftd_element = myGetElement('bound_reftd_' + i);
    // 	reftd_element.innerHTML = boundsBaseContent(i, bounds_edit.values[i]);
    // }
    
    // this.setBoundBase = setBoundBase;
    
    // function setBoundHilight ( i, selector )
    // {
    // 	$('#bound_row_'+i).removeClass('tsed_model_match tsed_model_close tsed_model_computed');

    // 	if ( selector == 'match' || selector == 'close' || selector == 'computed' )
    // 	    $('#bound_row_'+i).addClass('tsed_model_'+selector);
    // }
    
    // this.setBoundHilight = setBoundHilight;
    
    // function callbackBaseBounds ( records )
    // {
    // 	if ( ! records || ! records.length )
    // 	{
    // 	    window.alert('ERROR: no records returned for base bounds query');
    // 	}    
	
    // 	// Go through the records and save the content under 'api_data'.
	
    // 	for ( var i=0; i < records.length; i++ )
    // 	{
    // 	    var oid = records[i].oid;
    // 	    api_data.bounds_id[oid] = records[i];
    // 	}
	
    // 	// Then update the bounds entry form.
	
    // 	for ( var i=0; i < bounds_edit.n_bounds; i++ )
    // 	{
    // 	    var bound_id = getElementValue('bound_id_' + i);
    // 	    if ( bound_id && api_data.bounds_id[bound_id] ) updateBoundsFormTimescale(i, bound_id);
    // 	}
    // }
    
    // function resetBoundsForm ( )
    // {
    // 	// Update the form contents row by row from the API data.
	
    // 	for ( var i=0; i < bounds_edit.n_bounds; i++ )
    // 	{
    // 	    resetBoundsFormRow(i, hard_reset );
    // 	}
    // }

    // this.resetBoundsForm = resetBoundsForm;
    
    // function resetBoundsFormRow ( i, hard_reset )
    // {
    // 	var age_elt = myGetElement('bound_age_' + i);
    // 	var btp_elt = myGetElement('bound_type_' + i);
    // 	// var bts_elt = myGetElement('bound_base_ts_' + i);
	
    // 	var bound_id = getElementValue('bound_id_' + i);
    // 	var bound_age = api_data.bounds_id[bound_id].age;
    // 	var bound_type = api_data.bounds_id[bound_id].btp;
	
    // 	if ( age_elt ) age_elt.value = bound_age;
    // 	if ( btp_elt ) btp_elt.selected_index = 0;
    // 	updateBoundsFormTimescale(i, bound_id);
    // }

    // function updateBoundsFormTimescale ( i, bound_id )
    // {
    // 	var bts_elt = document.getElementById('base_bound_' + i);
    // 	var base_id = api_data.bounds_id[bound_id].bid;
    // 	var base_timescale_name = '';

    // 	if ( base_id )
    // 	{
    // 	    var base_timescale_id = api_data.bounds_id[base_id].sid;
    // 	    if ( base_timescale_id ) base_timescale_name = api_data.timescales_id[base_timescale_id].nam;
    // 	    else base_timescale_name = 'ERROR';

    // 	    var base_interval_name = api_data.bounds_id[base_id].inm || 'Top';
    // 	    base_timescale_name = base_interval_name + ' (' + base_timescale_name + ')';
    // 	}
	
    // 	if ( bts_elt ) bts_elt.innerHTML = base_timescale_name;
    // }

    // function saveBoundsForm ( )
    // {
    // 	// Go through the form contents row by row and, if any field has changed, construct a
    // 	// record to send to the server.
	
    // 	var change_records = [ ];
	
    // 	for ( var i=0; i < bounds_edit.n_bounds; i++ )
    // 	{
    // 	    var r = generateRowChangeRecord(i);
    // 	    if ( r ) change_records.push(r);
    // 	}

    // 	var update_data = JSON.stringify(change_records);
    // 	console.log("JSON: " + update_data);
	
    // 	var conditions = '';
	
    // 	if ( change_records.length > 0 )
    // 	{
    // 	    // $.post(data_url + 'bounds/addupdate.json?allow=' + conditions, update_data)

    // 	    $.ajax({
    // 		url: data_url + 'bounds/addupdate.json?allow=' + conditions,
    // 		type: 'PUT',
    // 		data: update_data,
    // 		contentType: 'application/json; charset=utf-8',
    // 		dataType: 'json' })
    // 	    	.done(function ( response ) { displayBoundsListResult(bounds_box, intervals_box,
    // 								      edit_timescale_id, response.records) })
    // 	    	.fail(failSaveBounds);
	    
    // 	}
	
    // 	else alert("No changes to save.");
    // }
    
    // this.saveBoundsForm = saveBoundsForm;
    
    // function callbackSaveBounds ( response )
    // {
    // 	if ( response.records )
    // 	    bounds_box.innerHTML = generateBoundsFormContent( timescale_id, response.records );
	
    // 	else
    // 	    bounds_box.innerHTML = "ERROR: no records";
    // }
    
    // function failSaveBounds ( xhr )
    // {
    // 	var error_list = xhr.responseJSON.errors;

    // 	if ( error_list && Array.isArray(error_list) )
    // 	{
    // 	    for ( var i=0; i<error_list.length; i++ )
    // 	    {
    // 		alert(error_list[i]);
    // 	    }
    // 	}
	
    // 	else
    // 	{
    // 	    var message = xhr.status + " " + xhr.statusText;
    // 	    alert(message);
    // 	}
    // }
    
    // function generateRowChangeRecord ( i )
    // {
    // 	// If row i has changed, return a change record. Otherwise, return nothing.

    // 	var cr = { };
	
    // 	var bound_id = getElementValue('bound_id_' + i);
	
    // 	var new_age = getElementValue('bound_age_' + i);
    // 	var old_age = api_data.bounds_id[bound_id].age;

    // 	var new_error = getElementValue('bound_age_err_' + i);
    // 	var old_error = api_data.bounds_id[bound_id].ger || '';
	
    // 	var new_type = getElementValue('bound_type_' + i);
    // 	var old_type = api_data.bounds_id[bound_id].btp;
	
    // 	if ( old_type != undefined && new_type != undefined && old_type != new_type )
    // 	{
    // 	    cr.bound_id = bound_id;
    // 	    cr.bound_type = new_type;
    // 	}
	
    // 	if ( new_age != undefined && (old_age == undefined || String(new_age) != String(old_age) ) )
    // 	{
    // 	    cr.bound_id = bound_id;
    // 	    cr.age = new_age;
    // 	}
	
    // 	if ( new_error != undefined && (old_error == undefined || String(new_error) != String(old_error) ) )
    // 	{
    // 	    cr.bound_id = bound_id;
    // 	    cr.age_error = new_error;
    // 	}
	
    // 	if ( cr.bound_id != undefined ) return cr;
    // 	return undefined;
    // }

    // function chooseLinkBound ( which, i )
    // {
    // 	var current_bound_id;
    // 	var current_timescale_id;
	
    // 	if ( which == 'base' )
    // 	    current_bound_id = bounds_edit.values[i].bid;
    // 	else if (which == 'range' )
    // 	    current_bound_id = bounds_edit.values[i].tid;
    // 	else if ( which == 'color' )
    // 	    current_bound_id = bounds_edit.values[i].cid;
    // 	else if ( which == 'top' )
    // 	    current_bound_id = bounds_edit.values[i].uid;
    // 	else
    // 	    return;
	
    // 	if ( current_bound_id )
    // 	    current_timescale_id = api_data.bounds_id[current_bound_id].sid;
	
    // 	else
    // 	    current_timescale_id = bounds_edit.source_timescale_id || 1;
	
    // 	if ( which == 'base' || which == 'range' )
    // 	{
    // 	    openBoundSelector( current_timescale_id, current_bound_id, function (record) {
    // 		updateLinkBtn(which, i, record) } );
    // 	}

    // 	else if ( which == 'top' )
    // 	{
    // 	    openTopSelector( current_bound_id, function(record) {
    // 		updateLinkBtn('top', i, record) } );
    // 	}
    // }
    
    // this.chooseLinkBound = chooseLinkBound;

    // function openBoundSelector ( current_timescale_id, current_bound_id, callback )
    // {
    // 	var modal_elt = myGetElement("bound_selector");

    // 	if ( modal_elt )
    // 	{
    // 	    modal_elt.style.display = "block";
	    
    // 	    appstate.bound_selector.choice_callback = callback;
    // 	    appstate.bound_selector.close_callback = closeBoundSelector;
	    
    // 	    setBoundSelector(current_timescale_id, current_bound_id);
    // 	}
    // }

    // function closeBoundSelector ( )
    // {
    // 	appstate.bound_selector.choice_callback = undefined;
    // }
    
    // function setBoundSelector ( timescale_id, bound_id )
    // {
    // 	bound_selector.timescale_id = timescale_id;
    // 	bound_selector.selected_id = bound_id;
    // 	bound_selector.values = [ ];
	
    // 	$("#bound_selector_timescales td").each(function () {
    // 	    if ( this.title == timescale_id ) $(this).addClass("tsed_highlight");
    // 	    else $(this).removeClass("tsed_highlight");
    // 	});
	
    // 	bound_selector_bounds_box.innerHTML = "loading...";
	
    // 	$.getJSON(data_url + 'timescales/bounds.json?timescale_id=' + timescale_id)
    // 	    .done(function ( response ) { boundSelectorGenerateBoundsList(bound_id, response.records) })
    // 	    .fail(function ( xhr ) { display_element.innerHTML = "ERROR: could not load bounds"; failSaveBounds(xhr); });
    // }
    
    function modalChoice ( id, value, type )
    {
    	if ( appstate[id] && appstate[id].choice_callback )
    	    appstate[id].choice_callback(value, type);
	
    	else
    	    console.log("ERROR: no appstate '" + id + "' or no choice_callback");
    }

    this.modalChoice = modalChoice;
    
    function modalClose ( id )
    {
    	var modal_elt = myGetElement(id);

    	if ( modal_elt ) modal_elt.style.display = "none";

    	if ( appstate[id] && appstate[id].close_callback )
    	    appstate[id].close_callback();
    }
    
    this.modalClose = modalClose;

    // // function boundSelectorSelectBound ( bound_id )
    // // {
    // // 	$("#bound_selector_timescales td").each(function () {
    // // 	    if ( this.title == bound_id ) $(this).addClass("tsed_highlight");
    // // 	    else $(this).removeClass("tsed_highlight");
    // // 	});
    // // }
    
    // function boundSelectorGenerateBoundsList ( select_bound_id, records )
    // {
    // 	var content = "";
    // 	var selected_index;

    // 	if ( records.length == 0 ) return;
	
    // 	for ( var i=0; i < records.length; i++ )
    // 	{
    // 	    content += generateBoundSelectorRow(i, records[i]);

    // 	    if ( records[i].oid == select_bound_id ) selected_index = i;
    // 	}
	
    // 	bound_selector_bounds_box.innerHTML = content;
	
    // 	bound_selector.selected_index = selected_index;
	
    // 	var selected_elt = myGetElement("bound_select_" + selected_index);

    // 	if ( selected_elt )
    // 	{
    // 	    $(selected_elt).addClass("tsed_highlight");
    // 	    selected_elt.scrollIntoView(false);
    // 	}
    // }

    // function generateBoundSelectorRow ( i, record )
    // {
    // 	bound_selector.values[i] = record;
	
    // 	// var class_str = record.oid == select_bound_id ? 'tsed_highlight' : '';
    // 	var content = '<tr><td id="bound_select_' + i + '" title="' + record.oid + '" onclick="tsapp.boundSelectorPickBound(' + i + ')">';
	
    // 	var age = record.age != undefined ? record.age : '(undefined)';
    // 	if ( record.ger != undefined ) age += '&nbsp;&plusmn;&nbsp;' + record.ger;
	
    // 	var interval = record.inm || 'Top';
    // 	var type = record.btp || '(undefined)';
	
    // 	content += '<span class="tsed_control">' + interval + '<br/>&nbsp;&nbsp;&nbsp;' + age + '&nbsp;-&nbsp;' + type + '</span>';
    // 	content += "</td></tr>\n";
	
    // 	return content;
    // }

    // function boundSelectorPickBound ( i )
    // {
    // 	// alert("selected bound " + i);
    // 	var select_id = "bound_select_" + i;
	
    // 	$("#bound_selector_bounds td").each(function () {
    // 	    if ( this.id == select_id ) $(this).addClass("tsed_highlight");
    // 	    else $(this).removeClass("tsed_highlight");
    // 	});

    // 	if ( bound_selector.selected_index == i && bound_selector.callback )
    // 	{
    // 	    bound_selector.callback(bound_selector.values[i]);
    // 	    closeBoundSelector();
    // 	}
	
    // 	bound_selector.selected_index = i;
    // }

    // this.boundSelectorPickBound = boundSelectorPickBound;
    
    // // The following code is used for modeling a set of absolute bounds based on the
    // // international boundary ages with percentages. We go through all of the bounds in the
    // // current timescale and attempt to either (a) match them to international bounds, or (b)
    // // express them as a percentage of the difference between two international bounds.
    
    // function modelBoundsForm ( event )
    // {
    // 	// Do nothing unless we actually have a timescale loaded into the bounds form.
	
    // 	if ( ! bounds_edit.n_bounds ) return;

    // 	// If the shift key was held down while invoking this function, ask for parameters and
    // 	// store them in the appropriate variables for this and subsequent runs.
	
    // 	if ( event.shiftKey == 1 )
    // 	{
    // 	    var ma_answer = window.prompt("Age difference threshold in Ma?", model_match_diff);
    // 	    model_match_diff = Number(ma_answer);

    // 	    var frac_answer = window.prompt("Age difference threshold as a fraction?", model_match_frac);
    // 	    model_match_frac = Number(frac_answer);
    // 	}
	
    // 	// Go through the bounds and match as many as possible to international boundary ages.
	
    // 	for ( var i=0; i < bounds_edit.n_bounds; i++ )
    // 	{
    // 	    var btp = bounds_edit.values[i].btp;
    // 	    var age = Number(getElementValue('bound_age_' + i));
    // 	    var last_diff;
	    
    // 	    // Store the initial ages of all the bounds, if they have not already been stored by a
    // 	    // prior execution of this function.
	    
    // 	    if ( bounds_edit.values[i].orig_age == undefined )
    // 	    {
    // 		bounds_edit.values[i].orig_age = age;
    // 	    }
	    
    // 	    // Any bound that was changed by the user to type 'percent' will be set in the next
    // 	    // loop below.
	    
    // 	    if ( btp == 'percent' && bounds_edit.values[i].modeled_type != 'percent' )
    // 	    {
    // 		// Do nothing in this loop.
    // 	    }
	    
    // 	    // Any bound that is not already matched to a boundary from one of the international
    // 	    // timescales should be examined to see if it matches according to the parameters
    // 	    // for this run. But skip any bound with an age of 0.
	    
    // 	    else if ( btp != 'same' && age != 0 )
    // 	    {
    // 		// Scan through the list of international ages to see if one of them comes close
    // 		// enough for a match.
		
    // 		// There are two match parameters, and a candidate age must fall within both of them:
    // 		// - model_match_diff specifies a maximum allowable difference in Ma, defaulting
    // 		//   to 0.2
    // 		// - model_match_frac specifies a maximum difference as a fraction of the age,
    // 		//   defaulting to 0.05. This prevents bad matches among recent ages.
		
    // 		for ( var j in api_data.ics_ages )
    // 		{
    // 		    var a = Number(api_data.ics_ages[j]);
    // 		    var r = api_data.ics_best[api_data.ics_ages[j]];
		    
    // 		    var diff = Math.abs(age-a);
		    
    // 		    // If an age matches exactly, set it to point to the corresponding international
    // 		    // bound record and we are done.
		    
    // 		    if ( a == age )
    // 		    {
    // 			delete bounds_edit.values[i].age_diff;
    // 			bounds_edit.values[i].modeled_type = 'same';
    // 			setBoundType(i, 'same');
    // 			setBoundBase(i, 'base', r.oid);
    // 			setBoundHilight(i, 'match');
    // 			break;
    // 		    }
		    
    // 		    // If an age matches approximately, within the parameters being sued for this run,
    // 		    // then likewise set it to point to the corresponding international bound
    // 		    // record. But continue to scan, for we may get a better match with a
    // 		    // subsequent age.
		    
    // 		    else if ( diff < model_match_diff && diff < model_match_frac * age )
    // 		    {
    // 			if ( ! last_diff || diff < last_diff )
    // 			{
    // 			    bounds_edit.values[i].age_diff = age - a;
    // 			    bounds_edit.values[i].modeled_type = 'same';
    // 			    setBoundType(i, 'same');
    // 			    setBoundBase(i, 'base', r.oid);
    // 			    setBoundHilight(i, 'close');
    // 			}
    // 		    }
		    
    // 		    // If we have passed beyond a possible match, we can stop.
		    
    // 		    else if ( a > age + model_match_diff )
    // 		    {
    // 			break;
    // 		    }
    // 		}
    // 	    }
	    
    // 	    // If this boundary was matched to an international age on a previous run, and the new
    // 	    // bounds have not yet been saved, then check to make sure it still matches under the
    // 	    // current parameters. If it no longer does, then return it to a 'percent'
    // 	    // boundary. The offset value will be adjsted and the table cell updated in the loop
    // 	    // below.
	    
    // 	    else if ( btp == 'same' && bounds_edit.values[i].age_diff )
    // 	    {
    // 		var diff = bounds_edit.values[i].age_diff;
		
    // 		if ( diff > model_match_diff || diff > model_match_frac * age )
    // 		{
    // 		    bounds_edit.values[i].btp = 'percent';
    // 		}
    // 	    }
    // 	}
	
    // 	// Now go through the bounds again. For any 'absolute' or 'percent' bounds, record which
    // 	// is the nearest internationally anchored bound in this timescale, both above and
    // 	// below. These will then be used as the base and range for this bound when it is
    // 	// converted to percent.
	
    // 	var top_anchor;
    // 	var bottom_anchor;
	
    // 	for ( var i=0; i < bounds_edit.n_bounds; i++ )
    // 	{
    // 	    var btp = bounds_edit.values[i].btp;
    // 	    var mtp = bounds_edit.values[i].modeled_type;
    // 	    var age = bounds_edit.values[i].orig_age;
	    
    // 	    // $$$
	    
    // 	    if ( btp == 'same' || age == 0 || btp == 'absolute' && mtp && mtp != 'absolute' )
    // 	    {
    // 		top_anchor = i;
    // 	    }
	    
    // 	    else
    // 	    {
    // 		bounds_edit.values[i].top_anchor = top_anchor;
    // 	    }
    // 	}
	
    // 	for ( var i=bounds_edit.n_bounds - 1; i > 0; i-- )
    // 	{
    // 	    var btp = bounds_edit.values[i].btp;
    // 	    var mtp = bounds_edit.values[i].modeled_type;
	    
    // 	    if ( btp == 'same' || btp == 'absolute' && mtp && mtp != 'absolute' )
    // 	    {
    // 		bottom_anchor = i;
    // 	    }
	    
    // 	    else if ( top_anchor != undefined && bottom_anchor != undefined )
    // 	    {
    // 		bounds_edit.values[i].bottom_anchor = bottom_anchor;
		
    // 		var this_top = bounds_edit.values[i].top_anchor;
    // 		var this_bottom = bounds_edit.values[i].bottom_anchor;
    // 		var this_age = bounds_edit.values[i].orig_age;
    // 		var top_age = bounds_edit.values[this_top].orig_age;
    // 		var bottom_age = bounds_edit.values[this_bottom].orig_age;
    // 		var top_oid = bounds_edit.values[this_top].bid;
    // 		var bottom_oid = bounds_edit.values[this_bottom].bid;
		
    // 		var percent = 100 * (bottom_age - this_age) / (bottom_age - top_age);
    // 		percent = Math.round(percent * 10) / 10;
		
    // 		setBoundBase(i, 'base', bottom_oid);
    // 		setBoundBase(i, 'top', top_oid);
    // 		setBoundType(i, 'percent');
    // 		setElementValue('bound_percent_' + i, percent);
    // 		bounds_edit.values[i].pct_value = percent;
    // 		setBoundHilight(i, 'computed');
    // 	    }
    // 	}
    // }
    
    // this.modelBoundsForm = modelBoundsForm;
    
    // function printBounds ( )
    // {
    // 	for ( var i in api_data.ics_ages )
    // 	{
    // 	    var age = api_data.ics_ages[i];
	    
    // 	    if ( ! api_data.ics_best[age] )
    // 	    {
    // 		console.log(age + ': none');
    // 		continue;
    // 	    }
	    
    // 	    var name = api_data.ics_best[age].inm;
    // 	    var scale = api_data.ics_best[age].scale_no;
	    
    // 	    console.log(age + ': ' + name + ' (' + scale + ')');
    // 	}	
    // }
    
    // this.printBounds = printBounds;

}

