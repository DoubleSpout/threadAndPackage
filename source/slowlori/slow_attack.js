var http = require('http');

var options = {
  hostname: '127.0.0.1',
  port: 8124,
  path: '/json',
  method: 'POST',
  headers:{
	"Content-Length":1024*1024
  }
};
var max_conn = 1000;
// increase max sockets
http.globalAgent.maxSockets = max_conn;
var reqArray = [];
var buf = new Buffer(1024);
buf.fill('h');
while(max_conn--){
	var req = http.request(options, function(res) {
		  res.setEncoding('utf8');
		  res.on('readable', function () {
			  console.log(res.read());//这里就无须监听data事件然后拼字符串buffer之类了，直接监听可读事件，然后调用res.read()
		  });
	});
	reqArray.push(req);
}
setInterval(function(){
	reqArray.forEach(function(v){
		v.write(buf);
	})
},1000*5);