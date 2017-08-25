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

function TimescaleEditorApp ( data_url, is_contributor )
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
    var base_bounds_box;
    
    var edit_timescale_id;
    var edit_timescale_attrs;
    
    var edit_bounds_attrs;
    
    var base_timescale_id;
    
    var bound_selector_box;
    var bound_selector_callback;
    
    var form_elt = { };
    
    var bounds_edit = { };
    
    var hi_color = 'lightblue';
    
    // var done_config1, done_config2;
    
    // var params = { base_name: '', interval: '', output_metadata: 1, reftypes: 'taxonomy' };
    // var param_errors = { };

    // var visible = { };
    
    // var data_type = "occs";
    // var data_op = "occs/list";
    // var url_op = "occs/list";

    // var data_format = ".csv";
    // var ref_format = "";
    // var non_ref_format = ".csv";

    // var form_mode = "simple";
    
    // var output_section = 'none';
    // var output_order = 'none';
    
    // var output_full = { };
    // var full_checked = { };
    
    // var confirm_download = 0;
    // var taxon_status_save = '';

    // var no_update = 0;

    // Objects for holding data cached from the API
    
    var api_data = { };
    
    // // Variables for handling object identifiers in the "metadata" section.
    
    // var id_param_map = { col: "coll_id", clu: "clust_id",
    // 			  occ: "occ_id", spm: "spec_id" };
    // var id_param_index = { col: 0, clu: 1, occ: 2, spm: 3 };
    
    // // The following regular expressions are used to validate user input.
    
    // var patt_dec_num = /^[+-]?(\d+[.]\d*|\d*[.]\d+|\d+)$/;
    // var patt_dec_pos = /^(\d+[.]\d*|\d*[.]\d+|\d+)$/;
    // var patt_int_pos = /^\d+$/;
    // var patt_name = /^(.+),\s+(.+)/;
    // var patt_name2 = /^(.+)\s+(.+)/;
    // var patt_has_digit = /\d/;
    // var patt_date = /^(\d+[mshdMY]|\d\d\d\d(-\d\d(-\d\d)?)?)$/;
    // var patt_extid = /^(col|occ|clu|spm)[:]\d+$/;
    
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
	base_bounds_box = myGetElement("bound_selector_bounds")
	
	if ( !init_box || ! timescales_box || ! bounds_box )
	    return badInit();
 	
	// initialize some form elements
	
	form_elt.btps = [ 'absolute', 'spike', 'same', 'percent', 'offset' ];
	form_elt.btpnames = [ 'Absolute', 'Spike', 'Same as', 'Percent', 'Offset' ];
	
	// Initialize some of the interface elements.
	
	var content;
	
	content = makeOptionList( [ '', '--',
				    'eon', 'eons', 'era','eras', 'period', 'periods',
				    'epoch','epochs', 'stage', 'stages', 'substage', 'substages',
				    'zone', 'zones', 'multi', 'multiple', 'other', 'other' ] );
	
	setInnerHTML("ts_type", content);
	
	// Initiate an API call to fetch necessary data.  This has a callback to handle the data
	// that comes back, and a failure callback too.
	
	$.getJSON(data_url + 'timescales/list.json?all_records')
	    .done(callbackListTimescales)
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
	api_data.bounds_list = { };
	api_data.bounds_id = { };
	
	for ( var i=0; i < response.records.length; i++ )
	{
	    var record = response.records[i];
	    
	    api_data.timescales.push(record);
	    api_data.timescales_id[record.oid] = record;
	}
	
	// // If both API calls are complete, finish the initialization process. 
	
	// done_config1 = 1;
	// if ( done_config2 ) finishInitApp();
	
	finishInitApp();
	refreshTimescales("timescales_box", "tsapp.selectTimescale");
	refreshTimescales("bound_selector_timescales", "tsapp.selectBaseTimescale");
    }
    
    // This function notifies the user that this application is not able to be used.  It is called
    // if either of the configuration API calls fail.  If the API is not working, there's no point
    // in proceeding with this application.
    
    function badInit ( )
    {
	if ( init_box ) init_box.innerHTML = "Initialization failed!  Please contact admin@paleobiodb.org";
    }
    
    // This function is called when the configuration API calls are complete.  It hides the
    // "initializing form, please wait" HTML floating object, and then calls updateFormState to
    // initialize the various form elements.
    
    function finishInitApp ()
    {
	// // initFormContents();
	
	init_box.style.display = 'none';
	
	// no_update = 1;
	
	try {
	    // do nothing for now.
	}

	catch (err) { };
	
	// no_update = 0;
	
	// updateFormState();
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
	    if ( hilight_button ) hilight_button.style['background-color'] = 'lightgrey';
	    
	    var buttons = otherElements(button_id);
	    for ( var i=0; i<buttons.length; i++ )
		buttons[i].style['background-color'] = '';
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
    
    function refreshTimescales ( element_id, selector_expr )
    {
	var element = myGetElement(element_id);
	
	if ( ! element )
	{
	    alert("Could not find HTML element '" + element_id + "'");
	    return;
	}
	
	var internationals = [ ];
	var others = [ ];
	
	for ( var i=0; i < api_data.timescales.length; i++ )
	{
	    var record = api_data.timescales[i];
	    
	    if ( record.ext && record.ext == "international" )
		internationals.push(record);
	    else
		others.push(record);
	}
	
	var content = "";
	
	for ( var i=0; i < internationals.length; i++ )
	    content += generateTableLine(internationals[i], selector_expr);
	
	for ( var i=0; i < others.length; i++ )
	    content += generateTableLine(others[i], selector_expr);
	
	element.innerHTML = content;
    }
    
    function generateTableLine ( record, selector_expr )
    {
	return "<tr><td title=\"" + record.oid + "\" onclick=\"" + selector_expr + "('" + record.oid + "')\">" + record.nam + "</td></tr>\n";
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
	
	display_element.innerHTML = "loading...";
	
	$.getJSON(data_url + 'bounds/list.json?timescale_id=' + timescale_id)
	    .done(function ( response ) { displayBoundsListResult(display_element, timescale_id, response.records) })
	    .fail(function ( xhr ) { display_element.innerHTML = "ERROR: could not load bounds"; failSaveBounds(xhr); });
    }
    
    this.displayBoundsList = displayBoundsList;
    
    function displayBoundsListResult ( display_element, timescale_id, records )
    {
	if ( records )
	    display_element.innerHTML = generateBoundsFormContent( timescale_id, records );
	else
	    display_element.innerHTML = "ERROR: no records";
    }
    
    function generateBoundsFormContent ( timescale_id, records )
    {
	// First go through the records and save the content under 'api_data'. Also collect up a
	// list of the identifiers of any base bounds.
	
	api_data.bounds_list[timescale_id] = records;
	
	bounds_edit.n_bounds = records.length;
	bounds_edit.values = [ ];
	
	var base_bounds = [ ];
	
	for ( var i=0; i < records.length; i++ )
	{
	    var oid = records[i].oid;
	    api_data.bounds_id[oid] = records[i];
	    
	    var base_oid = records[i].bid;
	    var top_oid = records[i].tid;
	    var color_oid = records[i].cid;
	    
	    bounds_edit.values[i] = { oid: oid, bid: base_oid, tid: top_oid, cid: color_oid };
	    
	    if ( base_oid ) base_bounds.push(base_oid);
	    if ( top_oid ) base_bounds.push(top_oid);
	    if ( color_oid ) base_bounds.push(color_oid);
	}
	
	// If we have found any base bounds, fire off a query to get their info as well. Once the
	// query returns, we can update the form contents.
	
	if ( base_bounds.length > 0 )
	{
	    var bounds_str = base_bounds.join(',');
	    
	    $.getJSON(data_url + 'bounds/list.json?bound_id=' + bounds_str)
		.done(function ( response ) { callbackBaseBounds( response.records ) })
		.fail(function ( ) { window.alert('ERROR: could not query base bounds') });
	}
	
	// Now generate the bounds form from the data we received.
	
	var content = "";

	content += generateBoundsFormRow(0, records[0]);
	
	var prev_interval = records[0].lnm;
	
	for ( var i=1; i < records.length; i++ )
	{
	    content += generateBoundsFormRow(i, records[i], prev_interval);
	    prev_interval = records[i].lnm;
	}
	
	return content;
    }
    
    function generateBoundsFormRow( i, record, prev_interval )
    {
	var content = "<tr><td>";
	
	if ( i > 0 ) content += intervalInput(i, record);
	content += oidField(i, record);
	content += ageInput(i, record);
	content += btpInput(i, record);

	content += "</td><td>";
	
	content += boundsRefInput( i, record );
	
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
	var content = '<input type="text" class="tsed_control" id="bound_int_' + i + '" value="' + record.inm + "\"/><br>\n";
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
	
	for ( var i=0; i<form_elt.btps.length; i++ )
	{
	    var value = form_elt.btps[i];
	    var selected = ''; if ( value == record.btp ) selected = ' selected';
	    
	    content += '<option value="' + value + '"' + selected + ">" + form_elt.btpnames[i] + "</option>\n";
	}
	
	content += "</select>\n";
	
	return content;
    }
    
    function boundsRefInput ( i, record )
    {
	if ( ! ( typeof(record) == "object" && record.btp && 
		 ( record.btp == "same" || 
		   record.btp == "percent" || 
		   record.btp == "offset" ) ) )
	    return "";
	
	var content = '<span id="base_bound_' + i + '" class="tsed_timescale_label" ' +
	    'onclick="tsapp.selectBaseBound(\'base\',' + i + ')"></span>';
	
	if ( record.btp == "percent" )
	    content += '<br/><span id="range_bound_' + i + '" class="tsed_timescale_label" ' +
	    'onclick="tsapp.selectBaseBound(\'range\',' + i + ')"></span>';
	
	return content;
    }
    
    function setBoundType ( i )
    {
	var new_bound_type = getElementValue('bound_type_' + i);
	var age_element = myGetElement('bound_age_' + i);
	var base_element = document.getElementById('base_bound_' + i);
	var range_element = document.getElementById('range_bound_' + i);
	
	if ( new_bound_type == 'absolute' || new_bound_type == 'spike' )
	{
	    age_element.disabled = 0;
	    if ( base_element ) base_element.style.display = 'none';
	    if ( range_element ) range_element.style.display = 'none';
	}
	else
	{
	    age_element.disabled = 1;
	    if ( base_element ) base_element.style.display = '';
	    if ( new_bound_type == 'percent' && range_element ) range_element.style.display = '';
	}
    }
    
    this.setBoundType = setBoundType;

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
	$.getJSON(data_url + 'timescales/single.json?timescale_id=' + timescale_id)
	    .done(function ( response ) { displayTimescaleAttrsResult(timescale_id, response.records[0]) })
	    .fail(function ( xhr ) { document.alert("ERROR: could not load timescale attrs"); });
    }
    
    function displayTimescaleAttrsResult ( timescale_id, record )
    {
	api_data.timescales_id[timescale_id] = record;
	edit_timescale_attrs = { };
	
	$(document.ts_attrs_form.save).removeClass('tsed_active_save');
	
	setElementValue('ts_name', record.nam || '');
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
	
	var current = api_data.timescales_id[edit_timescale_id];
	
	var current_name = current.nam || '';
	var current_type = current.typ || '';
	var current_extent = current.ext || '';
	var current_taxon = current.txn || '';
	
	// check for empty timescale name; figure out a mechanism for error display;
	// on completion, clear the attrs
	
	edit_timescale_attrs = { };
	
	if ( new_name != current_name ) edit_timescale_attrs.timescale_name = new_name;
	if ( new_type != current_type ) edit_timescale_attrs.timescale_type = new_type;
	if ( new_extent != current_extent ) edit_timescale_attrs.timescale_extent = new_extent;
	if ( new_taxon != current_taxon ) edit_timescale_attrs.timescale_taxon = new_taxon;
	
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
    
    function selectBaseBound ( which, i )
    {
	var initial_bound_id;
	
	if ( which == 'base' )
	    initial_bound_id = bounds_edit.values[i].bid;
	else if (which == 'range' )
	    initial_bound_id = bounds_edit.values[i].tid;
	else if ( which == 'color' )
	    initial_bound_id = bounds_edit.values[i].cid;
	else if ( which == 'ref' )
	    initial_bound_id = bounds_edit.values[i].rid;
	else
	    return;
	
	var initial_timescale_id = api_data.bounds_id[initial_bound_id].sid;
	
	openBoundSelector( initial_bound_id, initial_timescale_id, function (bound_id, timescale_id) {
	    setBaseBound( which, i, bound_id, timescale_id) } );
    }

    this.selectBaseBound = selectBaseBound;
    
    function openBoundSelector ( initial_bound_id, initial_timescale_id, callback )
    {
	bound_selector_callback = callback;
	bound_selector_box.style.display = "block";

	highlightBaseTimescale(initial_timescale_id);
    }
    
    function closeBoundSelector ( )
    {
	bound_selector_callback = undefined;
	bound_selector_box.style.display = "none";
    }
    
    this.closeBoundSelector = closeBoundSelector;

    function selectBaseTimescale ( timescale_id )
    {
	base_timescale_id = timescale_id;
	
	highlightBaseTimescale(timescale_id);
	
	displayBaseBoundsList(base_bounds_box, base_timescale_id);
    }

    this.selectBaseTimescale = selectBaseTimescale;

    function highlightBaseTimescale ( timescale_id )
    {
	$("#bound_selector_timescales td").each(function () {
	    if ( this.title == timescale_id ) $(this).addClass("tsed_highlight");
	    else $(this).removeClass("tsed_highlight");
	});
    }

    function displayBaseBoundsList ( display_element, timescale_id )
    {
	display_element.innerHTML = "loading...";
	
	$.getJSON(data_url + 'bounds/list.json?timescale_id=' + timescale_id)
	    .done(function ( response ) { displayBaseBoundsListResult(display_element, timescale_id, response.records) })
	    .fail(function ( xhr ) { display_element.innerHTML = "ERROR: could not load bounds"; failSaveBounds(xhr); });
    }

    function displayBaseBoundsListResult ( display_element, timescale_id, records )
    {
	if ( records )
	    display_element.innerHTML = generateBaseBoundsContent( timescale_id, records );
	else
	    display_element.innerHTML = "ERROR: no records";

	var a = 1;
    }

    function generateBaseBoundsContent ( timescale_id, records )
    {
	var content = "";
	var prev_interval = records[0].lnm;
	
	content += generateBaseBoundsRow(0, records[0]);
	
	for ( var i=1; i < records.length; i++ )
	{
	    content += generateBaseBoundsRow(i, records[i]);
	}
	
	return content;
    }

    function generateBaseBoundsRow ( i, record )
    {
	var content = '<tr><td onclick="tsapp.selectBaseBound(' + i + ')">';
	
	var age = record.age != undefined ? record.age : '(undefined)';
	if ( record.ger != undefined ) age += '&nbsp;&plusm;' + record.ger;
	
	var type = record.btp || '(undefined)';
	
	content += '<span class="tsed_control">' + age + '&nbsp;-&nbsp;' + type + '</span>';
	content += "</td></tr>\n";

	return content;
    }
}

