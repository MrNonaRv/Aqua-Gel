const fs = require('fs');

let f = 'src/pages/CustomerLogin.tsx';
let s = fs.readFileSync(f, 'utf8');

// 1. Change text
s = s.replace('Water Station Management', 'Water Refilling Station Management');

// 2. Remove bullets block
s = s.replace(/<motion\.div\s+initial=\{\{ opacity: 0 \}\}[\s\S]*?\{ \['Online ordering', 'Detailed income reports', 'Balance monitoring', 'Inventory management'\]\.map\(\(txt, i\) => \([\s\S]*?<\/motion\.div>\n\s*\}\)\}\n\s*<\/motion\.div>/g, '');

fs.writeFileSync(f, s);
