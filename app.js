
/**
 * Module dependencies.
 */

var express = require('express')
  , routes = require('./routes')
  , zk = require('./routes/zk')
  , http = require('http')
  , path = require('path')
  , Config = require(__dirname+"/modules/config");

var portToLaunchOn = 3000;
for ( var i=2; i<process.argv.length; i+=2 ) {
	if ( process.argv[i] == "--port" ) {
		portToLaunchOn = process.argv[i+1] || portToLaunchOn;
	}
}
if ( process.env.ZK_BROWSER_PORT ) {
	portToLaunchOn = process.env.ZK_BROWSER_PORT;
}
 
var app = express();

app.configure(function(){
  app.set('port', process.env.PORT || 3000);
  app.set('views', __dirname + '/views');
  app.set('view engine', 'jade');
  app.use(express.favicon());
  app.use(express.logger('dev'));
  app.use(express.bodyParser());
  app.use(express.methodOverride());
  app.use(express.cookieParser('zookeepr-explorer-secret'));
  app.use(express.session());
  app.use(app.router);
  app.use(express.static(path.join(__dirname, 'public')));
});

app.configure('development', function(){
  app.use(express.errorHandler());
});

app.get('/', routes.index);
app.post('/login', routes.login);
app.post('/logout', routes.logout);

app.post('/zk/connect', zk.connect);
app.post("/zk/disconnect", zk.disconnect);
app.post('/zk/children', zk.children);
app.post('/zk/exists', zk.exists);
app.post('/zk/get', zk.get);
app.post('/zk/delete/safe', zk.deleteSafe);
app.post('/zk/delete/unsafe', zk.deleteUnsafe);
app.post('/zk/create', zk.create);
app.post('/zk/set', zk.set);

app.post('/zk/watcher/register', zk.watcherRegister);
app.post('/zk/watcher/exists', zk.watcherExists);
app.post('/zk/watcher/remove', zk.watcherRemove);

app.$config = new Config(__dirname);
app.zookeepers = {};
app.watchers = {};

var server = app.listen(portToLaunchOn);
app.socketio = require("socket.io").listen(server);
/*
http.createServer(app).listen(app.get('port'), function(){
  console.log("Express server listening on port " + app.get('port'));
});
*/
