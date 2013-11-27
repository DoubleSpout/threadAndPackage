var http = require('http');

http.createServer(function (request, response) {
  response.writeHead(200, {'Content-Type': 'text/plain'});
  response.end('Hello World\n');
}).listen(8124);

console.log(process.memoryUsage());
setInterval(function(){//per minute memory usage
	console.log(process.memoryUsage());
},1000*10)