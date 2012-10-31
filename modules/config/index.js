var fs = require("fs")
	, yaml = require("js-yaml");

function Config(baseDir) {
	return this._loadFile(baseDir+"/config");
}

Config.prototype._loadFile = function(baseDir) {
	var deployment = process.env.NODE_ENV || 'default';
	var fullFilename = [baseDir,[deployment,"yaml"].join(".")].join("/");
	var stat = fs.statSync(fullFilename);
	if ( !stat ) {
		throw new Error("No config file found.");
	} else {
		try {
			var fileContent = fs.readFileSync(fullFilename, 'UTF-8');
			fileContent = this._stripYamlComments(fileContent);
			return yaml.load( fileContent );
		} catch (e2) {
			throw new Error('Config file ' + fullFilename + ' cannot be read.');
		}
	}
	return null;
}

Config.prototype._stripYamlComments = function(fileStr) {
  // First replace removes comment-only lines
  // Second replace removes blank lines
  return fileStr.replace(/^\s*#.*/mg,'').replace(/^\s*[\n|\r]+/mg,'');
}

module.exports = Config;
