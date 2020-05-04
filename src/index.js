// 测量
import length from '@turf/length'
import area from '@turf/area'
import './index.css'

const SOURCE_ID = 'geoData'
const MEASURE_POINT = 'measurePoint'
const MEASURE_LINE = 'measureLine'
const MEASURE_POLYGON = 'measurePolygon'

export default class Measure {
	options = {
		lengthUnit: 'kilometers' // optional: kilometers miles
	}
	// GeoJSON object to hold measurement features
	geoData = {
		type: 'FeatureCollection',
		features: []
	}
	// 线数据
	lineStringData = {
		type: 'Feature',
		geometry: {
			type: 'LineString',
			coordinates: []
		}
	}
	// 面数据
	polygonData = {
		type: 'Feature',
		geometry: {
			type: 'Polygon',
			coordinates: [[]]
		}
	}
	result = {
		totalLength: 0, // 总长度
		totalArea: 0 // 总面积
	}
	isMeasuring = false // 是否正在测量
	constructor (options) {
		Object.assign({}, this.options, options)
	}

	onAdd (map) {
		this._map = map
		this._container = document.createElement('div')
		this._container.classList.add('mapboxgl-ctrl')
		this._container.classList.add('__measure__')
		this._container.appendChild(this._createOperatorWrapper())
		this._addMeasureLayers()

		return this._container
	}

	onRemove () {
		this._container.parentNode.removeChild(this._container)
		this._map = undefined
		this.isMeasuring = false
		this.result = null
		this.geoData = null
		this.lineStringData = null
		this.polygonData = null
	}

	getDefaultPosition () {
		return 'bottom-right'
	}

	// 创建显示测量结果的dom
	_createResultContainer () {
		let container = document.createElement('div')
		container.classList.add('__measure__result__container')
		this._retContainer = container
		const data = [
			{
				label: '路径长度',
				value: this.result.totalLength,
				className: '__measure__length',
				unit: this.options.lengthUnit === 'kilometers' ? '千米' : '英里'
			},
			{
				label: '面积',
				value: this.result.totalArea,
				className: '__measure__area',
				unit: '平方米'
			}
		]
		data.forEach(e => {
			const subContainer = document.createElement('div')
			subContainer.classList.add('__measure__result')
			const lspan1 = document.createElement('span')
			lspan1.innerText = e.label
			const lspan2 = document.createElement('span')
			lspan2.classList.add(e.className)
			lspan2.innerText = e.value.toLocaleString()
			const lspan3 = document.createElement('span')
			lspan3.innerText = e.unit
			subContainer.appendChild(lspan1)
			subContainer.appendChild(lspan2)
			subContainer.appendChild(lspan3)
			container.appendChild(subContainer)
		})
		return container
	}

	// 创建操作按钮
	_createMeasureBtn () {
		function toggleBtn () {
			startBtn.classList.toggle('__btn__hidden', _this.isMeasuring)
			wrapper.classList.toggle('__btn__hidden', !_this.isMeasuring)
		}
		const _this = this
		const startBtn = document.createElement('button')
		startBtn.classList.add('__measure__btn')
		startBtn.classList.add('__measure__start_btn')
		startBtn.innerText = '开始一次新的测量'
		startBtn.onclick = function (e) {
			_this.cancelMeasure()
			_this.addMoveEvent()
			_this.handleMapClick()
			toggleBtn()
		}

		const cancelBtn = document.createElement('button')
		cancelBtn.classList.add('__measure__btn')
		cancelBtn.classList.add('__measure__cancel_btn')
		cancelBtn.innerText = '取消测量'
		cancelBtn.onclick = function (e) {
			_this.cancelMeasure()
			toggleBtn()
		}

		const endBtn = document.createElement('button')
		endBtn.classList.add('__measure__btn')
		endBtn.classList.add('__measure__end_btn')
		endBtn.innerText = '完成测量'
		endBtn.onclick = function (e) {
			_this.measureDone()
			toggleBtn()
		}

		const wrapper = document.createElement('div')
		wrapper.classList.add('__btn__wrapper')
		wrapper.appendChild(cancelBtn)
		wrapper.appendChild(endBtn)

		toggleBtn()

		return { startBtn, wrapper }
	}

	// 创建操作按钮和数据容器
	_createOperatorWrapper () {
		const fragment = document.createDocumentFragment()
		const title = document.createElement('h3')
		title.innerText = '同时测量距离和面积'
		const retContainer = this._createResultContainer()
		const btn = this._createMeasureBtn()
		fragment.append(title, retContainer, btn.startBtn, btn.wrapper)
		return fragment
	}

	// 添加图层
	_addMeasureLayers () {
		this._map.addSource(SOURCE_ID, {
			type: 'geojson',
			data: this.geoData
		})
		this._map.addLayer({
			id: MEASURE_POINT,
			type: 'circle',
			source: SOURCE_ID,
			paint: {
				'circle-color': '#1B81FF',
				'circle-radius': 4,
				'circle-stroke-width': 1,
				'circle-stroke-color': '#1B81FF'
			},
			filter: ['in', '$type', 'Point']
		})
		this._map.addLayer({
			id: MEASURE_LINE,
			type: 'line',
			source: SOURCE_ID,
			paint: {
				'line-color': '#1B81FF',
				'line-width': 2
			},
			filter: ['in', '$type', 'LineString']
		})
		this._map.addLayer({
			id: MEASURE_POLYGON,
			type: 'fill',
			source: SOURCE_ID,
			paint: {
				'fill-color': '#1B81FF',
				'fill-outline-color': '#1B81FF',
				'fill-opacity': 0.3
			},
			filter: ['in', '$type', 'Polygon']
		})
	}

	// 添加点
	handleMapClick () {
		const _this = this
		this.isMeasuring = true
		this._map.on('click', function (e) {
			if (!_this.isMeasuring) return
			// 是否点击到点数据
			const features = _this._map.queryRenderedFeatures(e.point, {
				layers: [MEASURE_POINT]
			})

			_this._removeGeometry(['LineString', 'Polygon'])

			if (features.length) {
				// 删除掉选中的点
				const id = features[0].properties.id
				_this.geoData.features = _this.geoData.features.filter(feature => {
					return feature.properties.id !== id
				})
			} else {
				_this.geoData.features.push({
					type: 'Feature',
					geometry: {
						type: 'Point',
						coordinates: [e.lngLat.lng, e.lngLat.lat]
					},
					properties: {
						id: Date.now().toString()
					}
				})
			}

			// 生成线数据
			_this.getLineString(false)

			// 生成面数据
			if (_this.geoData.features.length > 3) {
				_this.polygonData.geometry.coordinates[0] = []
				_this.geoData.features.forEach(feature => {
					if (feature.geometry.type === 'Point') {
						_this.polygonData.geometry.coordinates[0].push(feature.geometry.coordinates)
					}
				})
				_this.polygonData.geometry.coordinates[0].push(_this.geoData.features[0].geometry.coordinates) // 闭合多边形

				_this.geoData.features.push(_this.polygonData)

				// 计算面积
				_this.result.totalArea = area(_this.polygonData)
				console.log('geodata', _this.result.totalArea)

				_this.calcArea(_this.result.totalArea)
			}
			_this._map.getSource(SOURCE_ID).setData(_this.geoData)
		})
	}

	isLastPoint () {}

	// 取消测量
	cancelMeasure () {
		this.isMeasuring = false
		this.geoData.features = []
		this._map.getSource(SOURCE_ID).setData(this.geoData)
		this.calcArea(0)
		this.calcLength(0)
	}

	// 完成测量, 闭合图形（添加一条直线）
	measureDone () {
		this.isMeasuring = false
		this._removeGeometry(['LineString'])
		this.getLineString(true)
		this._map.getSource(SOURCE_ID).setData(this.geoData)
	}

	_removeGeometry (typeArr) {
		let i = this.geoData.features.length
		while (i--) {
			const feature = this.geoData.features[i]
			if (typeArr.includes(feature.geometry.type)) {
				this.geoData.features.splice(i, 1)
			}
		}
	}

	// 重新生成线数据 closure: 是否闭合
	getLineString (closure) {
		const _this = this
		const features = _this.geoData.features
		if (features.length > 1) {
			const coord = []
			features.forEach(feature => {
				if (feature.geometry.type === 'Point') {
					coord.push(feature.geometry.coordinates)
				}
			})
			_this.lineStringData.geometry.coordinates = coord
			if (closure) {
				_this.lineStringData.geometry.coordinates.push(features[0].geometry.coordinates)
			}
			features.push(_this.lineStringData)
			// 计算长度
			_this.result.totalLength = length(_this.lineStringData)
			_this.calcLength(_this.result.totalLength)
		}
	}

	addMoveEvent () {
		const _this = this
		this._map.on('mousemove', function (e) {
			const features = _this._map.queryRenderedFeatures(e.point, {
				layers: [MEASURE_POINT]
			})
			_this._map.getCanvas().style.cursor = features.length ? 'pointer' : 'crosshair'
		})
	}

	calcLength (totalLength) {
		this._container.querySelector('.__measure__length').innerText = totalLength.toLocaleString()
	}

	calcArea (totalArea) {
		this._container.querySelector('.__measure__area').innerText = totalArea.toLocaleString()
	}
}
