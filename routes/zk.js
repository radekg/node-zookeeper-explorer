var ZK = require ("zookeeper").ZooKeeper;

/*
 * GET users listing.
 */



exports.connect = function(req, res) {
	var connected = false;
	var timeout = 10000;
	if ( req.param("zkhost", null) == null ) {
		res.send({ status: "error", error: "No host to connect to." });
	} else {
		var zk = new ZK();
		zk.init ( {connect:req.param("zkhost", null), timeout:timeout, debug_level:ZK.ZOO_LOG_LEVEL_WARNING, host_order_deterministic:false});
		setTimeout(function() {
			if ( !connected ) {
				res.json({ status: "error", error: "Not connected to " + req.param("zkhost", null) });
			}
		}, timeout);
		zk.on (ZK.on_connected, function (zkk) {
			req.app.ZK = zkk;
			res.json({ status: "ok" });
			connected = true;
		});
		zk.on(ZK.on_closed,function(zkk) {
			res.json({ status: "error", error: "Not connected to " + req.param("zkhost", null) });
		});
	}
};

exports.disconnect = function(req, res) {
	req.app.ZK.close();
	req.app.ZK = null;
	res.json({ status: "ok" });
};

exports.children = function(req, res) {
	req.app.ZK.a_get_children(req.param("path"), null, function(rc,error,children) {
		if ( rc == 0 ) {
			res.json({ children: children, path: req.param("path") });
		}
	})
};

exports.exists = function(req, res) {
	req.app.ZK.a_exists(req.param("path"), null, function(rc,error,stat) {
		res.json({ exists: stat!=null });
	})
};

exports.get = function(req, res) {
	req.app.ZK.a_get(req.param("path"), null, function(rc,error,stat,data) {
		var str = "";
		if ( data != null ) {
			for ( var i=0; i<data.length; i++ ) {
				str += String.fromCharCode( data[i] );
			}
		}
		res.json({ path: req.param("path"), stat: stat, data: str });
	})
};

exports.deleteSafe = function(req, res) {
	req.app.ZK.a_delete_(req.param("path"), -1, function(rc, err) {
		if ( err == "not empty" ) {
			res.json({ status: "error", error: "not empty", path: req.param("path") });
		} else {
			res.json({ status: "ok", path: req.param("path") });
		}
	});
}

exports.deleteUnsafe = function(req, res) {
	_$deregisterFromZooKeeper(req.app.ZK, req.param("path"), function() {
		res.json({ status: "ok", path: req.param("path") });
	});
}

exports.create = function(req, res) {
	req.app.ZK.a_create( req.param("path")+"/"+req.param("nodename"), "", null, function(rc, error, path) {
		if ( rc == 0 ) {
			res.json({ status: "ok", path: req.param("path")+"/"+req.param("nodename"), newnode: req.param("nodename") });
		} else {
			res.json({ status: "error", error: error, path: req.param("path")+"/"+req.param("nodename") });
		}
	});
}

var _$deregisterFromZooKeeper = function(zk, path, callback, workingPath) {
	var currentPath = workingPath || path;
	zk.a_get_children(currentPath, false, function(rc, error, data) {
		if ( data != null ) {
			if ( data.length > 0 ) {
				for ( var i=0; i<data.length; i++ ) {
					_$deregisterFromZooKeeper( zk, path, callback, currentPath + "/" + data[i] );
				}
				zk.a_delete_(currentPath, -1, function() {})
			} else {
				zk.a_delete_(currentPath, -1, function() {})
			}
			_$deregisterFromZooKeeper(zk, path, callback);
		} else {
			callback();
		}
	});
}

