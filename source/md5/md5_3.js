var crypto = require('crypto');
var md5 = function (str, encoding){
  return crypto
    .createHash('md5')
    .update(str)
    .digest(encoding || 'hex');
};
var gap = '-';
var password = 'nodejs';
var salt = md5(Date.now().toString());
var md5Password = md5(salt+gap+password);
console.log(md5Password);
//0199c7e47cb9b55adac21ebc697673f4
