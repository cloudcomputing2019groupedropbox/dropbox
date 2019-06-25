var userId = 'test1';
var uuid = require("uuid");
var path = require("path");
var sourcePath = 'must_disposed_dir';

var data = {
	Contents: [
		{Key: 'drive/' + userId + '/' + 'must_disposed_dir/new_dir/' + 'candidate.txt'},
		{Key: 'drive/' + userId + '/' + 'must_disposed_dir/new_dir'},
		{Key: 'drive/' + userId + '/' + 'must_disposed_dir/new_dir/host_dir/'}
	]
};

var spHead = 'drive/' + userId + '/';
var tpHead = 'dropbox/trashcan/' + userId + '/' + uuid.v4();

var sourceObjects = [];
var targetPaths = [];
for (var i = 0; i < data.Contents.length; i++) {
	var sourceObject = data.Contents[i].Key;
	sourceObjects.push(sourceObject);
	var baseName = path.basename(sourceObject);
	var tpTail;
	if (sourceObject[sourceObject.length - 1] == '/') {
		tpTail = sourceObject.substring(spHead.length, sourceObject.length - baseName.length - 1);
	} else {
		tpTail = sourceObject.substring(spHead.length, sourceObject.length - baseName.length);
	}
	if (tpTail != '') {
		tpTail = '/' + tpTail;
	}
	tpTail = tpTail.substring(0, tpTail.length - 1);
	targetPaths.push(tpHead + tpTail);
}

console.log(sourceObjects);
console.log(targetPaths);