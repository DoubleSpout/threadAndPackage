var crypto = require('crypto');
var md5 = function (str, encoding){
  return crypto
    .createHash('md5')
    .update(str)
    .digest(encoding || 'hex');
};
var password = 'nodejs';
console.log(md5(password));
