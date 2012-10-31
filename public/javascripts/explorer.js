Array.prototype.remove = function(from, to) {
	var rest = this.slice((to || from) + 1 || this.length);
	this.length = from < 0 ? this.length + from : from;
	return this.push.apply(this, rest);
};

var treeSelectedNodes = [];
var treeSelectedNode;

var currentSession;
var currentConnection;
var socket;

var notifications = [];
var navigateQueue = [];

$(function() {
	
	$.getJSON("/isLoggedIn", function(data) {
		if ( data.status == true ) {
			$("#btnAuth").addClass("active");
		}
	});
	
	socket = io.connect(location.protocol+"//"+location.hostname+(location.port=="")?"":":"+location.port);
	socket.on("watcher_children", function(data) {
		if ( data.session == currentSession && data.connection == currentConnection ) {
			if ( getPathFromRoot( treeSelectedNode ) == data.path ) {
				$("#btnRefresh").trigger("click");
				notifications.unshift({ message: "Children for <strong>" + data.path + "</strong> have changed.", seen: false });
				updateNotifications();
			} else {
				notifications.unshift({ message: "Children for <strong>" + data.path + "</strong> have changed.", seen: false });
				updateNotifications();
			}
		}
	});
	socket.on("watcher_data", function(data) {
		if ( data.session == currentSession && data.connection == currentConnection ) {
			if ( getPathFromRoot( treeSelectedNode ) == data.path ) {
				loadNodeStatsAndData( treeSelectedNode );
				notifications.unshift({ message: "Data for <strong>" + data.path + "</strong> has changed.", seen: false });
				updateNotifications();
			} else {
				notifications.unshift({ message: "Data for <strong>" + data.path + "</strong> has changed.", seen: false });
				updateNotifications();
			}
		}
	});
	socket.on("disconnect", function() {
		$("#btnDisconnect").trigger("click");
		setTimeout(function() { displayError("Server has closed the connection.") }, 100);
	});
	
	getConnectionHistory();
	
	$("#btnConnect").click(function() {
		var hosts = $("#zkhost").val().split(",");
		hosts.forEach(function(host, i) {
			if ( host.indexOf(":") < 0 ) {
				hosts[i] = host+":2181";
			}
		});
		$("#zkhost").val(hosts.join(","));
		$.post("/zk/connect", { zkhost: $("#zkhost").val() }, function (data) {
			if ( data.status == "ok" ) {
				
				currentSession = data.session;
				currentConnection = data.connection;
				
				setConnectionHistory($("#zkhost").val());
				
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
	$("#btnNavigate").click(function() {
		if ( $("#navigate").val() == "" ) {
			$("#navigate").val("/");
		}
		if ( $("#navigate").val().indexOf("/") != 0 ) {
			displayError("Path " + $("#navigate").val() + " is incorrect.");
		}
		exists($("#navigate").val(), function(data) {
			if ( data.exists ) {
				if ( data.path == "/" ) {
					$("#tree").dynatree("getTree").getRoot().activate();
				} else {
					var path = data.path.substr(1, data.path.length); // remove / from the beginning...
					var pathParts = path.split("/");
					var children = $("#tree").dynatree("getTree").getRoot().getChildren();
					children.forEach(function(child) {
						if ( child.data.title == pathParts[0] ) {
							pathParts.shift();
							navigateQueue = pathParts;
							child.activate();
							child.expand();
						}
					});
				}
				
			} else {
				displayError("Path " + $("#navigate").val() + " does not exist.")
			}
		});
	});
	$("#btnDisconnect").click(function() {
		$.post("/zk/disconnect", function(data) {});
		treeSelectedNodes = null;
		$("#connectedform").hide();
		$("#connectform").show();
		$(".hero-unit").show();
		$(".treecontainer").hide();
		$("#tree").dynatree('destroy');
		$("#tree").empty();
		displaySuccess("Disconnected from Zookeeper.");
		notification = [];
		updateNotSeenCounter();
	});
	$("#btnDeleteSafe").click(function() {
		
		if ( treeSelectedNodes.length == 0 ) {
			if ( treeSelectedNode == null ) {
				displayError("No active node. Nothing to delete.");
			} else {
				deleteSafe( getPathFromRoot( treeSelectedNode ), function( data) {
					if ( data.status == "ok" ) {
						var parent = treeSelectedNode.parent;
						treeSelectedNode.parent.removeChild(treeSelectedNode);
						if ( !parent.hasChildren() ) {
							parent.addChild({ isFolder: false, title: "no children", hideCheckbox: true });
						}
						treeSelectedNode = null;
						$("#node").empty();
						$("#node").append("<p>No node selected.</p>");
						displaySuccess("Node " + data.path + " removed.");
					} else if ( data.error == "not_empty" ) {
						displayError("Path " + data.path +" isn't empty. Not removed.");
					} else if ( data.error == "no_auth" ) {
						displayError("You have to authenticated to remove the node.");
					}
				});
			}
		} else {
			var tested = 0;
			var nonEmpty = [];
			var empty = [];
			treeSelectedNodes.forEach(function(node) {
				var path = getPathFromRoot( node );
				get(path, function(data) {
					tested++;
					if ( data.stat.numChildren > 0 ) {
						nonEmpty.push( data.path );
					} else {
						empty.push( node );
					}
					if ( tested == treeSelectedNodes.length ) {
						if ( nonEmpty.length > 0 ) {
							var err = "Operation could not be cpompleted, following nodes are not empty:<ul>";
							nonEmpty.forEach(function(n, index) {
								if ( index < 5 ) {
									err += "<li>" + n + "</li>";
								}
								if ( index == 4 ) {
									err += "<li>... and " + (nonEmpty.length-5) + " more</li>";
								}
							})
							err += "</ul>";
							displayError(err);
						} else {
							var deleted = 0;
							var notDeleted = 0;
							var notAuthenticated = 0;
							empty.forEach(function(n) {
								deleteSafe( getPathFromRoot( n ), function( data) {
									if ( data.status == "ok" ) {
										var parent = n.parent;
										n.parent.removeChild(n);
										if ( !parent.hasChildren() ) {
											parent.addChild({ isFolder: false, title: "no children", hideCheckbox: true });
										}
										deleted++;
									} else if ( data.error == "not_empty" ) {
										notDeleted++;
									} else if ( data.error == "no_auth" ) {
										notAuthenticated++;
										notDeleted++;
									}
									if ( notDeleted+deleted == empty.length ) {
										if ( notAuthenticated > 0 ) {
											displayError("Nodes could not be deleted, you need to authenticate first.");
										} else {
											if ( notDeleted > 0 ) {
												displayWarning(deleted + " node(s) successfully deleted but " + notDeleted + " could not be deleted.");
											} else {
												displaySucess(deleted + " node(s) successfully deleted.");
											}
										}
									}
								});
							});
						}
					}
				});
			})
		}
	});
	$("#btnDeleteUnsafe").click(function() {
		if ( treeSelectedNode == null && treeSelectedNodes.length == 0 ) {
			displayError("No active node. Nothing to delete.");
		} else {
			displayUnsafeDeleteConfirmation();
		}
	});
	$("#btnRefresh").click(function() {
		if ( treeSelectedNode == null ) {
			$("#tree").dynatree("destroy");
			constructNewTree();
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
			});
			loadNodeStatsAndData(treeSelectedNode);
		}
	});
	
	$("#btnCreate").click(function() {
		displayNewNodeForm();
	});
	
	$("#btnEditData").click(function() {
		if ( treeSelectedNode == null ) {
			displayError("No node selected, no data to modify.")
		} else {
			get(getPathFromRoot( treeSelectedNode ), function(data) {
				displayDataModificationForm(data.data, data.stat.version);
			});
		}
	});
	
	$("#btnWatch").click(function() {
		if ( $(this).hasClass("active") ) {
			$(this).removeClass("active");
			watcherRemove( getPathFromRoot( (treeSelectedNode == null ? $("#tree").dynatree('getRoot') : treeSelectedNode ) ) );
		} else {
			$(this).addClass("active");
			watcherRegister( getPathFromRoot( (treeSelectedNode == null ? $("#tree").dynatree('getRoot') : treeSelectedNode ) ) );
		}
	});
	
	$("#btnAuth").click(function() {
		if ( $(this).hasClass("active") ) {
			$(this).removeClass("active");
			$.post("/logout", {}, function (data) {
				displaySuccess("You have logged out.");
			});
		} else {
			displayLoginForm();
		}
	});
	
	$("#notifications").poshytip({
		className: 'tip-twitter',
		bgImageFrameSize: 11,
		alignX: 'inner-left',
		alignY: 'bottom',
		offsetY: 20,
		offsetX: -123,
		content: function(updateCallback) {
			if ( notifications.length == 0 ) {
				return "No notifications available.";
			} else {
				var container = $('<div/>').addClass('notifications-display');
				$.each(notifications, function(i, notification) {
					$('<span/>')
						.html(notification.message+"<br/>")
						.appendTo(container);
				});
				return container;
			}
		}
	});
	$("#notifications").click(function(event) {
		event.preventDefault();
	});
	$("#notifications").mouseover(function(event) {
		notifications.forEach(function(notification) {
			notification.seen = true;
		});
		updateNotifications();
	})
});

function getPathFromRoot(node) {
	if ( node == null ) {
		return "/";
	}
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
function displayWarning( message ) {
	$(".alert").remove();
	$("#main").prepend("<div class='alert alert-block'><button type='button' class='close' data-dismiss='alert'>x</button><strong>"+message+"</strong></div>");
}
function displayUnsafeDeleteConfirmation() {
	$(".alert").remove();
	$("#main").prepend("<div class='alert alert-block unsafe-confirm'>"
		+ "<h4>Warning</h4>"
		+ (treeSelectedNodes.length
			? "You are about to remove " + treeSelectedNodes.length + " nodes that may contain one or more children. Are you sure you want to continue?<br/>"
			: "You are about to remove a node that may contain one or more children. Are you sure you want to continue?<br/>" )
		+ "<button id='btnUnsafeDeleteConfirm' class='btn btn-warning' type='button'>Yes, delete</button> "
		+ "<button id='btnUnsafeDeleteCancel' class='btn' type='button'>Cancel</button>"
		+ "</div>");
	$("#btnUnsafeDeleteConfirm").click(function() {
		
		if ( treeSelectedNodes.length == 0 ) {
			deleteUnsafe( getPathFromRoot( treeSelectedNode ), function(data) {
				if ( data.error == "no_auth" ) {
					displayError("You have to authenticated to remove the node.");
					return;
				}
				var parent = treeSelectedNode.parent;
				treeSelectedNode.parent.removeChild(treeSelectedNode);
				if ( !parent.hasChildren() ) {
					parent.addChild({ isFolder: false, title: "no children", hideCheckbox: true });
				}
				treeSelectedNode = null;
				$("#node").empty();
				$("#node").append("<p>No node selected.</p>");
				displaySuccess("Node " + data.path + " removed with children.");
			});
		} else {
			var deleted = 0;
			var notDeleted = 0;
			var notAuthenticated = 0;
			treeSelectedNodes.forEach(function(node) {
				deleteUnsafe( getPathFromRoot( node ), function(data) {
					if ( data.error == "no_auth" ) {
						notDeleted++;
						notAuthenticated++;
					} else {
						deleted++;
						var parent = node.parent;
						node.parent.removeChild(node);
						if ( !parent.hasChildren() ) {
							parent.addChild({ isFolder: false, title: "no children", hideCheckbox: true });
						}
					}
					if ( deleted + notDeleted == treeSelectedNodes.length ) {
						if ( notAuthenticated > 0 ) {
							displayError("Nodes could not be deleted, you need to authenticate first.");
						} else {
							displaySuccess(deleted + " node(s) successfully deleted.");
						}
					}
				});
			});
		}
		
	});
	$("#btnUnsafeDeleteCancel").click(function() {
		$(".unsafe-confirm").remove();
	});
}

function displayLoginForm() {
	$(".alert").remove();
	$("#main").prepend("<div class='alert alert-block alert-success login-box'>"
		+ "<h4>Authenticate</h4>"
		+ "Administrative username: <input type='text' id='username' placeholder='username' />, password: <input type='password' id='password' placeholder='password' /><br/>"
		+ "<button id='btnLogin' class='btn btn-primary' type='button'>Login</button> "
		+ "<button id='btnLoginCancel' class='btn' type='button'>Cancel</button>"
		+ "</div>");
	setTimeout(function() {
		$("#username").focus();
		$("#username").keydown(function(event) {
			if ( event.which == 13 ) {
				$("#btnLogin").trigger('click');
			}
			if ( event.which == 27 ) {
				$("#btnLoginCancel").trigger('click');
			}
		});
		$("#password").keydown(function(event) {
			if ( event.which == 13 ) {
				$("#btnLogin").trigger('click');
			}
			if ( event.which == 27 ) {
				$("#btnLoginCancel").trigger('click');
			}
		});
	}, 100);
	
	$("#btnLogin").click(function() {
		if ($("#username").val() == "" || $("#password").val() == "") {
			displayError("Credentials required.");
		} else {
			$.post("/login", { username: $("#username").val(), password: $("#password").val() }, function (data) {
				if ( data.status == "ok" ) {
					displaySuccess("You are now authenticated.");
					$("#btnAuth").addClass("active");
				} else {
					displayError("Username or password incorrect.");
				}
			});
		}
	});
	$("#btnLoginCancel").click(function() {
		$(".login-box").remove();
	});
}

function displayNewNodeForm() {
	$(".alert").remove();
	$("#main").prepend("<div class='alert alert-block alert-success new-node'>"
		+ "<h4>Create new child</h4>"
		+ "You are about to add new child to " + getPathFromRoot( (treeSelectedNode == null ? $("#tree").dynatree('getRoot') : treeSelectedNode ) ) + "<br/>"
		+ "Name of the new node: <input type='text' id='newNodeName' placeholder='a_name' /><br/>"
		+ "<button id='btnNewNodeCreate' class='btn btn-primary' type='button'>Create</button> "
		+ "<button id='btnNewNodeCancel' class='btn' type='button'>Cancel</button>"
		+ "</div>");
	setTimeout(function() {
		$("#newNodeName").focus();
		$("#newNodeName").keydown(function(event) {
			if ( event.which == 13 ) {
				$("#btnNewNodeCreate").trigger('click');
			}
			if ( event.which == 27 ) {
				$("#btnNewNodeCancel").trigger('click');
			}
		});
	}, 100);
	
	$("#btnNewNodeCreate").click(function() {
		if ($("#newNodeName").val() == "") {
			displayError("Node name can't be empty.");
		} else {
			var path = getPathFromRoot( treeSelectedNode == null ? $("#tree").dynatree('getRoot') : treeSelectedNode );
			create(path, $("#newNodeName").val(), function(data) {
				if ( data.status == "ok" ) {
					displaySuccess("Node " + data.path + " created sucessfully.");
					$("#btnRefresh").trigger("click");
				} else {
					if ( data.error == "no_auth" ) {
						displayError("You have to authenticated to remove the node.");
					} else {
						displayError("Node " + data.path + " not created. Source error: '" + data.error + "'.");
					}
				}
			});
		}
	});
	$("#btnNewNodeCancel").click(function() {
		$(".new-node").remove();
	});
}

function displayDataModificationForm(currentData, currentVersion) {
	$(".alert").remove();
	$("#main").prepend("<div class='alert alert-block alert-success data-modification'>"
		+ "<h4>Edit node data</h4>"
		+ "Modify the data for node " + getPathFromRoot( treeSelectedNode ) + "<br/>"
		+ "<input type='hidden' id='nodeVersion' value='" + currentVersion + "' />"
		+ "New data: <input type='text' id='nodeData' placeholder='" + ((currentData=="") ? "<no data>" : currentData ) + "' /><br/>"
		+ "<button id='btnUpdateDataConfirm' class='btn btn-primary' type='button'>Update data</button> "
		+ "<button id='btnUpdateDataCancel' class='btn' type='button'>Cancel</button>"
		+ "</div>");
	setTimeout(function() {
		$("#nodeData").focus();
		$("#nodeData").keydown(function(event) {
			if ( event.which == 13 ) {
				$("#btnUpdateDataConfirm").trigger('click');
			}
			if ( event.which == 27 ) {
				$("#btnUpdateDataCancel").trigger('click');
			}
		});
	}, 100);
	
	$("#btnUpdateDataConfirm").click(function() {
		set(getPathFromRoot( treeSelectedNode ), $("#nodeData").val(), $("#nodeVersion").val(), function(data) {
			if ( data.status == "ok" ) {
				displaySuccess("Data for node " + data.path + " updated sucessfully.");
				loadNodeStatsAndData(treeSelectedNode);
			} else {
				if ( data.error == "no_auth" ) {
					displayError("You have to authenticated to remove the node.");
				} else {
					displayError("Data for node " + data.path + " not updated. Source error: '" + data.error + "'.");
				}
			}
		});
	});
	
	$("#btnUpdateDataCancel").click(function() {
		$(".data-modification").remove();
	});
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
						
						if ( navigateQueue.length > 0 ) {
							var item = navigateQueue.shift();
							console.log(item);
							var children = node.getChildren();
							children.forEach(function(child) {
								if ( child.data.title == item ) {
									child.activate();
									child.expand();
								}
							});
						}
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
	$(".data-modification").remove();
	$("#btnWatch").removeClass("active");
	treeSelectedNode = node;
	var path = getPathFromRoot( node );
	get(path, function(data) {
		
		watcherExists(data.path, function(result) {
			if ( result.status == "ok" ) {
				$("#btnWatch").addClass("active");
			}
		});
		
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
function set(path, nodedata, version, callback) {
	$.post("/zk/set", { path: path, data: nodedata, version: version }, function (data) {
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

function watcherRegister(path, callback) {
	$.post("/zk/watcher/register", { path: path }, function (data) {
		if ( callback ) { callback(data); }
	});
}

function watcherRemove(path, callback) {
	$.post("/zk/watcher/remove", { path: path }, function (data) {
		if ( callback ) { callback(data); }
	});
}

function watcherExists(path, callback) {
	$.post("/zk/watcher/exists", { path: path }, function (data) {
		callback(data);
	});
}

function getConnectionHistory() {
	var history = $.cookie("zkhistory");
	if ( history != null ) {
		history = history.split("^");
		if ( history.length > 0 ) {
			$("#zkhost").val( history[0] );
		}
		$("#zkhistory").empty();
		$("#zkhistory").append("<p>Recent connections:</p>");
		var html = "<ol>";
		history.forEach(function(entry) {
			html += "<li><a href='#' class='history' data='" + entry + "'>" + entry + "</a></li>";
		});
		html += "</ol>";
		$("#zkhistory").append(html);
		$(".history").click(function(event) {
			event.preventDefault();
			$("#zkhost").val( $(this).attr("data") );
			$("#btnConnect").trigger("click");
		});
	}
}

function setConnectionHistory(hosts) {
	var history = $.cookie("zkhistory");
	if ( history != null ) {
		history = history.split("^");
		if ( history.indexOf(hosts) > -1 ) {
			history.remove( history.indexOf(hosts) );
		}
		history.unshift( hosts );
		$.cookie("zkhistory", history.join("^"), { expires: 365 });
	} else {
		$.cookie("zkhistory", hosts, { expires: 365 });
	}
}

function updateNotifications() {
	var count = 0;
	notifications.forEach(function(item) {
		if ( !item.seen ) {
			count++;
		}
	});
	$(".badge-info").html(count);
}
