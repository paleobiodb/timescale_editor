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
    
    var init_box;
    var timescales_box;
    var bounds_box;
    
    var form_elt = { };
    
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
	
	timescales_pane = myGetElement("timescale_pane");
	ts_attrs_pane = myGetElement("ts_attrs_pane");
	bounds_pane = myGetElement("bounds_pane");
	
	if ( ! timescales_pane || ! ts_attrs_pane || ! bounds_pane )
	    return badInit();
	
	init_box = myGetElement("db_initmsg");
	timescales_box = myGetElement("timescales_box");
	bounds_box = myGetElement("bounds_box");
	
	if ( !init_box || ! timescales_box || ! bounds_box )
	    return badInit();
	
	// initialize some form elements
	
	form_elt.btps = [ 'absolute', 'spike', 'same', 'percent', 'offset' ];
	form_elt.btpnames = [ 'Absolute', 'Spike', 'Same as', 'Percent', 'Offset' ];
	// no_update = 1;
	
	// initDisplayClasses();
	// getDBUserNames();
	
	// if ( getElementValue("vf1") != "-1" )
	//     showHideSection('f1', 'show');
	
	// var sections = { vf2: 'f2', vf3: 'f3', vf4: 'f4', vf5: 'f5', vf6: 'f6', vo1: 'o1' };
	// var s;
	
	// for ( s in sections )
	// {
	//     if ( getElementValue(s) == "1" )
	// 	showHideSection(sections[s], 'show');
	// }
	
	// // If the form is being reloaded and already has values entered into it, take some steps
	// // to make sure it is properly set up.
	
	// try
	// {
	//     var record_type = $('input[name="record_type"]:checked').val();
	//     setRecordType(record_type);
	    
	//     var form_mode = $('input[name="form_mode"]:checked').val();
	//     setFormMode(form_mode);
	    
	//     var output_format = $('input[name="output_format"]:checked').val();
	//     setFormat(output_format);

	//     var private_url = $('input[name="private_url"]:checked').val();
	//     console.log("private_url = " + private_url);
	//     setPrivate(private_url);
	// }
	
	// catch (err) { };
	
	// no_update = 0;
	
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
	api_data.timescale_id = { };
	
	for ( var i=0; i < response.records.length; i++ )
	{
	    var record = response.records[i];
	    
	    api_data.timescales.push(record);
	    api_data.timescale_id[record.oid] = record;
	}
	
	// // If both API calls are complete, finish the initialization process. 
	
	// done_config1 = 1;
	// if ( done_config2 ) finishInitApp();
	
	finishInitApp();
	refreshTimescales();
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
    
    function refreshTimescales ( )
    {
	if ( ! timescales_box )
	{
	    alert("Could not find 'timescales_box'");
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
	    content += generateTableLine(internationals[i]);
	
	for ( var i=0; i < others.length; i++ )
	    content += generateTableLine(others[i]);
	
	timescales_box.innerHTML = content;
    }
    
    this.refreshTimescales = refreshTimescales;
    
    function generateTableLine ( record )
    {
	return "<tr><td onclick=\"tsapp.selectTimescale('" + record.oid + "')\">" + record.nam + "</td></tr>\n";
    }
    
    function selectTimescale ( timescale_id )
    {
	displayBoundsList(timescale_id);
    }
    
    this.selectTimescale = selectTimescale;
    
    function displayBoundsList ( timescale_id )
    {
	if ( ! bounds_box )
	{
	    alert("Could not find 'bounds_box'");
	    return;
	}
	
	bounds_box.innerHTML = "loading...";
	
	$.getJSON(data_url + 'bounds/list.json?timescale_id=' + timescale_id)
	    .done(function ( response ) { 
		if ( ! response.records )
		{
		    bounds_box.innerHTML = "ERROR: no records";
		    return;
		}
		
		else
		{
		    bounds_box.innerHTML = generateBoundsFormContent(response.records);
		}
	    } )
	    .fail(function ( ) { bounds_box.innerHTML = "ERROR: could not load bounds"; });
    }
    
    this.displayBoundsList = displayBoundsList;    
    
    function generateBoundsFormContent ( records )
    {
	api_data.current_bounds = records;
	api_data.current_bounds_id = { };
	
	for ( var i=0; i < records.length; i++ )
	{
	    var oid = records[i].oid;
	    api_data.current_bounds_id[oid] = records[i];
	}
	
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
	
	if ( i > 0 ) content += record.inm + "<br>";
	content += ageInput(i, record);
	content += btpInput(i, record);
	content += btdInput( i, record );
	
	content += "</td></tr>\n";
	
	    // var base_timescale = response.records[i].btd;
	    // var base_name = '';
	    
	    // if ( base_timescale && ( response.records[i].btp == 'same' || 
	    // 			     response.records[i].btp == 'offset' ||
	    // 			     response.records[i].btp == 'percent' ) )
	    // {
	    // 	base_name = api_data.timescale_id[base_timescale].nam || 'ERROR';
	    // }
	
	return content;
    }
    
    function ageInput ( i, record )
    {
	var attrs = '';
	if ( record.btp && record.btp != 'spike' && record.btp != 'absolute' ) attrs = ' disabled';
	
	var content = '<input class="tsed_control" id="bound_age_' + i + 
	    '" type="text" size="10" value="' + record.age + '"' + attrs + '>';
	return content;
    }
    
    function btpInput ( i, record )
    {
	var content = '&nbsp;<select class="tsed_control" id="bound_type_' + i + 
	    '" onchange="tsapp.setBoundType(' + i + ')">\n';
	
	for ( var i=0; i<5; i++ )
	{
	    var value = form_elt.btps[i];
	    var selected = ''; if ( value == record.btp ) selected = ' selected';
	    
	    content += '<option value="' + value + '"' + selected + ">" + form_elt.btpnames[i] + "</option>\n";
	}
	
	content += "</select>\n";
	
	return content;
    }
    
    function btdInput ( i, record )
    {
	if ( ! ( typeof(record) == "object" && record.btp && 
		 ( record.btp == "same" || 
		   record.btp == "percent" || 
		   record.btp == "offset" ) ) )
	    return "";
	
	var content = '&nbsp;<span id="bound_base_ts_' + i + '" class="tsed_timescale_label">';
	var name = "ERROR";
	if ( record.btd && api_data.timescale_id[record.btd] ) name = api_data.timescale_id[record.btd].nam;
	content += name + "</span>\n";
	
	return content;
    }
    
    function setBoundType ( i )
    {
	var age_element_id = 'bound_age_' + i;
	var type_element_id = 'bound_type_' + i;
	var ts_element_id = 'bound_base_ts_' + i;
	var new_bound_type = getElementValue(type_element_id);
	var age_element = myGetElement(age_element_id);
	var ts_element = myGetElement(ts_element_id);
	
	if ( new_bound_type == 'absolute' || new_bound_type == 'spike' )
	{
	    age_element.disabled = 0;
	    ts_element.display = 'none';
	}
	else
	{
	    age_element.disabled = 1;
	    ts_element.display = '';
	}
    }
    
    this.setBoundType = setBoundType;
}

