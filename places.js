/* The one list. Loaded by index.html (the board) and vessels.html (the
   cup configurator), so the two can never drift apart.

   cup — optional, set in vessels.html:
     vessel  "Paper cup" | "Tumbler" | "Bell glass" | "Mug" | "Goblet"
     mallow  "Cylinder" | "Pillow" | "Heart" | "Star" | "Sphere" | "None"
     count   0–14        size  0.5–2.0        tilt  degrees, count 1 only
*/
const PLACES = [
  { place:"Amorino Times Square",     address:"721 8th Ave",              lat:40.7595050, lng:-73.9883714, visits:1 , sleeve:"amorino", tint:"#7e5947", score:6},
  { place:"Angelina Paris",           address:"1050 Avenue of the Americas", lat:40.7531610, lng:-73.9849272, visits:1 , sleeve:"angelina-paris", tint:"#000000", score:8.33, price:14.75},
  { place:"Breads Bakery",            address:"18 E 16th St",             lat:40.7365429, lng:-73.9918617, visits:1 , sleeve:"breads-bakery", tint:"#b6262b", score:8, price:6.25},
  { place:"Caffè Panna",              address:"77 Irving Pl",             lat:40.7369641, lng:-73.9868018, visits:1 , sleeve:"caffe-panna", tint:"#9e784b", score:9},
  { place:"Cocoa Cabin",              address:"Bryant Park Winter Village", lat:40.7537509, lng:-73.9835428, visits:1 , sleeve:"cocoa-cabin", tint:"#502c21", score:2.33, price:8.17},
  { place:"Frenchette Bakery",        address:"220 Church St",            lat:40.7170950, lng:-74.0067095, visits:2 , sleeve:"frenchette-bakery", tint:"#b7d7bb", score:9.33},
  { place:"Glace by Noglu",           address:"1266 Madison Ave",         lat:40.7838771, lng:-73.9568025, visits:1 , sleeve:"glace", score:7.67},
  { place:"Glace Rockefeller Center", address:"30 Rockefeller Plaza",     lat:40.7591232, lng:-73.9795560, visits:1 , sleeve:"glace", score:6.33, price:12.74},
  { place:"Gramercy Tavern",          address:"42 E 20th St",             lat:40.7383840, lng:-73.9884222, visits:1 , sleeve:"gramercy-tavern", tint:"#858589", score:8},
  { place:"Jacques Torres Chocolate", address:"107 E 42nd St",            lat:40.7516533, lng:-73.9761497, visits:1 , sleeve:"jacques-torres", score:7.67, price:4.35},
  { place:"La Maison du Chocolat",    address:"51 W 49th St",             lat:40.7589380, lng:-73.9797471, visits:2 , sleeve:"la-maison-du-chocolat", tint:"#5a3027", score:8.33, price:10.73},
  { place:"Mango Mango",              address:"175 2nd St, Jersey City",  lat:40.7221015, lng:-74.0402704, visits:1 , sleeve:"mango-mango", tint:"#e2a20a", score:4.67, price:8.40},
  { place:"MarieBelle New York",      address:"484 Broome St",            lat:40.7232184, lng:-74.0022708, visits:2 , sleeve:"mariebelle", tint:"#79c1dc", score:9, price:8.00},
  { place:"Matto Espresso",           address:"1 Maiden Ln",              lat:40.7097338, lng:-74.0096119, visits:1 , sleeve:"matto-espresso", score:3.67, price:3.00},
  { place:"Max Brenner Union Square", address:"841 Broadway",             lat:40.7342040, lng:-73.9911071, visits:1, sleeve:"max-brenner", score:6.67},
  { place:"No Chewing Allowed",       address:"Bryant Park, 31 W 40th St", lat:40.7527077, lng:-73.9828108, visits:1 , sleeve:"no-chewing-allowed", tint:"#fecc33", score:7.67},
  { place:"Ole & Steen",              address:"Barclay St, near WTC",     lat:40.7129651, lng:-74.0097789, visits:1 , sleeve:"ole-and-steen", tint:"#9b0a16", score:7, price:9.00},
  { place:"Rigor Hill Market",        address:"227 W Broadway",           lat:40.7192673, lng:-74.0060718, visits:1 , sleeve:"rigor-hill", tint:"#ccad89", score:9.67, price:10.73},
  { place:"S'mores N'more",           address:"Bryant Park Winter Village", lat:40.7537509, lng:-73.9835428, visits:1 , sleeve:"smores-n-more", tint:"#121212", score:1.33},
  { place:"Starbucks Reserve",        address:"350 5th Ave (Empire State Building)", lat:40.7484421, lng:-73.9856589, visits:1 , sleeve:"starbucks-winter", tint:"#e93c3e", score:4.33},
  { place:"The Cocoa Store",          address:"873 Broadway, 6th floor",  lat:40.7379839, lng:-73.9902332, visits:1 , sleeve:"cocoa-store", tint:"#85764f", score:8.67, price:6.50},
  { place:"United Chocolate Works",   address:"41 W 40th St",             lat:40.7538162, lng:-73.9843175, visits:1 , sleeve:"united-chocolate-works", tint:"#122440", score:3.33},
  { place:"Venchi NoMad",             address:"1178 Broadway",            lat:40.7453494, lng:-73.9885661, visits:1 , sleeve:"venchi", score:7}
];
