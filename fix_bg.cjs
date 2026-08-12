const fs = require('fs');
let s = fs.readFileSync('src/pages/CustomerLogin.tsx', 'utf8');
s = s.replace("import bgImage from '../assets/login-bg.jpg';", "");
s = s.replace("url(${bgImage})", "url(/login-bg.jpg.jpg)");
fs.writeFileSync('src/pages/CustomerLogin.tsx', s);
