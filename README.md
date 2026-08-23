# Drinks I Sip

Hot chocolates and other drinks I've had around New York, on a map and on a
shelf. Two pages, no build step, no dependencies.

| Page | What it is |
| --- | --- |
| `index.html` | The board — a split-flap display, a 3D map of the buildings I drank in, and a paper cup wearing each place's sleeve. |
| `drawings.html` | The original shelf — one hand-drawn cup per drink, filterable by kind. |

## The board (`index.html`)

Add a place to the `PLACES` array:

```js
{
  place:   "Dante",
  address: "550 Hudson St",
  lat:     40.7300,
  lng:     -74.0040,
  visits:  1,
  score:   8.33,      // out of 10
  price:   6.50,      // optional, in $
  sleeve:  "dante",   // optional
  closed:  false      // optional
}
```

`lat`/`lng` are looked up once by hand — right-click the storefront in Google
Maps and copy the coordinates. Don't geocode at runtime.

The building each pin stands in is fetched from NYC Open Data at load, so
places outside the city (or in a park, with no footprint) show a pin but no 3D
building. Nothing to configure — it either matches or it doesn't.

`sleeve` points at `assets/hot-chocolates/<slug>.png`, a **1400×428** image that
wraps the cup. Without one the cup wears a plain grey band.

Data and tiles: [OpenFreeMap](https://openfreemap.org/) for the basemap
(attribution is required and rendered on the map), and NYC Open Data's
[Building Footprints](https://data.cityofnewyork.us/City-Government/Building-Footprints/5zhs-2jue)
for the extrusions.

## The shelf (`drawings.html`)

Drop the illustration in `assets/`, then add a block to the `DRINKS` array:

```js
{
  image:   "assets/dante.png",
  place:   "Dante",
  address: "550 Hudson St, New York, NY 10014",
  drink:   "Garibaldi",
  kind:    "Cocktail",
  city:    "NYC",
  rank:    1,
  note:    "The orange juice is the whole point."
}
```

`kind` drives the filter pills — they build themselves from the data, so a new
category appears on its own. `city`, `rank`, and `note` are optional; leave them
empty and they simply don't render. A cup without an `address` isn't clickable.

## Running locally

```
python3 -m http.server 8000
```

Both pages need to be served over HTTP — opening the file directly breaks the
map tiles and the footprint lookup.
