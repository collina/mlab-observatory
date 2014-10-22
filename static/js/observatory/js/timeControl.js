(function() {
	var exports = new EventEmitter()
	var div;

	var selectedDate = null;
	var selectedMonthIndex = null;
	var dateOptions;
	var svg;
	var margin = {top: 0, right: 0, bottom: 25, left: 0}
	var svgDimensions = {
		height: 65 - margin.top - margin.bottom,
		width: 820 - margin.left - margin.right
	}
	var linesTranslateData;

	var monthsToShowAtOnce = 5;
	var monthWidth = svgDimensions.width / monthsToShowAtOnce;
	var labels = []
	var paths;
	var pathsDashed;
	var lineGen;
	var lineGenDashed;
	var selectedCombinations;
	function init() {
		div = d3.select('#timeControl')
		svg = div.append('svg')
			.attr('width', svgDimensions.width + margin.left + margin.right)
			.attr('height', svgDimensions.height + margin.top + margin.bottom)
			.append('g').attr('transform', 'translate(' + margin.left + ',' + margin.top + ')')
		svg.append('rect').attr('x', 0).attr('y', 0)
			.attr('height', svgDimensions.height).attr('width', svgDimensions.width)
			.style('fill','white')
		svg.append('g').attr('class','lines')
		var shades = svg.append('g').attr('class','windowShades')
		shades.append('rect').attr('x',0).attr('y',0).attr('width', monthWidth * 2).attr('height',svgDimensions.height)
			.style('fill','#2a2d33').style('opacity',0.05)
		shades.append('rect').attr('x',monthWidth * 3).attr('y',0).attr('width', monthWidth * 2).attr('height',svgDimensions.height)
			.style('fill','#2a2d33').style('opacity',0.05)
		labels.push(shades.append('text').attr('x', monthWidth * 2).attr('y', svgDimensions.height + 18)
			.text('').attr('text-anchor','middle'))
		labels.push(shades.append('text').attr('x', monthWidth * 3).attr('y', svgDimensions.height + 18)
			.text('').attr('text-anchor','middle'))

	}
	function show() {
		div.style('display',null)
		var view = 'daily'
		var selectedTab = mlabOpenInternet.controls.getSelectedTab()

		if(selectedTab.id === 'explore') {
			var curMetro = mlabOpenInternet.controls.getSelectedMetro()
			mlabOpenInternet.dataLoader.requestMetroData(curMetro, view, dataLoaded)
		} else if(selectedTab.id === 'compare') {
			var curViewType = mlabOpenInternet.controls.getCompareByView()
			var aggregationSelection = mlabOpenInternet.controls.getCompareAggregationSelection()
			mlabOpenInternet.dataLoader.requestCompareData(aggregationSelection, curViewType, view, dataLoaded)
			
		}
	}
	function dataLoaded(allMetroData) {
		//plot the entire dataset of selected cities (or all cities if none selected)
		console.log('time control data loaded')
		console.log(allMetroData)
		var datasets;
		var metric = mlabOpenInternet.controls.getSelectedMetric();
		var curView = mlabOpenInternet.controls.getSelectedTab()
		if(curView.id === 'compare') {
			datasets = allMetroData
		} else {
			selectedCombinations = mlabOpenInternet.controls.getSelectedCombinations()
			if(selectedCombinations.length === 0) {
				datasets = allMetroData
			//	datasets = []
			} else {
				datasets = []
				_.each(allMetroData, function(metroData) {
					var dataID = metroData.filenameID;
					var included = _.find(selectedCombinations, function(combo) { return combo.filename === dataID })
					if(typeof included !== 'undefined') {
						datasets.push(metroData)
					}
				})
				console.log(selectedCombinations)
			}
		}
		var metricKey = metric.key;
		var minDataValue = Number.MAX_VALUE;
		var maxDataValue = -Number.MIN_VALUE;
		var maxDatasetLength = 0;
		var minDate = null;
		var maxDate = null;
		console.log(datasets)
		//determine min / maxes
		
		//we need to break up datasets by month to color them properly :/
		var monthlyDatasets = []
		var maxMonthIndex = 0;
		_.each(datasets, function(dataset) {
			var thisDataSetByMonths = {}
			_.each(dataset.data, function(datum,index) {
				var metricValue = +datum[metricKey]
				
				if(minDate === null || datum.date < minDate) {
					minDate = datum.date
				}
				if(maxDate === null || datum.date > maxDate) {
					maxDate = datum.date
				}
				var monthYearKey = datum.date.getMonth() + "-" + datum.date.getFullYear();
				
				if(typeof thisDataSetByMonths[monthYearKey] === 'undefined') {
					thisDataSetByMonths[monthYearKey] = []
				}
				thisDataSetByMonths[monthYearKey].push(datum)
				/*
				var sampleSize = +datum[metricKey + "_n"]
				if(sampleSize < mlabOpenInternet.dataLoader.getMinSampleSize()) {
					return
				}
				*/
				if(metricValue < minDataValue) {
					minDataValue = metricValue
				}
				if(metricValue > maxDataValue) {
					maxDataValue = metricValue
				}
			})
			dataset.byMonths = thisDataSetByMonths; 
		})
		_.each(datasets, function(dataset) {
			var twoMonthsPrior = moment(new Date(minDate.getFullYear(), minDate.getMonth() - 2, 1))
			var oneMonthPrior =  moment(new Date(minDate.getFullYear(), minDate.getMonth() - 1, 1))
			
			var monthIndex = 0;

			monthlyDatasets.push({
				color: dataset.color,
				monthIndex: monthIndex,
				data: nullData(twoMonthsPrior, monthIndex)
			})
			monthIndex ++ 
			monthlyDatasets.push({
				color: dataset.color,
				monthIndex: monthIndex,
				data: nullData(oneMonthPrior, monthIndex)
			})
			monthIndex ++ 
			_.each(dataset.byMonths, function(data, key) {
				_.each(data, function(d) {
					d.monthIndex = monthIndex
				})
				monthlyDatasets.push({
					data: data,
					color: dataset.color,
					monthIndex: monthIndex
				})
				if(monthIndex > maxMonthIndex) {
					maxMonthIndex = monthIndex
				}
				monthIndex ++
			})
			var oneMonthAfter = moment(new Date(maxDate.getFullYear(), maxDate.getMonth() + 1, 1))
			var twoMonthAfter = moment(new Date(maxDate.getFullYear(), maxDate.getMonth() + 2, 1))

			monthlyDatasets.push({
				color: dataset.color, monthIndex: monthIndex, data: nullData(oneMonthAfter, monthIndex)
			})
			monthlyDatasets.push({
				color: dataset.color, monthIndex: monthIndex + 1, data: nullData(twoMonthAfter, monthIndex + 1)
			})

		})
		maxMonthIndex -= 2; //to account for the 2 start buffer months
		console.log(monthlyDatasets)
		console.log(maxMonthIndex)
		console.log(minDataValue + ' ' + maxDataValue)
		console.log(minDate + " " + maxDate)

		var opts = [];
		var curTime = moment(minDate)
		var endDate = moment(maxDate)
		while(curTime <= endDate) {
			var dateO = {
				label: curTime.format('MMMM YYYY'),
				date: curTime.clone()
			}
			opts.push(dateO)
			curTime.add(1,'months')
		}
		dateOptions = opts;
		if(selectedMonthIndex === null) {
			selectedMonthIndex = maxMonthIndex
			selectedDate = dateOptions[selectedMonthIndex]
			console.log(selectedMonthIndex)
			var dispMonth = selectedDate.date.clone()
			labels[0].text(dispMonth.format('MMM \'YY').toUpperCase())
			dispMonth.add(1,'months')
			labels[1].text(dispMonth.format('MMM \'YY').toUpperCase())
			
		}
		var yScale = d3.scale.linear().domain([0, maxDataValue])
			.range([svgDimensions.height, 0])
		//var xScale = d3.scale.linear().domain([0, maxDatasetLength - 1]).range([0, exploreDimensions.w])
		console.log(monthWidth)
		var startDateMoment = moment(minDate);
		var endDateMoment = moment(maxDate)
		var numMonths = Math.ceil(endDateMoment.diff(startDateMoment, 'months',true))
		numMonths += 4 //add start / end buffer months
		var fullWidth = monthWidth * ( numMonths);
		console.log('numMonths ' + numMonths)
		console.log(fullWidth)
		var dailyXScale = d3.scale.linear().domain([0,1]).range([0, monthWidth])
		var monthlyXScale = d3.scale.linear().domain([0,numMonths - 1]).range([0, fullWidth - monthWidth])
		paths = svg.select('g.lines').selectAll('path.full').data(monthlyDatasets)
		lineGen = d3.svg.line()
			.x(function(d,i) {

				var monthOffset = monthlyXScale(d.monthIndex);
				var daysInMonth = getDaysInMonth(d.date)
				var dayOffset = dailyXScale((+d.day - 1) / (daysInMonth - 1))
				var xPos = monthOffset + dayOffset;
				return xPos;
			})
			.y(function(d,i) {
				if(typeof d[metricKey] === 'undefined') {
					return svgDimensions.height
				}
				return yScale(d[metricKey])
			}).defined(function(d,i) {
				return d[metricKey+"_n"] >= mlabOpenInternet.dataLoader.getMinSampleSize()
			})
		paths.enter().append('path').attr('class','full');
		paths.exit().remove()

		pathsDashed = svg.select('g.lines').selectAll('path.dashed').data(monthlyDatasets)
		lineGenDashed = d3.svg.line()
			.x(function(d,i) {

				var monthOffset = monthlyXScale(d.monthIndex);
				var daysInMonth = getDaysInMonth(d.date)
				var dayOffset = dailyXScale((+d.day - 1) / (daysInMonth - 1))
				var xPos = monthOffset + dayOffset;
				return xPos;
			})
			.y(function(d,i) {
				if(typeof d[metricKey] === 'undefined') {
					return svgDimensions.height
				}
				return yScale(d[metricKey])
			}).defined(function(d,i) {
				if(d.monthIndex === 0 || d.monthIndex === 1) {
					return false;
				}
				if(d.monthIndex === numMonths - 1 || d.monthIndex === numMonths - 2) {
					return false;
				}
				return true
			})
		pathsDashed.enter().append('path').attr('class','dashed');
		pathsDashed.exit().remove()
		updatePaths();

		var maxTranslateAmount = -(fullWidth - svgDimensions.width);
		console.log(maxTranslateAmount)
		var drag = d3.behavior.drag()
			.on('dragstart', function(d) {
				linesTranslateData.dx = 0
			}).on('dragend', function(d) {
				console.log(linesTranslateData)
				var xTranslate = Math.abs(linesTranslateData.x / monthWidth)
				selectedMonthIndex = xTranslate
				selectedDate = dateOptions[selectedMonthIndex]
				linesTranslateData.dx = 0
				
				updatePaths()
				exports.emitEvent('timeChanged')
			})
			.on('drag', function(d) {
				var delta = d3.event.dx;
				linesTranslateData.dx += delta;
				var shiftNeeded = monthWidth / 2;
				if(Math.abs(linesTranslateData.dx) < shiftNeeded) {
					return;
				}
				var monthsToShift = ~~(linesTranslateData.dx / shiftNeeded)
				var shiftAmount = monthsToShift * monthWidth
				console.log(monthsToShift + " "  + shiftAmount);
				linesTranslateData.dx -= shiftAmount
				var sign = delta > 0 ? 1 : -1;
				linesTranslateData.x += shiftAmount ;
				if(linesTranslateData.x > 0) {
					linesTranslateData.x = 0
				}
				if(linesTranslateData.x < maxTranslateAmount) {
					linesTranslateData.x = maxTranslateAmount
				}
				var xTranslate = Math.abs(linesTranslateData.x / monthWidth)
				var dispMonthIndex = xTranslate
				var dispMonth = dateOptions[dispMonthIndex].date.clone()
				labels[0].text(dispMonth.format('MMM \'YY').toUpperCase())
				dispMonth.add(1,'months')
				labels[1].text(dispMonth.format('MMM \'YY').toUpperCase())
				
				d3.select(this).select('g.lines')
					.transition().duration(300)
					.attr('transform', 'translate(' + linesTranslateData.x + ',' + linesTranslateData.y + ')')
			}).origin(function(d) { return linesTranslateData })
		var curTranslateAmount = - selectedMonthIndex * monthWidth
		var linesTranslateData = {
			x: curTranslateAmount, y: 0, dx: 0
		}
		svg.select('g.lines').datum(linesTranslateData).attr('transform', function(d) {
			return 'translate(' + d.x + ',' + d.y + ')'
		})
		svg.call(drag)

	}
	function updatePaths() {
		var strokeFunc = function(d,i) {
			if(mlabOpenInternet.controls.getSelectedTab().id === 'compare' && (d.monthIndex-2 ===selectedMonthIndex)) {
				return d.color
			}

			if(selectedCombinations.length === 0) {
				return null
			}
			if((d.monthIndex-2) === selectedMonthIndex) {
				return d.color
			}
			return null
		}
		paths.attr('d', function(d) {
			return lineGen(d.data) 
		}).style('stroke', strokeFunc )
		pathsDashed.attr('d', function(d) {
			return lineGenDashed(d.data)
		}).style('stroke', strokeFunc)
	}
	function nullData(startDate, monthIndex) {
		startDate = startDate.clone().toDate()
		var numDays = getDaysInMonth(startDate)
		var arr = _.map(_.range(numDays), function(dayIndex) {
			var date = new Date(startDate.getFullYear(), startDate.getMonth(), dayIndex + 1)
			return { date:  date, day: dayIndex + 1 , monthIndex: monthIndex}
		})
		return arr
	}
	function getDaysInMonth(date) {
		var d= new Date(date.getFullYear(), date.getMonth()+1, 0);
		return d.getDate();
	}
	function hide() {
		div.style('display','none')
	}
	exports.init = init
	exports.show = show
	exports.hide = hide;
	exports.getSelectedDate = function() { return selectedDate }
	if( ! window.mlabOpenInternet){
		window.mlabOpenInternet = {}
	}
	window.mlabOpenInternet.timeControl = exports;
	
})()