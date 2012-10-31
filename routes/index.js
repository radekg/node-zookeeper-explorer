var app;

exports.index = function(req, res) {
	if ( app == null ) {
		app = req.app;
	}
	res.render('index', { title: 'Express' });
};

exports.login = function(req, res) {
	if ( app == null ) {
		app = req.app;
	}
	if ( req.param("username") == app.$config.Auth.username && req.param("password") == app.$config.Auth.password ) {
		req.session.authenticated = true;
		res.send({ status: "ok" });
	} else {
		res.send({ status: "notok" });
	}
};

exports.logout = function(req, res) {
	if ( app == null ) {
		app = req.app;
	}
	req.session.authenticated = false;
	res.send({ status: "ok" });
};

exports.isLoggedIn = function(req, res) {
	res.send({ status: req.session.authenticated == true });
};
