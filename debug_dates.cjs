const now = new Date();
const year = now.getFullYear();
const month = now.getMonth();

console.log("Current:", now);
console.log("End of month (32):", new Date(year, month, 32));
console.log("End of month (0):", new Date(year, month + 1, 0));
