# Drinks I Sip

A shelf of drinks I've had, drawn one cup at a time — hot chocolates, coffees,
cocktails, beers. Click a cup to see where it came from.

Static site: one `index.html`, no build step, no dependencies.

## Adding a drink

Drop the illustration in `assets/`, then add a block to the `DRINKS` array in
`index.html`:

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
