var treeSelectedNodes;
var treeSelectedNode;
$(function() {
	
	if ( $.cookie("lastzkhost") != null ) {
		$("#zkhost").val( $.cookie("lastzkhost") );
	}
	
	$("#connectBtn").click(function() {
		var hosts = $("#zkhost").val().split(",");
		hosts.forEach(function(host, i) {
			if ( host.indexOf(":") < 0 ) {
				hosts[i] = host+":2181";
			}
		});
		$("#zkhost").val(hosts.join(","));
		$.post("/zk/connect", { zkhost: $("#zkhost").val() }, function (data) {
			if ( data.status == "ok" ) {
				
				$.cookie("lastzkhost", $("#zkhost").val())
				
				displaySuccess("Successfully connected to Zookeeper: " + $("#zkhost").val() + ".");
				$("#connectform").hide();
				$("#connectedform").show();
				$(".hero-unit").hide();
				$(".treecontainer").show();
				
				constructNewTree();
				
			} else {
				displayError(data.error);
			}
		});
	});
	$("#navBtn").click(function() {
		if ( $("#navigate").val().indexOf("/") != 0 ) {
			displayError("Path " + $("#navigate").val() + " is incorrect.");
		}
		exists($("#navigate").val(), function(data) {
			if ( data.exists ) {
				alert("Handle exists...");
			} else {
				displayError("Path " + $("#navigate").val() + " does not exist.")
			}
		});
	});
	$("#btnDisconnect").click(function() {
		$.post("/zk/disconnect", function(data) {
			treeSelectedNodes = null;
			$("#connectedform").hide();
			$("#connectform").show();
			$(".hero-unit").show();
			$(".treecontainer").hide();
			$("#tree").dynatree('destroy');
			$("#tree").empty();
			displaySuccess("Disconnected from Zookeeper.")
		});
	});
	$("#btnDeleteSafe").click(function() {
		if ( treeSelectedNode == null ) {
			displayError("No active node. Nothing to delete.");
		} else {
			deleteSafe( getPathFromRoot( treeSelectedNode ), function( data) {
				if ( data.status == "ok" ) {
					treeSelectedNode.parent.removeChild(treeSelectedNode);
					treeSelectedNode = null;
					$("#node").empty();
					$("#node").append("<p>No node selected.</p>");
					displaySuccess("Node " + data.path + " removed.");
				} else {
					displayError("Path " + data.path +" isn't empty. Not removed.");
				}
			});
		}
	});
	$("#btnDeleteUnsafe").click(function() {
		if ( treeSelectedNode == null ) {
			displayError("No active node. Nothing to delete.");
		} else {
			displayUnsafeDeleteConfirmation();
		}
	});
	$("#btnRefresh").click(function() {
		if ( treeSelectedNode == null ) {
			$("#tree").dynatree("destroy");
			constructNewTree();
			displaySuccess("Tree reloaded from the root.");
		} else {
			treeSelectedNode.removeChildren();
			get_children(getPathFromRoot( treeSelectedNode ), function(result) {
				if (result.children.length == 0) {
					treeSelectedNode.addChild({ isFolder: false, title: "no children", hideCheckbox: true });
				} else {
					result.children.forEach(function(child) {
						treeSelectedNode.addChild({ isFolder: true, title: child, children: [ { title: "loading...", hideCheckbox: true } ] });
					});
				}
				displaySuccess("Node " + result.path + " reloaded successfully.");
			});
			loadNodeStatsAndData(treeSelectedNode);
		}
	});
	
	$("#btnCreate").click(function() {
		if ( treeSelectedNode == null ) {
			alert("add node to root...");
		} else {
			displayNewNodeForm();
		}
	});
	
});

function getPathFromRoot(node) {
	var elems = [];
	var current = node;
	while (current.data.title != null) {
		elems.push(current.data.title);
		current = current.parent;
	}
	return "/" + elems.reverse().join("/");
}

function displayError( message ) {
	$(".alert").remove();
	$("#main").prepend("<div class='alert alert-error'><button type='button' class='close' data-dismiss='alert'>x</button><strong>"+message+"</strong></div>");
}
function displaySuccess( message ) {
	$(".alert").remove();
	$("#main").prepend("<div class='alert alert-success'><button type='button' class='close' data-dismiss='alert'>x</button><strong>"+message+"</strong></div>");
}
function displayUnsafeDeleteConfirmation() {
	$(".alert").remove();
	$("#main").prepend("<div class='alert alert-block unsafe-confirm'>"
		+ "<h4>Warning</h4>"
		+ "You are about to remove a node that may contain one or more children. Are you sure you want to continue?<br/>"
		+ "<button id='btnUnsafeDeleteConfirm' class='btn btn-warning' type='button'>Yes, delete</button> "
		+ "<button id='btnUnsafeDeleteCancel' class='btn' type='button'>Cancel</button>"
		+ "</div>");
	$("#btnUnsafeDeleteConfirm").click(function() {
		deleteUnsafe( getPathFromRoot( treeSelectedNode ), function(data) {
			treeSelectedNode.parent.removeChild(treeSelectedNode);
					treeSelectedNode = null;
					$("#node").empty();
					$("#node").append("<p>No node selected.</p>");
					displaySuccess("Node " + data.path + " removed with children.");
		});
	});
	$("#btnUnsafeDeleteCancel").click(function() {
		$(".unsafe-confirm").remove();
	});
}

function displayNewNodeForm() {
	$(".alert").remove();
	$("#main").prepend("<div class='alert alert-block alert-success new-node'>"
		+ "<h4>Create new child</h4>"
		+ "You are about to add new child to " + getPathFromRoot( treeSelectedNode ) + "<br/>"
		+ "Name of the new node: <input type='text' id='newNodeName' placeholder='a_name' /><br/>"
		+ "<button id='btnNewNodeCreate' class='btn btn-primary' type='button'>Create</button> "
		+ "<button id='btnNewNodeCancel' class='btn' type='button'>Cancel</button>"
		+ "</div>");
	$("#btnNewNodeCreate").click(function() {
		if ($("#newNodeName").val() == "") {
			displayError("Node name can't be empty.");
		} else {
			create(getPathFromRoot( treeSelectedNode ), $("#newNodeName").val(), function(data) {
				if ( data.status == "ok" ) {
					displaySuccess("Node " + data.path + " created sucessfully.");
					treeSelectedNode.addChild({ title: data.newnode, isFolder: true, children: [ { title: "loading...", hideCheckbox: true } ] });
				} else {
					displayError("Node " + data.path + " not created. Source error: '" + data.error + "'.");
				}
			});
		}
	})
}

function constructNewTree() {
	get_children("/", function(data) {
		var nodes = [];
		data.children.forEach(function(item) {
			nodes.push({ title: item, isFolder: true, children: [ { title: "loading...", hideCheckbox: true } ] });
		})
		
		$("#tree").dynatree({
			children: nodes
			, checkbox: true
			, onExpand: function(flag, node) {
				var path = getPathFromRoot( node );
				$("#navigate").val(path);
				if ( flag == false ) return;
				// continue only when expanding:
				get_children( path, function(result) {
					node.removeChildren();
					var nodes = [];
					if (result.children.length == 0) {
						node.addChild({ isFolder: false, title: "no children", hideCheckbox: true });
					} else {
						result.children.forEach(function(child) {
							node.addChild({ isFolder: true, title: child, children: [ { title: "loading...", hideCheckbox: true } ] });
						});
					}
				});
			},
			onSelect: function(flag, node) {
				treeSelectedNodes = node.tree.getSelectedNodes();
			}, onActivate: function(node) {
				loadNodeStatsAndData(node);
			}
		});
		
	});
}

function loadNodeStatsAndData(node) {
	$(".unsafe-confirm").remove();
	$(".new-node").remove();
	treeSelectedNode = node;
	var path = getPathFromRoot( node );
	get(path, function(data) {
		$("#node").empty();
		$("#node").append("<p>Node:<br/><strong>" + data.path + "</strong></p>");
		$("#node").append("<form class='form-horizontal' id='stats'></form>")
		for ( var key in data.stat ) {
			$("#stats").append("<div class='control-group'><label class='control-label' for='" + key + "'>" + key + "</label><div class='controls'><span>" + data.stat[key] + "</span></div></div>");
		}
		$("#node").append("<p>Data for this node:<br/><strong>" + (data.data == "" ? "&lt;no data&gt;" : data.data) + "</strong></p>");
	});
}

function get_children(path, callback) {
	$.post("/zk/children", { path: path }, function (data) {
		callback(data);
	});
}
function exists(path, callback) {
	$.post("/zk/exists", { path: path }, function (data) {
		callback(data);
	});
}
function get(path, callback) {
	$.post("/zk/get", { path: path }, function (data) {
		callback(data);
	});
}
function deleteSafe(path, callback) {
	$.post("/zk/delete/safe", { path: path }, function (data) {
		callback(data);
	});
}
function deleteUnsafe(path, callback) {
	$.post("/zk/delete/unsafe", { path: path }, function (data) {
		callback(data);
	});
}
function create(path, nodename, callback) {
	$.post("/zk/create", { path: path, nodename: nodename }, function (data) {
		callback(data);
	});
}
