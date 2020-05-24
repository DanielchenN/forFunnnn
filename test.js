const fs = require('fs')
const content = JSON.parse(fs.readFileSync('./a.json', 'utf-8'))
fs.writeFileSync('./c.json',JSON.stringify(content, null, 2))