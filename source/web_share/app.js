var http = require('http');
var fs = require('fs');
var upLoadPage = fs.readFileSync(__dirname+'/upload.html');
var formidable = require('formidable');

http.createServer(function (req, res) {
  res.writeHead(200, {'Content-Type': 'text/html'});
  if(req.url === '/' && req.method === 'GET'){
		return res.end(upLoadPage);
  }
  if(req.url === '/list' && req.method === 'GET'){//列表展现用户上传的文件
		fs.readdir(__dirname+'/file', function(err,array){
			if(err) return res.end('err');
			var htmlStr='';
			array.forEach(function(v){
				htmlStr += '<a href="/file/'+v+'" target="_blank">'+v+'</a> <br/><br/>'
			});
			res.end(htmlStr);
		})
		return;
  }
  if(req.url === '/upload' && req.method === 'POST'){//获取用上传代码
		var form = new formidable.IncomingForm();
		form.parse(req, function(err, fields, files) {
		  res.writeHead(200, {'content-type': 'text/plain'});
		  var filePath = files.myfile.path;
		  var fileName = files.myfile.name;
		  var savePath = __dirname+'/file/';
		  fs.createReadStream(filePath).pipe(fs.createWriteStream(savePath+fileName));//将文件拷贝到file目录下
		  fs.unlink(filePath);//删除原来的文件
		  res.end('success');
		});
		return;
  }
  if(req.url.indexOf('/file') === 0 && req.method === 'GET'){//可以直接下载用户分享的文件
		var filePath = __dirname + req.url; //根据用户请求的路径查找文件
		fs.exists(filePath, function(exists){
		  if(!exists) return res.end('not found file'); //如果没有找到文件，则返回错误
		  fs.createReadStream(filePath).pipe(res); //否则返回文件内容
		})
		return;
   }
  res.end('Hello World\n');
}).listen(8124);