# mapbox-measure
> A mapbox plugin that can measure distance and area

## Install
`npm i mapbox-measure`

## Setup
```javascript
import measure from 'mapbox-measure'
```

## Usage
```javascript
map.addControl(new measure())
```
### options

parameter | description 
---|---
lengthUnit (`String`) | unit of length. default kilometers
