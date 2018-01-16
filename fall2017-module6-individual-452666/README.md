

###  why phpinfo.php behaves the way it does when loaded through Node.JS ###

 - It beacuse the phpinfo.php isn't under the Apache server, so the AWS server unlike Apache server, 
 - it can't load php document directly. Therefore, when we try to open a php file without putting it under the Apache server
 - (the _public_html), we will download the php file directly. 

