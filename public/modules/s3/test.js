var path = require('path');

var sourceFile = 'test_file.txt';
var targetPath = sourceFile.substring(0, sourceFile.length - path.basename(sourceFile).length - 1);

console.log(targetPath);

if (targetPath == '') {
	console.log("emptyPath");
}
