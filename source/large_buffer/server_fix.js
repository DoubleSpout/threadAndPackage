var http = require('http');
http.createServer(function (req, res) {
  if(req.url === '/json' && req.method === 'POST'){//获取用上传代码
	var body = [];
	var len = 0;
	  req.on('data',function(chunk){
		body.push(chunk);//获取buffer
		len += chunk.length;
		if(len>=1024*1024){
			res.end('too large');
		}
	  })
	  req.on('end',function(){
		 body = Buffer.concat(body,len);
		 res.writeHead(200, {'Content-Type': 'text/plain'});
		 //db.save(body) 这里数据库入库操作
		 console.log(body);
		 res.end('ok');
	  })	
  }
}).listen(8124);
console.log(process.memoryUsage());
    setInterval(function(){//per minute memory usage
    	console.log(process.memoryUsage());
    },1000*30);
