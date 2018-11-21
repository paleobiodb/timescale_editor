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
    
    var pane_group = { 'ts_attrs_pane': 1, 'bounds_pane': 1,
		       'edit_attrs': 2, 'edit_bounds' : 2 };
    
    var init_box;
    var timescales_box;
    var bounds_box;
    var ts_attrs_box;
    var bound_selector_bounds_box;
    
    var edit_timescale_id;
    var edit_timescale_attrs;
    
    var edit_bounds_attrs;
    
    var base_timescale_id;
    var base_bound_id;
    
    var bound_selector_box;

    var modal_state = { timescale_selector: { },
			bound_selector: { } };
    
    var international_no = { 'tsc:1': 1, 'tsc:2': 2, 'tsc:3': 3,
			     'tsc:4': 4, 'tsc:5' : 5 };
    
    var form_elt = { };
    
    var bounds_edit = { };
    
    var hi_color = 'lightblue';
    
    var model_match_diff = 2.0;
    var model_match_frac = 0.05;
    
    var done_config1, done_config2;
    
    // Objects for holding data cached from the API
    
    var api_data = { };
    
    // The following function initializes this application controller object.  It is exported as
    // a method, so that it can be called once the web page is fully loaded.  It must make two
    // API calls to get a list of country and continent codes, and geological time intervals.
    // When both of these calls complete, the "initializing form..." HTML floating element is hidden,
    // signaling to the user that the application is ready for use.
    
    function initApp ()
    {
	// Do various initialization steps
	
	timescales_pane = myGetElement("timescales_pane");
	
	if ( ! timescales_pane )
	    return badInit();
	
	selectPane('ts_attrs_pane', 'edit_attrs');
	
	init_box = myGetElement("db_initmsg");
	timescales_box = myGetElement("timescales_box");
	bounds_box = myGetElement("bounds_box");
	bound_selector_box = myGetElement("bound_selector");
	bound_selector_bounds_box = myGetElement("bound_selector_bounds")
	
	if ( !init_box || ! timescales_box || ! bounds_box )
	    return badInit();
 	
	// initialize some form elements
	
	form_elt.btps = [ 'absolute', 'spike', 'same', 'fraction' ];
	form_elt.btpnames = [ 'absolute', 'spike', 'same as', 'fraction' ];
	
	// Initialize some of the interface elements.
	
	var content;
	
	content = makeOptionList( [ '', '--',
				    'eon', 'eons', 'era','eras', 'period', 'periods',
				    'epoch','epochs', 'stage', 'stages', 'substage', 'substages',
				    'zone', 'zones', 'multi', 'multiple', 'other', 'other' ] );
	
	setInnerHTML("ts_type", content);
	
	// Initiate an API call to fetch necessary data.  This has a callback to handle the data
	// that comes back, and a failure callback too.
	
	$.getJSON(data_url + 'timescales/list.json?all_records&show=desc')
	    .done(callbackListTimescales)
	    .fail(badInit);
	
	$.getJSON(data_url + 'timescales/bounds.json?timescale_id=tsc:1,tsc:2,tsc:3,tsc:4,tsc:5')
	    .done(callbackListBounds)
	    .fail(badInit);
    }
    
    this.initApp = initApp;
    
    function callbackListTimescales (response)
    {
	// If no results were received, we're in trouble.  The application can't be used if the
	// API is not working, so there's no point in proceeding further.
	
	if ( ! response.records )
	    badInit();
	
	// Otherwise, store all of the response records in the appropriate array.
	
	api_data.timescales = [ ];
	api_data.timescales_id = { };
	
	for ( var i=0; i < response.records.length; i++ )
	{
	    var record = response.records[i];
	    
	    api_data.timescales.push(record);
	    api_data.timescales_id[record.oid] = record;
	}
	
	// If both API calls are complete, finish the initialization process. 
	
	done_config1 = 1;
	if ( done_config2 ) finishInitApp();
	
	refreshTimescales("timescale_selector_timescales", "timescale_selector");
	refreshTimescales("bound_selector_timescales", "bound_selector");
    }
    
    function callbackListBounds (response)
    {
	// If no results were received, we're in trouble.  The application can't be used if the
	// API is not working, so there's no point in proceeding further.
	
	if ( ! response.records )
	    badInit();
	
	// Otherwise, store all of the response records in the appropriate array.
	
	api_data.bounds_timescale_id = { };
	api_data.bounds_id = { };
	api_data.ics_by_age = { };
	api_data.ics_ages = [ ];
	api_data.ics_best = { };
	api_data.bounds_dep = { };
	
	for ( var i=0; i < response.records.length; i++ )
	{
	    var record = response.records[i];
	    var age = record.age;
	    var scale_no = international_no[record.sid];
	    
	    // Store each bounds record in all of the appropriate arrays.
	    
	    record.scale_no = scale_no;
	    
	    if ( ! api_data.bounds_timescale_id[record.sid] )
		api_data.bounds_timescale_id[record.sid] = [ ];
	    
	    api_data.bounds_timescale_id[record.sid].push(record);
	    
	    api_data.bounds_id[record.oid] = record;
	    
	    // Fill in any dependencies.
	    
	    if ( record.bid )
	    {
		if ( ! api_data.bounds_dep[record.bid] ) api_data.bounds_dep[record.bid] = { };
		api_data.bounds_dep[record.bid][record.oid] = 1;
	    }
	    
	    if ( record.tid )
	    {
		if ( ! api_data.bounds_dep[record.tid] ) api_data.bounds_dep[record.tid] = { };
		api_data.bounds_dep[record.tid][record.oid] = 1;
	    }
	    
	    if ( record.uid )
	    {
		if ( ! api_data.bounds_dep[record.cid] ) api_data.bounds_dep[record.uid] = { };
		api_data.bounds_dep[record.uid][record.oid] = 1;
	    }
	    
	    if ( record.cid )
	    {
		if ( ! api_data.bounds_dep[record.rid] ) api_data.bounds_dep[record.cid] = { };
		api_data.bounds_dep[record.cid][record.oid] = 1;
	    }
	    
	    // Now fill in the best record for each distinct age in the ICS timescales.
	    
	    if ( ! api_data.ics_by_age[age] )
	    {
		api_data.ics_ages.push(age);
		api_data.ics_by_age[age] = [ ];
	    }
	    
	    api_data.ics_by_age[age].push(record);
	    
	    if ( age <= 70.0 && scale_no )
	    {
		if ( scale_no == 4 )
		    api_data.ics_best[age] = record;
		
		else if ( scale_no == 5 && ! api_data.ics_best[age] )
		    api_data.ics_best[age] = record;
	    }
	    
	    else if ( scale_no )
	    {
		if ( scale_no == 3 )
		    api_data.ics_best[age] = record;
		
		else if ( scale_no > 3 && ! api_data.ics_best[age] )
		    api_data.ics_best[age] = record;
		    
		else if ( scale_no > 3 && scale_no < api_data.ics_best[age].scale_no )
		    api_data.ics_best[age] = record;
		
		else if ( ! api_data.ics_best[age] || scale_no > api_data.ics_best[age].scale_no )
		    api_data.ics_best[age] = record;
	    }
	}
	
	// Sort the list of ICS ages.
	
	api_data.ics_ages.sort( function(a, b) { return a - b; } );
	
	for ( var a in api_data.ics_by_age ) 
	{
	    api_data.ics_by_age[a].sort( function(a, b) { return a.scale_no - b.scale_no } );
	}
	
	// If both API calls are complete, finish the initialization process. 
	
	done_config1 = 2;
	if ( done_config1 ) finishInitApp();
    }
    
    // This function notifies the user that this application is not able to be used.  It is called
    // if either of the configuration API calls fail.  If the API is not working, there's no point
    // in proceeding with this application.
    
    function badInit ( )
    {
	if ( init_box ) init_box.innerHTML = "<span>Initialization failed!<br>Please contact admin@paleobiodb.org</span>";
    }
    
    // This function is called when the configuration API calls are complete.  It hides the
    // "initializing form, please wait" HTML floating object, and then calls updateFormState to
    // initialize the various form elements.
    
    function finishInitApp ()
    {
	// // initFormContents();
	
	init_box.style.display = 'none';
	
	// clear timescale attrs form
	
	setElementValue('ts_name', '');
	setElementValue('ts_id', '');
	setElementValue('ts_min_age', '');
	setElementValue('ts_max_age', '');
	setElementValue('ts_extent', '');
	setElementValue('ts_taxon', '');
    }
    
    this.api_data = api_data;
    
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
    
    function refreshTimescales ( element_id, modal_id )
    {
	var element = myGetElement(element_id);
	
	if ( ! element )
	{
	    alert("Could not find HTML element '" + element_id + "'");
	    return;
	}
	
	var internationals = [ ];
	var actives = [ ];
	var others = [ ];
	
	for ( var i=0; i < api_data.timescales.length; i++ )
	{
	    var record = api_data.timescales[i];
	    
	    if ( ! record.oid ) continue;
	    
	    record.tno = Number(record.oid.replace(/^tsc:/, ''));
	    
	    if ( record.tno >= 1 && record.tno <= 5 )
		internationals.push(record);
	    else if ( record.act )
		actives.push(record);
	    else
		others.push(record);
	}
	
	internationals.sort( function(a, b) { return a.tno - b.tno } );
	actives.sort( function(a, b) { return a.nam && b.nam ? a.nam.localeCompare(b.nam)
					   : a.nam ? a.nam : b.nam; } );
	others.sort( function(a, b) { return a.nam && b.nam ? a.nam.localeCompare(b.nam)
					   : a.nam ? a.nam : b.nam; } );

	var selector_expr = "tsapp.modalChoice('" + modal_id + "', record.oid)";
	var content = "";
	
	for ( var i=0; i < internationals.length; i++ )
	    content += generateTableLine(internationals[i], selector_expr);
	
	for ( var i=0; i < actives.length; i++ )
	    content += generateTableLine(actives[i], selector_expr);
	
	for ( var i=0; i < others.length; i++ )
	    content += generateTableLine(others[i], selector_expr);
	
	element.innerHTML = content;
    }
    
    function generateTableLine ( record, onclick_expr )
    {
	return "<tr><td title=\"" + record.oid + "\" onclick=\"" + onclick_expr + "\">" + record.nam + "</td></tr>\n";
    }
    
    function selectTimescale ( timescale_id )
    {
	edit_timescale_id = timescale_id;
	
	highlightTimescale(timescale_id);
	
	displayBoundsList(bounds_box, edit_timescale_id);
	displayTimescaleAttrs(edit_timescale_id);
    }
    
    this.selectTimescale = selectTimescale;
    
    function highlightTimescale ( timescale_id )
    {
	$("#timescales_box td").each(function () {
	    if ( this.title == timescale_id ) $(this).addClass("tsed_highlight");
	    else $(this).removeClass("tsed_highlight");
	});
    }
    
    function displayBoundsList ( display_element, timescale_id )
    {
	display_element.innerHTML = "<tr><td>loading...</td></tr>";

	var records = api_data.bounds_timescale_id[timescale_id];
	
	if ( records && records.length > 0 )
	{
	    display_element.innerHTML = generateBoundsFormContent( timescale_id, records );
	}

	else
	{
	    $.getJSON(data_url + 'timescales/bounds.json?timescale_id=' + timescale_id)
		.done(function ( response ) { displayBoundsListResult(display_element, timescale_id, response.records) })
		.fail(function ( xhr ) { display_element.innerHTML = "ERROR: could not load bounds"; failSaveBounds(xhr); });
	}
    }
    
    this.displayBoundsList = displayBoundsList;
    
    function displayBoundsListResult ( display_element, timescale_id, records )
    {
	if ( records )
	{
	    api_data.bounds_timescale_id[timescale_id] = records;
	    updateBoundsData(records);
	    
	    display_element.innerHTML = generateBoundsFormContent( timescale_id, records );
	}
	else
	{
	    display_element.innerHTML = "<td><tr>ERROR: no records</td></tr>";
	}
    }

    function updateBoundsData ( records )
    {
	// Update each bounds record under bounds_id
	
	for ( var i=0; i < records.length; i++ )
	{
	    api_data.bounds_id[records[i].oid] = records[i];
	}
	
	// Then go through the list again and check to see if any of the bounds this one depends
	// on are not yet loaded. If so, then load them.
	
	var to_load = { };
	
	for ( var i=0; i < records.length; i++ )
	{
	    if ( records[i].bid && ! api_data.bounds_id[records[i].bid] )
		to_load[records[i].bid] = 1;
	    
	    if ( records[i].tid && ! api_data.bounds_id[records[i].tid] )
		to_load[records[i].tid] = 1;
	    
	    if ( records[i].cid && ! api_data.bounds_id[records[i].cid] )
		to_load[records[i].tid] = 1;
	    
	    if ( records[i].fid && ! api_data.bounds_id[records[i].fid] )
		to_load[records[i].fid] = 1;
	}
	
	var load_list = [ ];
	
	for ( var id in to_load )
	{
	    load_list.push(id);
	}
	
	if ( load_list.length )
	{
	    var id_list = load_list.join(',');
	    
	    alert("Need to load following ids: " + id_list);
	}
    }
    
    function generateBoundsFormContent ( timescale_id, records )
    {
	// First go through the records and save the content under the application variable
	// 'bounds_edit'. This is a singular variable, which means we can only be editing one set
	// of bounds at once. In the process, determine which bounds are referenced as interval
	// top by any bound other than the immediately following one. Also keep track of any base
	// bounds, range bounds, and color bounds from other timescales so that we can query for
	// them if necessary.
	
	bounds_edit.n_bounds = records.length;
	bounds_edit.values = [ ];
	bounds_edit.lookup = { };
	bounds_edit.labels = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
	bounds_edit.next_label = 0;

	bounds_edit.source_timescale_id = api_data.timescales_id[timescale_id].source_timescale_id || 1;
	
	var base_bounds = [ ];
	
	for ( var i=0; i < records.length; i++ )
	{
	    var oid = records[i].oid;
	    
	    var top_oid = records[i].uid;
	    var base_oid = records[i].bid;
	    var range_oid = records[i].tid;
	    var color_oid = records[i].cid;
	    
	    bounds_edit.values[i] = { oid: oid, inm: records[i].inm, btp: records[i].btp,
				      age: records[i].age, ger: records[i].ger,
				      frc: records[i].frc, spk: records[i].spk,
				      bid: base_oid, tid: range_oid, uid: top_oid, cid: color_oid };
	    
	    if ( base_oid && ! api_data.bounds_id[base_oid] ) base_bounds.push(base_oid);
	    if ( range_oid && ! api_data.bounds_id[range_oid] ) base_bounds.push(top_oid);
	    if ( color_oid && ! api_data.bounds_id[color_oid] ) base_bounds.push(color_oid);

	   bounds_edit.lookup[oid] = i;
	}
	
	// If we have found any base bounds, fire off a query to get their info as well. Once the
	// query returns, we can update the form contents.
	
	if ( base_bounds.length > 0 )
	{
	    var bounds_str = base_bounds.join(',');
	    
	    $.getJSON(data_url + 'timescales/bounds.json?bound_id=' + bounds_str)
		.done(function ( response ) { callbackBaseBounds( response.records ) })
		.fail(function ( ) { window.alert('ERROR: could not query base bounds') });
	}
	
	// Go through the bounds again and figure out which bounds (if any) are referenced as interval
	// top by any bound except the immediately following one. Mark these with the extended_top flag.
	
	for ( var i=1; i < bounds_edit.values.length; i++ )
	{
	    var top_oid = bounds_edit.values[i].uid;
	    var top_index = bounds_edit.lookup[top_oid];
	    
	    if ( top_index && top_index != i-1 && ! bounds_edit.values[top_index].top_label )
	    {
		var letter = bounds_edit.next_label % 26;
		var mult = (bounds_edit.next_label + 1) / 26;
		var new_label = '';
		
		for ( var i = 0; i < mult; i++ )
		{
		    new_label += bounds_edit.labels.charAt(letter);
		}
		
		bounds_edit.values[top_index].top_label = new_label;
		bounds_edit.next_label++;
	    }
	}
	
	// Now generate the bounds form from the data we received.
	
	var content = "";
	
	for ( var i=0; i < bounds_edit.values.length; i++ )
	{
	    content += generateBoundsFormRow(i, bounds_edit.values[i]);
	}
	
	return content;
    }
    
    function generateBoundsFormRow( i, record, prev_interval )
    {
	var content = '<tr class="tsed_bounds_row" id="bound_row_' + i + '"><td class="bound_cell">';
	
	if ( i > 0 ) content += intervalInput(i, record);
	content += oidField(i, record);
	content += ageInput(i, record);
	content += btpInput(i, record);

	content += '</td><td id="bound_linktd_' + i + '">';
	
	content += topInput(i, record);
	
	content += '</td><td id="bound_reftd_' + i + '">';
	
	content += baseInput( i, record );
	
	content += "</td></tr>\n";
	
	return content;
    }
    
    function oidField ( i, record )
    {
	var content = '<input type="hidden" id="bound_id_' + i + '" value="' + record.oid + "\"/>\n";
	return content;
    }

    function intervalInput ( i, record )
    {
	// var name = (record.iid == undefined) ? '  --' : record.inm;
	var name = record.inm || '  --';
	var content = '<input type="text" class="tsed_control" id="bound_int_' + i + '" value="' + name + "\"/><br>\n";
	return content;
    }
    
    function ageInput ( i, record )
    {
	var attrs = '';
	if ( record.btp && record.btp != 'spike' && record.btp != 'absolute' ) attrs = ' disabled';
	
	var age = record.age != undefined ? record.age : '';
	var err = record.ger != undefined ? record.ger : '';
	
	var content = '<input class="tsed_control" id="bound_age_' + i + 
	    '" type="text" size="8" value="' + age + '"' + attrs + '> &plusmn; ';
	content += '<input class="tsed_control" id="bound_age_err_' + i +
	    '" type="text" size="5" value="' + err + '"' + attrs + '>';
	return content;
    }
    
    function btpInput ( i, record )
    {
	var content = '&nbsp;<select class="tsed_control" id="bound_type_' + i + 
	    '" onchange="tsapp.setBoundType(' + i + ')">\n';
	
	var found;
	
	for ( var j=0; j<form_elt.btps.length; j++ )
	{
	    var value = form_elt.btps[j];
	    var selected = '';
	    
	    if (value == record.btp)
	    {
		selected = ' selected';
		found = 1;
	    }
	    
	    content += '<option value="' + value + '"' + selected + ">" + form_elt.btpnames[j] + "</option>\n";
	}
	
	if ( ! found ) content += '<option value ="' + record.btp + '" selected>' + record.btp + "</option>\n";
	
	content += "</select>\n";
	
	var src = '/nospike.png';
	if ( record.spk ) src = '/spike.png';
	
	content += '<img class="spike" id="bound_spike_' + i + '" width="20" height="20" src="' + resource_url + src + '">' + "\n";
	
	var frc = record.frc || '';
	var attrs = record.btp == 'fraction' ? '' : ' style="display: none;"';
	
	content += '&nbsp&nbsp;<input class="tsed_control" id="bound_frac_' + i +
	    '" type="text" size="6" value="' + frc + '"' + attrs + ">\n";
	
	return content;
    }

    function topInput ( i, record )
    {
	var content = '';
	var top_oid;
	
	if ( top_oid = record.uid )
	{
	    var top_index = bounds_edit.lookup[top_oid];
	    var top_label = bounds_edit.values[top_index].top_label;

	    if ( top_label ) content += '<span class="tsed_top_ref">' + top_label + "</span>\n";
	}
	
	if ( record.top_label )
	{
	    if ( content ) content += "<br>";
	    
	    content += '<span class="tsed_top_label">' + record.top_label + "</span>\n";
	}
	
	return content;
    }
    
    function baseInput ( i, record )
    {
	var content = '';
	
	var start_tag = '<span id="base_bound_' + i + '" class="tsed_timescale_label" ' +
	    'onclick="tsapp.selectBaseBound(\'base\',' + i + ')">';
	
	if ( record.btp == "same" )
	{
	    content = linkBoundBtn(i, record, 'base', api_data.bounds_id[record.bid]);
	    
 	    // content = start_tag + base_label + '</span>';
	    
	    // if ( record.age_diff )
	    // {
	    // 	var rounded = Math.round(record.age_diff * 1000) / 1000;
	    // 	content += '<span class="tsed_diff"> (' + rounded > 0 ? "+" : "" + rounded + ')</span>';
	    // }
	}
	
	else if ( record.btp == "fraction" )
	{
	    content = linkBoundBtn(i, record, 'range', api_data.bounds_id[record.tid]);

	    content += "<br>\n";

	    content += linkBoundBtn(i, record, 'base', api_data.bounds_id[record.bid]);

	    	    
	    
	//     var base_record = api_data.bounds_id[record.bid];
	//     var top_record = api_data.bounds_id[record.tid];
	//     var base_label = 'unknown';
	//     var top_label = 'unknown';
	    
	//     var fraction = record.frc != undefined ? record.frc : '';
	//     var frcfield = '<input class="tsed_control" id="bound_frc_' + i + 
	// 	'" type="text" size="6" value="' + fraction + '">';
	    
	//     if ( base_record )
	//     {
	// 	base_label = base_record.inm || 'unknown';
	// 	if ( base_record.sid > 5 && base_record.sid != record.sid )
	// 	{
	// 	    var base_tsrecord = api_data.timescales_id[base_record.sid];
	// 	    base_label += ' [' + base_tsrecord.nam + ']';
	// 	}
		
	// 	top_label = top_record.inm || top_record.age || 'unknown';
		
	//     	if ( (base_record.sid > 5 && base_record.sid != record.sid) ||
	// 	     (top_record.sid > 5 && top_record.sid != record.sid) )
	// 	{
	// 	    var base_tsrecord = api_data.timescales_id[base_record.sid];
	// 	    var top_tsrecord = api_data.timescales_id[top_record.sid];
		    
	// 	    if ( base_record.sid == top_record.sid )
	// 	    {
	// 		top_label += ' [' + base_tsrecord.nam + ']';
	// 	    }
		    
	// 	    else
	// 	    {
	// 		base_label += ' [' + base_tsrecord.nam + ']';
	// 		top_label += ' [' + top_tsrecord.nam + ']';
	// 	    }
	// 	}
		
	// 	if ( base_record.age != undefined )
	// 	    base_label += ' (' + base_record.age + ')';
	// 	if ( top_record.age != undefined )
	// 	    top_label += ' (' + top_record.age + ')';
		
	// 	content = pctfield + start_tag + base_label + ' - ' + top_label + '</span>';
	//     }

	//     else if ( base_record )
	//     {
	// 	base_label = base_record.inm || 'unknown';

	//     	if ( base_record.sid > 5 && base_record.sid != record.sid )
	// 	{
	// 	    var base_tsrecord = api_data.timescales_id[base_record.sid];
	// 	    base_label += ' [' + base_tsrecord.nam + ']';
	// 	}

	// 	content = start_tag + base_label + '</span>';
	//     }
	
	// else
	//     {
	// 	content = start_tag + 'choose a boundary</span>';
	//     }
	}
	
	// else if ( record.btp == "alternate" )
	// {
	//     var base_record = api_data.bounds_id[record.bid];
	//     var top_record = api_data.bounds_id[record.tid];
	//     var base_label = 'unknown';
	//     var top_label = 'unknown';
	    
	//     if ( base_record && top_record )
	//     {
	// 	base_label = base_record.inm || 'unknown';
	// 	top_label = top_record.inm || top_record.age || 'unknown';
		
	//     	if ( (base_record.sid > 5 && base_record.sid != record.sid) ||
	// 	     (top_record.sid > 5 && top_record.sid != record.sid) )
	// 	{
	// 	    var base_tsrecord = api_data.timescales_id[base_record.sid];
	// 	    var top_tsrecord = api_data.timescales_id[top_record.sid];
		    
	// 	    if ( base_record.sid == top_record.sid )
	// 	    {
	// 		top_label += ' [' + base_tsrecord.nam + ']';
	// 	    }
		    
	// 	    else
	// 	    {
	// 		base_label += ' [' + base_tsrecord.nam + ']';
	// 		top_label += ' [' + top_tsrecord.nam + ']';
	// 	    }
	// 	}
		
	// 	content = start_tag + base_label + ' - ' + top_label + '</span>';
	//     }
	    
	//     else if ( base_record )
	//     {
	// 	base_label = base_record.inm || 'unknown';

	//     	if ( base_record.sid > 5 && base_record.sid != record.sid )
	// 	{
	// 	    var base_tsrecord = api_data.timescales_id[base_record.sid];
	// 	    base_label += ' [' + base_tsrecord.nam + ']';
	// 	}

	// 	content = start_tag + base_label + '</span>';
	//     }

	//     else if ( top_record )
	//     {
	// 	base_label = 'here';
	// 	top_label = top_record.inm || top_record.age || 'unknown';
		
	//     	if ( top_record.sid > 5 && top_record.sid != record.sid )
	// 	{
	// 	    var top_tsrecord = api_data.timescales_id[top_record.sid];
	// 	    top_label += ' [' + top_tsrecord.nam + ']';
	// 	}
		
	// 	content = start_tag + 'this age' + ' - ' + top_label + '</span>';
	//     }

	//     else if ( record.iid == undefined )
	//     {
	// 	content = start_tag + 'this age</span>';
	//     }
	    
	//     else
	//     {
	// 	content = start_tag + 'choose a boundary</span>';
	//     }
	// }
	
	// else if ( record.age == 0 )
	// {
	//     return '<span class="tsed_timescale_label">Present</span>';
	// }
	
	return content;
    }

    function linkBoundBtn ( i, record, type, link_record )
    {
	var link_label;
	
	if ( link_record )
	{
	    link_label = link_record.inm || 'unknown';
	    
	    if ( link_record.age == "0" )
		link_label = 'Present';
	    
	    else if ( link_label == "" )
		link_label = link_record.oid;
	    
	    if ( link_record.sid > 5 && link_record.sid != record.sid )
	    {
		var link_tsrecord = api_data.timescales_id[link_record.sid];
		link_label += ' [' + link_tsrecord.nam + ']';
	    }
	}
	
	else
	{
	    link_label = 'choose a boundary';
	}
	
	var content = '<span id="' + type + '_bound_' + i + '" class="tsed_timescale_label" ' +
	    'onclick="tsapp.chooseLinkBound(\'' + type + "'," + i + ')">';

	content += link_label;
	content += '</span>';
	
	return content;
    }

    function updateLinkBtn ( type, i, link_record )
    {
	var link_elt = myGetElement(type + '_bound_' + i);
	var link_label;
	
	if ( type == "base" )
	    bounds_edit.values[i].bid = link_record.oid;
	
	else if ( type == "range" )
	    bounds_edit.values[i].tid = link_record.oid;
	
	else if ( type == "color" )
	    bounds_edit.values[i].cid = link_record.oid;
	
	if ( link_elt )
	{
	    if ( type == 'top' )
		link_label = link_record.top_label || link_record.oid;

	    else
		link_label = link_record.inm || 'unknown';
	    
	    if ( link_record.age == "0" )
		link_label = 'Present';

	    else if ( link_label == "" )
		link_label = link_record.oid;

	    if ( link_record.sid > 5 && link_record.sid != bounds_edit.values[i].sid )
	    {
		var link_tsrecord = api_data.timescales_id[link_record.sid];
		link_label += ' [' + link_tsrecord.nam + ']';
	    }
	    
	    link_elt.innerHTML = link_label;
	}
    }
    
    function setBoundType ( i, bound_type )
    {
	var new_bound_type = bound_type || getElementValue('bound_type_' + i);
	var age_element = myGetElement('bound_age_' + i);
	var err_element = myGetElement('bound_age_err_' + i);
	var reftd_element = myGetElement('bound_reftd_' + i);
	
	bounds_edit.values[i].btp = new_bound_type;
	
	if ( bound_type )
	    setElementValue('bound_type_' + i, bound_type);
	
	// var base_element = document.getElementById('base_bound_' + i);
	// var range_element = document.getElementById('range_bound_' + i);
	
	if ( new_bound_type == 'absolute' || new_bound_type == 'spike' )
	{
	    age_element.disabled = 0;
	    err_element.disabled = 0;
	    reftd_element.innerHTML = '';
	}
	
	else
	{
	    age_element.disabled = 1;
	    err_element.disabled = 1;
	    reftd_element.innerHTML = boundsBaseContent(i, bounds_edit.values[i]);
	    
	    // if ( base_element ) base_element.style.display = '';
	    // if ( new_bound_type == 'percent' && range_element ) range_element.style.display = '';
	}
    }
    
    this.setBoundType = setBoundType;
    
    function setBoundBase ( i, selector, bound_id )
    {
	if ( selector == 'base' )
	    bounds_edit.values[i].bid = bound_id;
	
	else if ( selector == 'range' || selector == 'top' )
	    bounds_edit.values[i].tid = bound_id;
	
	else
	{
	    console.log("ERROR: bad selector'" + selector + "'");
	    return;
	}
	
	var reftd_element = myGetElement('bound_reftd_' + i);
	reftd_element.innerHTML = boundsBaseContent(i, bounds_edit.values[i]);
    }
    
    this.setBoundBase = setBoundBase;
    
    function setBoundHilight ( i, selector )
    {
	$('#bound_row_'+i).removeClass('tsed_model_match tsed_model_close tsed_model_computed');

	if ( selector == 'match' || selector == 'close' || selector == 'computed' )
	    $('#bound_row_'+i).addClass('tsed_model_'+selector);
    }
    
    this.setBoundHilight = setBoundHilight;
    
    function callbackBaseBounds ( records )
    {
	if ( ! records || ! records.length )
	{
	    window.alert('ERROR: no records returned for base bounds query');
	}    
	
	// Go through the records and save the content under 'api_data'.
	
	for ( var i=0; i < records.length; i++ )
	{
	    var oid = records[i].oid;
	    api_data.bounds_id[oid] = records[i];
	}
	
	// Then update the bounds entry form.
	
	for ( var i=0; i < bounds_edit.n_bounds; i++ )
	{
	    var bound_id = getElementValue('bound_id_' + i);
	    if ( bound_id && api_data.bounds_id[bound_id] ) updateBoundsFormTimescale(i, bound_id);
	}
    }
    
    function resetBoundsForm ( )
    {
	// Update the form contents row by row from the API data.
	
	for ( var i=0; i < bounds_edit.n_bounds; i++ )
	{
	    resetBoundsFormRow(i, hard_reset );
	}
    }

    this.resetBoundsForm = resetBoundsForm;
    
    function resetBoundsFormRow ( i, hard_reset )
    {
	var age_elt = myGetElement('bound_age_' + i);
	var btp_elt = myGetElement('bound_type_' + i);
	// var bts_elt = myGetElement('bound_base_ts_' + i);
	
	var bound_id = getElementValue('bound_id_' + i);
	var bound_age = api_data.bounds_id[bound_id].age;
	var bound_type = api_data.bounds_id[bound_id].btp;
	
	if ( age_elt ) age_elt.value = bound_age;
	if ( btp_elt ) btp_elt.selected_index = 0;
	updateBoundsFormTimescale(i, bound_id);
    }

    function updateBoundsFormTimescale ( i, bound_id )
    {
	var bts_elt = document.getElementById('base_bound_' + i);
	var base_id = api_data.bounds_id[bound_id].bid;
	var base_timescale_name = '';

	if ( base_id )
	{
	    var base_timescale_id = api_data.bounds_id[base_id].sid;
	    if ( base_timescale_id ) base_timescale_name = api_data.timescales_id[base_timescale_id].nam;
	    else base_timescale_name = 'ERROR';

	    var base_interval_name = api_data.bounds_id[base_id].inm || 'Top';
	    base_timescale_name = base_interval_name + ' (' + base_timescale_name + ')';
	}
	
	if ( bts_elt ) bts_elt.innerHTML = base_timescale_name;
    }

    function saveBoundsForm ( )
    {
	// Go through the form contents row by row and, if any field has changed, construct a
	// record to send to the server.
	
	var change_records = [ ];
	
	for ( var i=0; i < bounds_edit.n_bounds; i++ )
	{
	    var r = generateRowChangeRecord(i);
	    if ( r ) change_records.push(r);
	}

	var update_data = JSON.stringify(change_records);
	console.log("JSON: " + update_data);
	
	var conditions = '';
	
	if ( change_records.length > 0 )
	{
	    // $.post(data_url + 'bounds/addupdate.json?allow=' + conditions, update_data)

	    $.ajax({
		url: data_url + 'bounds/addupdate.json?allow=' + conditions,
		type: 'PUT',
		data: update_data,
		contentType: 'application/json; charset=utf-8',
		dataType: 'json' })
	    	.done(function ( response ) { displayBoundsListResult(bounds_box, edit_timescale_id, response.records) })
	    	.fail(failSaveBounds);
	    
	}
	
	else alert("No changes to save.");
    }
    
    this.saveBoundsForm = saveBoundsForm;
    
    function callbackSaveBounds ( response )
    {
	if ( response.records )
	    bounds_box.innerHTML = generateBoundsFormContent( timescale_id, response.records );
	
	else
	    bounds_box.innerHTML = "ERROR: no records";
    }
    
    function failSaveBounds ( xhr )
    {
	var error_list = xhr.responseJSON.errors;

	if ( error_list && Array.isArray(error_list) )
	{
	    for ( var i=0; i<error_list.length; i++ )
	    {
		alert(error_list[i]);
	    }
	}
	
	else
	{
	    var message = xhr.status + " " + xhr.statusText;
	    alert(message);
	}
    }
    
    function generateRowChangeRecord ( i )
    {
	// If row i has changed, return a change record. Otherwise, return nothing.

	var cr = { };
	
	var bound_id = getElementValue('bound_id_' + i);
	
	var new_age = getElementValue('bound_age_' + i);
	var old_age = api_data.bounds_id[bound_id].age;

	var new_error = getElementValue('bound_age_err_' + i);
	var old_error = api_data.bounds_id[bound_id].ger || '';
	
	var new_type = getElementValue('bound_type_' + i);
	var old_type = api_data.bounds_id[bound_id].btp;
	
	if ( old_type != undefined && new_type != undefined && old_type != new_type )
	{
	    cr.bound_id = bound_id;
	    cr.bound_type = new_type;
	}
	
	if ( new_age != undefined && (old_age == undefined || String(new_age) != String(old_age) ) )
	{
	    cr.bound_id = bound_id;
	    cr.age = new_age;
	}
	
	if ( new_error != undefined && (old_error == undefined || String(new_error) != String(old_error) ) )
	{
	    cr.bound_id = bound_id;
	    cr.age_error = new_error;
	}
	
	if ( cr.bound_id != undefined ) return cr;
	return undefined;
    }

    function displayTimescaleAttrs ( timescale_id )
    {
	$.getJSON(data_url + 'timescales/single.json?show=desc&timescale_id=' + timescale_id)
	    .done(function ( response ) { displayTimescaleAttrsResult(timescale_id, response.records[0]) })
	    .fail(function ( xhr ) { document.alert("ERROR: could not load timescale attrs"); });
    }
    
    function displayTimescaleAttrsResult ( timescale_id, record )
    {
	api_data.timescales_id[timescale_id] = record;
	edit_timescale_attrs = { };
	
	$(document.ts_attrs_form.save).removeClass('tsed_active_save');
	
	setElementValue('ts_name', record.nam || '');
	setElementValue('ts_id', record.oid || '');
	setElementValue('ts_min_age', record.lag != undefined ? record.lag : '');
	setElementValue('ts_max_age', record.eag != undefined ? record.eag : '');
	setElementValue('ts_extent', record.ext || '');
	setElementValue('ts_taxon', record.txn || '');
	setElementValue('ts_type', record.typ || '');
    }
    
    function checkTimescaleAttrs ( )
    {
	// Go through the form contents row by row and see if any of the fields have changed.
	// Highlight any improper values.
	
	var new_name = getElementValue('ts_name');
	var new_type = getElementValue('ts_type');
	var new_extent = getElementValue('ts_extent');
	var new_taxon = getElementValue('ts_taxon');
	var new_comments = getElementValue('ts_comments');
	var new_type = getElementValue('ts_type');
	
	var current = api_data.timescales_id[edit_timescale_id];
	
	var current_name = current.nam || '';
	var current_type = current.typ || '';
	var current_extent = current.ext || '';
	var current_taxon = current.txn || '';
	var current_comments = current.tsc || '';
	var current_type = current.typ || '';
	
	// check for empty timescale name; figure out a mechanism for error display;
	// on completion, clear the attrs
	
	edit_timescale_attrs = { };
	
	if ( new_name != current_name ) edit_timescale_attrs.timescale_name = new_name;
	if ( new_type != current_type ) edit_timescale_attrs.timescale_type = new_type;
	if ( new_extent != current_extent ) edit_timescale_attrs.timescale_extent = new_extent;
	if ( new_taxon != current_taxon ) edit_timescale_attrs.timescale_taxon = new_taxon;
	if ( new_comments != current_comments ) edit_timescale_attrs.timescale_comments = new_comments;
	if ( new_type != current_type ) edit_timescale_attrs.timescale_type = new_type;
	
	if ( _.size(edit_timescale_attrs) )
	    $(document.ts_attrs_form.save).addClass('tsed_active_save');
	
	else
	    $(document.ts_attrs_form.save).removeClass('tsed_active_save');
    }
    
    this.checkTimescaleAttrs = checkTimescaleAttrs;
    
    function saveTimescaleAttrs ( )
    {
	// If we have a record ready to send to the server, send it.
	
	if ( _.size(edit_timescale_attrs) )
	{
	    var update_data = '[' + JSON.stringify(edit_timescale_attrs) + ']';
	    
	    $.ajax({
		url: data_url + 'timescales/update.json?timescale_id=' + edit_timescale_id,
		type: 'PUT',
		data: update_data,
		contentType: 'application/json; charset=utf-8',
		dataType: 'json' })
	    	.done(function ( response ) { displayTimescaleAttrsResult(edit_timescale_id, response.records[0]) })
	    	.fail(failSaveBounds);
	}
    }
    
    this.saveTimescaleAttrs = saveTimescaleAttrs;
    
    function chooseLinkBound ( which, i )
    {
	var current_bound_id;
	var current_timescale_id;
	
	if ( which == 'base' )
	    current_bound_id = bounds_edit.values[i].bid;
	else if (which == 'range' )
	    current_bound_id = bounds_edit.values[i].tid;
	else if ( which == 'color' )
	    current_bound_id = bounds_edit.values[i].cid;
	else if ( which == 'top' )
	    current_bound_id = bounds_edit.values[i].uid;
	else
	    return;
	
	if ( current_bound_id )
	    current_timescale_id = api_data.bounds_id[current_bound_id].sid;
	
	else
	    current_timescale_id = bounds_edit.source_timescale_id || 1;
	
	if ( which == 'base' || which == 'range' )
	{
	    openBoundSelector( current_timescale_id, current_bound_id, function (record) {
		updateLinkBtn(which, i, record) } );
	}

	else if ( which == 'top' )
	{
	    openTopSelector( current_bound_id, function(record) {
		updateLinkBtn('top', i, record) } );
	}
    }
    
    this.chooseLinkBound = chooseLinkBound;

    function openTimescaleSelector ( current_timescale_id )
    {
	var modal_elt = myGetElement("bound_selector");

	if ( modal_elt )
	{
	    modal_elt.style.display = "block";

	    
	}
    }
    
    function openBoundSelector ( current_timescale_id, current_bound_id, callback )
    {
	var modal_elt = myGetElement("bound_selector");

	if ( modal_elt )
	{
	    modal_elt.style.display = "block";
	    
	    modal_state.bound_selector.choice_callback = callback;
	    modal_state.bound_selector.close_callback = closeBoundSelector;
	    
	    setBoundSelector(current_timescale_id, current_bound_id);
	}
    }

    function closeBoundSelector ( )
    {
	modal_state.bound_selector.choice_callback = undefined;
    }
    
    function setBoundSelector ( timescale_id, bound_id )
    {
	bound_selector.timescale_id = timescale_id;
	bound_selector.selected_id = bound_id;
	bound_selector.values = [ ];
	
	$("#bound_selector_timescales td").each(function () {
	    if ( this.title == timescale_id ) $(this).addClass("tsed_highlight");
	    else $(this).removeClass("tsed_highlight");
	});
	
	bound_selector_bounds_box.innerHTML = "loading...";
	
	$.getJSON(data_url + 'timescales/bounds.json?timescale_id=' + timescale_id)
	    .done(function ( response ) { boundSelectorGenerateBoundsList(bound_id, response.records) })
	    .fail(function ( xhr ) { display_element.innerHTML = "ERROR: could not load bounds"; failSaveBounds(xhr); });
    }
    
    function modalChoice ( id, value )
    {
	if ( modal_state[id] )
	    modal_state[id].choice_callback(value);
	
	else
	    console.log("ERROR: no modal_state '" + id + "'");
    }

    this.modalChoice = modalChoice;
    
    function modalClose ( id )
    {
	var modal_elt = myGetElement(id);

	if ( modal_elt ) modal_elt.display = "none";

	if ( modal_state.bound_selector.close_callback )
	    modal_state.bound_selector.close_callback();
	
	modal_state.bound_selector.choice_callback = undefined;
    }
    
    this.modalClose = modalClose;

    // function boundSelectorSelectBound ( bound_id )
    // {
    // 	$("#bound_selector_timescales td").each(function () {
    // 	    if ( this.title == bound_id ) $(this).addClass("tsed_highlight");
    // 	    else $(this).removeClass("tsed_highlight");
    // 	});
    // }
    
    function boundSelectorGenerateBoundsList ( select_bound_id, records )
    {
	var content = "";
	var selected_index;

	if ( records.length == 0 ) return;
	
	for ( var i=0; i < records.length; i++ )
	{
	    content += generateBoundSelectorRow(i, records[i]);

	    if ( records[i].oid == select_bound_id ) selected_index = i;
	}
	
	bound_selector_bounds_box.innerHTML = content;
	
	bound_selector.selected_index = selected_index;
	
	var selected_elt = myGetElement("bound_select_" + selected_index);

	if ( selected_elt )
	{
	    $(selected_elt).addClass("tsed_highlight");
	    selected_elt.scrollIntoView(false);
	}
    }

    function generateBoundSelectorRow ( i, record )
    {
	bound_selector.values[i] = record;
	
	// var class_str = record.oid == select_bound_id ? 'tsed_highlight' : '';
	var content = '<tr><td id="bound_select_' + i + '" title="' + record.oid + '" onclick="tsapp.boundSelectorPickBound(' + i + ')">';
	
	var age = record.age != undefined ? record.age : '(undefined)';
	if ( record.ger != undefined ) age += '&nbsp;&plusmn;&nbsp;' + record.ger;
	
	var interval = record.inm || 'Top';
	var type = record.btp || '(undefined)';
	
	content += '<span class="tsed_control">' + interval + '<br/>&nbsp;&nbsp;&nbsp;' + age + '&nbsp;-&nbsp;' + type + '</span>';
	content += "</td></tr>\n";
	
	return content;
    }

    function boundSelectorPickBound ( i )
    {
	// alert("selected bound " + i);
	var select_id = "bound_select_" + i;
	
	$("#bound_selector_bounds td").each(function () {
    	    if ( this.id == select_id ) $(this).addClass("tsed_highlight");
    	    else $(this).removeClass("tsed_highlight");
    	});

	if ( bound_selector.selected_index == i && bound_selector.callback )
	{
	    bound_selector.callback(bound_selector.values[i]);
	    closeBoundSelector();
	}
	
	bound_selector.selected_index = i;
    }

    this.boundSelectorPickBound = boundSelectorPickBound;
    
    // The following code is used for modeling a set of absolute bounds based on the
    // international boundary ages with percentages. We go through all of the bounds in the
    // current timescale and attempt to either (a) match them to international bounds, or (b)
    // express them as a percentage of the difference between two international bounds.
    
    function modelBoundsForm ( event )
    {
	// Do nothing unless we actually have a timescale loaded into the bounds form.
	
	if ( ! bounds_edit.n_bounds ) return;

	// If the shift key was held down while invoking this function, ask for parameters and
	// store them in the appropriate variables for this and subsequent runs.
	
	if ( event.shiftKey == 1 )
	{
	    var ma_answer = window.prompt("Age difference threshold in Ma?", model_match_diff);
	    model_match_diff = Number(ma_answer);

	    var frac_answer = window.prompt("Age difference threshold as a fraction?", model_match_frac);
	    model_match_frac = Number(frac_answer);
	}
	
	// Go through the bounds and match as many as possible to international boundary ages.
	
	for ( var i=0; i < bounds_edit.n_bounds; i++ )
	{
	    var btp = bounds_edit.values[i].btp;
	    var age = Number(getElementValue('bound_age_' + i));
	    var last_diff;
	    
	    // Store the initial ages of all the bounds, if they have not already been stored by a
	    // prior execution of this function.
	    
	    if ( bounds_edit.values[i].orig_age == undefined )
	    {
		bounds_edit.values[i].orig_age = age;
	    }
	    
	    // Any bound that was changed by the user to type 'percent' will be set in the next
	    // loop below.
	    
	    if ( btp == 'percent' && bounds_edit.values[i].modeled_type != 'percent' )
	    {
		// Do nothing in this loop.
	    }
	    
	    // Any bound that is not already matched to a boundary from one of the international
	    // timescales should be examined to see if it matches according to the parameters
	    // for this run. But skip any bound with an age of 0.
	    
	    else if ( btp != 'same' && age != 0 )
	    {
		// Scan through the list of international ages to see if one of them comes close
		// enough for a match.
		
		// There are two match parameters, and a candidate age must fall within both of them:
		// - model_match_diff specifies a maximum allowable difference in Ma, defaulting
		//   to 0.2
		// - model_match_frac specifies a maximum difference as a fraction of the age,
		//   defaulting to 0.05. This prevents bad matches among recent ages.
		
		for ( var j in api_data.ics_ages )
		{
		    var a = Number(api_data.ics_ages[j]);
		    var r = api_data.ics_best[api_data.ics_ages[j]];
		    
		    var diff = Math.abs(age-a);
		    
		    // If an age matches exactly, set it to point to the corresponding international
		    // bound record and we are done.
		    
		    if ( a == age )
		    {
			delete bounds_edit.values[i].age_diff;
			bounds_edit.values[i].modeled_type = 'same';
			setBoundType(i, 'same');
			setBoundBase(i, 'base', r.oid);
			setBoundHilight(i, 'match');
			break;
		    }
		    
		    // If an age matches approximately, within the parameters being sued for this run,
		    // then likewise set it to point to the corresponding international bound
		    // record. But continue to scan, for we may get a better match with a
		    // subsequent age.
		    
		    else if ( diff < model_match_diff && diff < model_match_frac * age )
		    {
			if ( ! last_diff || diff < last_diff )
			{
			    bounds_edit.values[i].age_diff = age - a;
			    bounds_edit.values[i].modeled_type = 'same';
			    setBoundType(i, 'same');
			    setBoundBase(i, 'base', r.oid);
			    setBoundHilight(i, 'close');
			}
		    }
		    
		    // If we have passed beyond a possible match, we can stop.
		    
		    else if ( a > age + model_match_diff )
		    {
			break;
		    }
		}
	    }
	    
	    // If this boundary was matched to an international age on a previous run, and the new
	    // bounds have not yet been saved, then check to make sure it still matches under the
	    // current parameters. If it no longer does, then return it to a 'percent'
	    // boundary. The offset value will be adjsted and the table cell updated in the loop
	    // below.
	    
	    else if ( btp == 'same' && bounds_edit.values[i].age_diff )
	    {
		var diff = bounds_edit.values[i].age_diff;
		
		if ( diff > model_match_diff || diff > model_match_frac * age )
		{
		    bounds_edit.values[i].btp = 'percent';
		}
	    }
	}
	
	// Now go through the bounds again. For any 'absolute' or 'percent' bounds, record which
	// is the nearest internationally anchored bound in this timescale, both above and
	// below. These will then be used as the base and range for this bound when it is
	// converted to percent.
	
	var top_anchor;
	var bottom_anchor;
	
	for ( var i=0; i < bounds_edit.n_bounds; i++ )
	{
	    var btp = bounds_edit.values[i].btp;
	    var mtp = bounds_edit.values[i].modeled_type;
	    var age = bounds_edit.values[i].orig_age;
	    
	    // $$$
	    
	    if ( btp == 'same' || age == 0 || btp == 'absolute' && mtp && mtp != 'absolute' )
	    {
		top_anchor = i;
	    }
	    
	    else
	    {
		bounds_edit.values[i].top_anchor = top_anchor;
	    }
	}
	
	for ( var i=bounds_edit.n_bounds - 1; i > 0; i-- )
	{
	    var btp = bounds_edit.values[i].btp;
	    var mtp = bounds_edit.values[i].modeled_type;
	    
	    if ( btp == 'same' || btp == 'absolute' && mtp && mtp != 'absolute' )
	    {
		bottom_anchor = i;
	    }
	    
	    else if ( top_anchor != undefined && bottom_anchor != undefined )
	    {
		bounds_edit.values[i].bottom_anchor = bottom_anchor;
		
		var this_top = bounds_edit.values[i].top_anchor;
		var this_bottom = bounds_edit.values[i].bottom_anchor;
		var this_age = bounds_edit.values[i].orig_age;
		var top_age = bounds_edit.values[this_top].orig_age;
		var bottom_age = bounds_edit.values[this_bottom].orig_age;
		var top_oid = bounds_edit.values[this_top].bid;
		var bottom_oid = bounds_edit.values[this_bottom].bid;
		
		var percent = 100 * (bottom_age - this_age) / (bottom_age - top_age);
		percent = Math.round(percent * 10) / 10;
		
		setBoundBase(i, 'base', bottom_oid);
		setBoundBase(i, 'top', top_oid);
		setBoundType(i, 'percent');
		setElementValue('bound_percent_' + i, percent);
		bounds_edit.values[i].pct_value = percent;
		setBoundHilight(i, 'computed');
	    }
	}
    }
    
    this.modelBoundsForm = modelBoundsForm;
    
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

