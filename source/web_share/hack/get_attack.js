var http = require('http');
var options = {
  hostname: '127.0.0.1',
  port: 8124,
  path: '/file/../app.js',
  method: 'GET'
};
var request = http.request(options, function(res) {
	  res.setEncoding('utf8');
	  res.on('readable', function () {
		  console.log(res.read())//这里就无须监听data事件然后拼字符串buffer之类了，直接监听可读事件，然后调用res.read()
	  });
});
request.end();