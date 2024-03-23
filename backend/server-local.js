'use strict';

const app = require('./express/server');

app.listen(8888, () => console.log('Local app listening on port 8888!'));