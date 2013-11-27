var net = require('net');
var maxConn = 1000;
var head_str = 'GET / HTTP/1.1\r\nHost: 192.168.17.55\r\n'
var clientArray = [];
while(maxConn--){
	var client = net.connect({port: 8124, host:'192.168.17.55'});
		client.write(head_str);
		client.on('error',function(e){
			console.log(e)
		})
		client.on('end',function(){
			console.log('end')
		})
		clientArray.push(client);
}
setInterval(function(){//定时隔5秒发送一次
  clientArray.forEach(function(v){
	v.write('xhead: gap\r\n');
  })
},1000*5);