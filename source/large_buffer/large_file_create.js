var fs = require('fs');
var buf = new Buffer(1024*1024*700);
buf.fill('h');
fs.writeFile('./large_file', buf, function(err){
	if(err) return console.log(err);
	console.log('ok')
})