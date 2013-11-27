var crypto = require('crypto');
var md5 = function (str, encoding){
  return crypto
    .createHash('md5')
    .update(str)
	.update('abc') //这边加入固定的salt值用来加密
    .digest(encoding || 'hex');
};
var password = 'nodejs';
console.log(md5(password));
