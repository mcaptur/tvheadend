/**
 * Channel tags
 */
tvheadend.channelTags = new Ext.data.JsonStore({
	autoLoad : true,
	root : 'entries',
	fields : [ 'identifier', 'name' ],
	id : 'identifier',
	url : 'channeltags',
	baseParams : {
		op : 'listTags'
	}
});

tvheadend.channelTags.setDefaultSort('name', 'ASC');

tvheadend.comet.on('channeltags', function(m) {
	if (m.reload != null) tvheadend.channelTags.reload();
});

/**
 * Channels
 */
tvheadend.channelrec = new Ext.data.Record.create(
	[ 'name', 'chid', 'epggrabsrc', 'tags', 'ch_icon', 'epg_pre_start',
		'epg_post_end', 'number' ]);

tvheadend.channels = new Ext.data.JsonStore({
	autoLoad : true,
	root : 'entries',
	fields : tvheadend.channelrec,
	id : 'chid',
	sortInfo : {
		field : 'number',
		direction : "ASC"
	},
	url : "channels",
	baseParams : {
		op : 'list'
	}
});

tvheadend.comet.on('channels', function(m) {
	if (m.reload != null) tvheadend.channels.reload();
});

/*
 * Service mapping
 */
tvheadend.mapServices = function()
{
  var panel = null;
  var win   = null;

  /* Form fields */
  var availCheck = new Ext.form.Checkbox({
    name        : 'check_availbility',
    fieldLabel  : 'Check availability',
    checked     : false
  });
  var ftaCheck   = new Ext.form.Checkbox({
    name        : 'encrypted',
    fieldLabel  : 'Include encrypted services',
    checked     : false,
    // TODO: make dependent on CSA config
  });
  var mergeCheck = new Ext.form.Checkbox({
    name        : 'merge_same_name',
    fieldLabel  : 'Merge same name',
    checked     : false
  });
  var provtagCheck = new Ext.form.Checkbox({
    name        : 'provider_tags',
    fieldLabel  : 'Create provider tags',
    checked     : false
  });
  // TODO: provider list
  items = [ availCheck, ftaCheck, mergeCheck, provtagCheck ];

  /* Form */
  var undoBtn = new Ext.Button({
    text    : 'Cancel',
    handler : function () {
      win.close();
    }
  });

  var saveBtn = new Ext.Button({  
    text    : 'Map',
    tooltip : 'Begin mapping',
    handler : function () {
      panel.getForm().submit({
        url         : 'api/service_mapping',
        params      : { op: 'start' },
        waitMessage : 'Mapping services...'
      });
    } 
  });

  panel = new Ext.FormPanel({
    frame       : true,
    border      : true,
    bodyStyle   : 'padding: 5px',
    labelAlign  : 'left',
    labelWidth  : 200,
    autoWidth   : true,
    autoHeight  : true,
    defaultType : 'textfield',
    buttonAlign : 'left',
    items       : items,
    buttons     : [ undoBtn, saveBtn ]
  });
   
  /* Create window */
  win = new Ext.Window({
    title       : 'Map services',
    layout      : 'fit',
    autoWidth   : true,
    autoHeight  : true,
    plain       : true,
    items       : panel
  });

  win.show();
}

/**
 *
 */
tvheadend.mergeChannel = function(chan) {

	function doMerge() {
		panel.getForm().submit({
			url : 'mergechannel/' + chan.chid,
			success : function() {
				win.close();
			}
		});
	}

	var panel = new Ext.FormPanel({
		frame : true,
		border : true,
		bodyStyle : 'padding:5px',
		labelAlign : 'right',
		labelWidth : 110,
		defaultType : 'textfield',
		items : [ new Ext.form.ComboBox({
			store : tvheadend.channels,
			fieldLabel : 'Target channel',
			name : 'targetchannel',
			hiddenName : 'targetID',
			editable : false,
			allowBlank : false,
			triggerAction : 'all',
			mode : 'remote',
			displayField : 'name',
			valueField : 'chid',
			emptyText : 'Select a channel...'
		}) ],
		buttons : [ {
			text : 'Merge',
			handler : doMerge
		} ]
	});

	win = new Ext.Window({
		title : 'Merge channel ' + chan.name + ' into...',
		layout : 'fit',
		width : 500,
		height : 120,
		modal : true,
		plain : true,
		items : panel
	});
	win.show();

}

/**
 *
 */
tvheadend.chconf = function() {
	var fm = Ext.form;

	var actions = new Ext.ux.grid.RowActions({
		header : '',
		dataIndex : 'actions',
		width : 45,
		actions : [ {
			iconCls : 'merge',
			qtip : 'Merge this channel with another channel',
			cb : function(grid, record, action, row, col) {
				tvheadend.mergeChannel(record.data);
			}
		} ]
	});

	var cm = new Ext.grid.ColumnModel([ {
		header : "Number",
		dataIndex : 'number',
		sortable : true,
		width : 50,
		renderer : function(value, metadata, record, row, col, store) {
			if (!value) {
				return '<span class="tvh-grid-unset">Not set</span>';
			}
			else {
				return value;
			}
		},

		editor : new fm.NumberField({
			minValue : 0,
			maxValue : 9999
		})
	}, {
		header : "Name",
		dataIndex : 'name',
    sortable: true,
		width : 150,
		editor : new fm.TextField({
			allowBlank : false
		})
	}, {
		header : "Play",
		dataIndex : 'chid',
		width : 50,
		renderer : function(value, metadata, record, row, col, store) {
			url = 'playlist/channelid/' + value
			return "<a href=\"javascript:tvheadend.VLC('" + url + "')\">Play</a>"
		}
	}, {
		header : "EPG Grab source",
		dataIndex : 'epggrabsrc',
    hiddenName : 'epggrabsrc',
		width : 150,
		editor : new Ext.ux.form.LovCombo({
			loadingText : 'Loading...',
			store : tvheadend.epggrabChannels,
			allowBlank : true,
			typeAhead : true,
			minChars : 2,
			lazyRender : true,
			triggerAction : 'all',
			mode : 'remote',
			displayField : 'mod-name',
			valueField : 'mod-id'
		})
	}, {
		header : "Tags",
		dataIndex : 'tags',
		width : 300,
		renderer : function(value, metadata, record, row, col, store) {
			if (typeof value === 'undefined' || value.length < 1) {
				return '<span class="tvh-grid-unset">No tags</span>';
			}

			ret = [];
			tags = value.split(',');
			for ( var i = 0; i < tags.length; i++) {
				var tag = tvheadend.channelTags.getById(tags[i]);
				if (typeof tag !== 'undefined') {
					ret.push(tag.data.name);
				}
			}
			return ret.join(', ');
		},
		editor : new Ext.ux.form.LovCombo({
			store : tvheadend.channelTags,
			mode : 'local',
			valueField : 'identifier',
			displayField : 'name'
		})
	}, {
		header : "Icon (full URL)",
		dataIndex : 'ch_icon',
		width : 200,
		editor : new fm.TextField()
	}, {
		header : "DVR Pre-Start",
		dataIndex : 'epg_pre_start',
		width : 100,

		renderer : function(value, metadata, record, row, col, store) {
			if (!value) {
				return '<span class="tvh-grid-unset">Not set</span>';
			}
			else {
				return value + ' min';
			}
		},

		editor : new fm.NumberField({
			minValue : 0,
			maxValue : 1440
		})
	}, {
		header : "DVR Post-End",
		dataIndex : 'epg_post_end',
		width : 100,
		renderer : function(value, metadata, record, row, col, store) {
			if (!value) {
				return '<span class="tvh-grid-unset">Not set</span>';
			}
			else {
				return value + ' min';
			}
		},

		editor : new fm.NumberField({
			minValue : 0,
			maxValue : 1440
		})
	}, actions ]);

	function delSelected() {
		var selectedKeys = grid.selModel.selections.keys;
		if (selectedKeys.length > 0) {
			Ext.MessageBox.confirm('Message',
				'Do you really want to delete selection?', deleteRecord);
		}
		else {
			Ext.MessageBox.alert('Message',
				'Please select at least one item to delete');
		}
	}

  function addRecord() {
    Ext.Ajax.request({
      url : "channels",
      params : {
        op : "create"
      },
      failure : function(response, options) {
        Ext.MessageBox.alert('Server Error', 'Unable to create new record');
      },
      success : function(response, options) {
        var responseData = Ext.util.JSON.decode(response.responseText);
        var p = new tvheadend.channelrec(responseData, responseData.id);
        grid.stopEditing();
        store.insert(0, p)
        grid.startEditing(0, 0);
      }
    })
  }

	function deleteRecord(btn) {
		if (btn == 'yes') {
			var selectedKeys = grid.selModel.selections.keys;

			Ext.Ajax.request({
				url : "channels",
				params : {
					op : "delete",
					entries : Ext.encode(selectedKeys)
				},
				failure : function(response, options) {
					Ext.MessageBox.alert('Server Error', 'Unable to delete');
				}
			})
		}
	}

	function saveChanges() {
		var mr = tvheadend.channels.getModifiedRecords();
		var out = new Array();
		for ( var x = 0; x < mr.length; x++) {
			v = mr[x].getChanges();
			out[x] = v;
			out[x].id = mr[x].id;
		}

		Ext.Ajax.request({
			url : "channels",
			params : {
				op : "update",
				entries : Ext.encode(out)
			},
			success : function(response, options) {
				tvheadend.channels.commitChanges();
			},
			failure : function(response, options) {
				Ext.MessageBox.alert('Message', response.statusText);
			}
		});
	}

	var selModel = new Ext.grid.RowSelectionModel({
		singleSelect : false
	});

  var addBtn = new Ext.Toolbar.Button({
    tooltop : 'Add a new channel',
    iconCls : 'add',
    text    : 'Add channel',
    handler : addRecord
  });

	var delBtn = new Ext.Toolbar.Button({
		tooltip : 'Delete one or more selected channels',
		iconCls : 'remove',
		text : 'Delete selected',
		handler : delSelected,
		disabled : true
	});

	selModel.on('selectionchange', function(s) {
		delBtn.setDisabled(s.getCount() == 0);
	});

	var saveBtn = new Ext.Toolbar.Button({
		tooltip : 'Save any changes made (Changed cells have red borders).',
		iconCls : 'save',
		text : "Save changes",
		handler : saveChanges,
		disabled : true
	});

	var rejectBtn = new Ext.Toolbar.Button({
		tooltip : 'Revert any changes made (Changed cells have red borders).',
		iconCls : 'undo',
		text : "Revert changes",
		handler : function() {
			tvheadend.channels.rejectChanges();
		},
		disabled : true
	});

  var mapButton = new Ext.Toolbar.Button({
    tooltip : 'Map services to channels',
    iconCls : '',
    text    : 'Map Services',
    handler : tvheadend.mapServices,
    disabled : false
  });

	var grid = new Ext.grid.EditorGridPanel({
		stripeRows : true,
		title : 'Channels',
		iconCls : 'television',
		store : tvheadend.channels,
		plugins : [ actions ],
		clicksToEdit : 2,
		cm : cm,
		viewConfig : {
			forceFit : true
		},
		selModel : selModel,
		tbar : [ addBtn, '-', delBtn, '-', saveBtn, rejectBtn, '-', mapButton, '->', {
			text : 'Help',
			handler : function() {
				new tvheadend.help('Channels', 'config_channels.html');
			}
		} ]
	});

	tvheadend.channels.on('update', function(s, r, o) {
		d = s.getModifiedRecords().length == 0
		saveBtn.setDisabled(d);
		rejectBtn.setDisabled(d);
	});

	tvheadend.channelTags.on('load', function(s, r, o) {
		if (grid.rendered) grid.getView().refresh();
	});

	return grid;
}
