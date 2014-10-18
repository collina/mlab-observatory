(function() {
	var exports = new EventEmitter()
	var div;

	var tabData = [
		{lbl: 'Explore', id: 'explore'},
		{lbl: 'Compare', id: 'compare'},
		{lbl: 'How this works', id: 'help'} 
	]
	var metrics;
	var metros;

	var selectedMetric;
	var selectedMetroRegion;
	var selectedCombinations;
	var selectedISP;
	var selectedCompareViewBy;

	var currentCombinationOptions;

	var metricsSelectD3;
	var $metricsSelect;

	var metroSelectD3;
	var $metroSelect;

	var ispSelectD3;
	var $ispSelect;

	var comboSelectD3;
	var $comboSelect;

	var compareViewBySelectD3;
	var $compareViewBySelect;
	var viewByOpts = ['Metro Region','ISP']

	var selectionLabels;

	function init() {
		div = d3.select('#controls')

		metrics = mlabOpenInternet.dataLoader.getMetrics()
		metros = mlabOpenInternet.dataLoader.getMetroRegions()

		selectedMetric = _.find(metrics, function(d) { return d.key === 'download_throughput'})
		selectedMetroRegion = "New York"
		selectedCombinations = []

		console.log(selectedMetric)

		var tabContainer = div.append('ul').attr('class','tabs cf')
		var tabs = tabContainer.selectAll('li').data(tabData)
		tabs.enter().append('li').text(function(d) { return d.lbl})
			.classed('active', function(d,i) {
				return i === 0
			})
			.on('click', clickTab)
		var selectBar = div.append('div').attr('class','selectBar')

		selectionLabels = div.append('div').attr('class','selectionLabels')


		var metricsSelect = selectBar.append('select').attr('title','Metric')
		metricsSelectD3 = metricsSelect
		var metricOpts = metricsSelect.selectAll('option').data(metrics)
		metricOpts.enter().append('option').text(function(d) { return d.name })
			.attr('value', function(d) { return d.key })
		$metricsSelect = $(metricsSelect[0][0]).selectpicker({selectedTextFormat: 'static'}).on('change', changeMetric)


		compareViewBySelectD3 = selectBar.append('select').attr('title', 'View By')
		var viewByOptions = compareViewBySelectD3.selectAll('option').data(viewByOpts)
		viewByOptions.enter().append('option').text(String).attr('value', String)
		$compareViewBySelect = $(compareViewBySelectD3[0][0]).selectpicker({selectedTextFormat: 'static'}).on('change', changeCompareViewBy)


		var metroSelect = selectBar.append('select').attr('title', 'Metro Region')
		metroSelectD3 = metroSelect;
		var metroOpts = metroSelect.selectAll('option').data(metros)
		metroOpts.enter().append('option').text(String).attr('value', String)
		$metroSelect = $(metroSelect[0][0]).selectpicker({selectedTextFormat: 'static'}).on('change', changeMetro)

		ispSelectD3 = selectBar.append('select').attr('title','ISP')
		var ispOptsArray = mlabOpenInternet.dataLoader.getISPs();
		var ispOpts = ispSelectD3.selectAll('option').data(ispOptsArray)
		ispOpts.enter().append('option').text(String).attr('value', String)
		$ispSelect = $(ispSelectD3[0][0]).selectpicker({selectedTextFormat: 'static'}).on('change', changeCompareISP)

		var comboSelect = selectBar.append('select')
			.attr('multiple','multiple').attr('title','ISP Combinations')
			.attr('data-max-options', 3)
		comboSelectD3 = comboSelect
		$comboSelect = $(comboSelect[0][0]).selectpicker({selectedTextFormat: 'static'}).on('change', changeCombinations)
		setupComboSelectOptions()


		populateSelectionLabel()

		showExploreControls();
		_.defer(function() {
			exports.emitEvent('switchTab', [tabData[0]])

		})

	}
	function clickTab(d,i) {
		var dTab = d3.select(this);
		if(dTab.classed('active')) {
			return
		}
		$(div[0][0]).find('.tabs li.active').removeClass('active')
		dTab.classed('active', true)
		console.log(d)
		if(d.id === 'explore') {
			showExploreControls();
		} else if(d.id === 'compare') {
			showCompareControls();
		} else if(d.id === 'help') {
			showHelpControls()
		}
		exports.emitEvent('switchTab', [d])
	}
	function changeMetric(event) {
		var newMetric = _.find(metrics, function(d) { return d.key === $metricsSelect.val() } )
		if(newMetric.key === selectedMetric.key) {
			return;
		}
		selectedMetric = newMetric
		populateSelectionLabel()
		exports.emitEvent('selectionChanged')
	}
	function changeMetro(event) {
		var newMetro = $metroSelect.val();
		if(newMetro === selectedMetroRegion) {
			return;
		}
		selectedMetroRegion = newMetro;
		setupComboSelectOptions()
		populateSelectionLabel()
		exports.emitEvent('selectionChanged')

	}
	function changeCombinations(event) {
		console.log('change combos')
		console.log($comboSelect.val())
		var selectVal = $comboSelect.val()
		if(selectVal === null) {
			selectVal = []
		}
		selectedCombinations = _.filter(currentCombinationOptions, function(d) {
			return selectVal.indexOf(d.label) !== -1
		})
		console.log(selectedCombinations)
		populateSelectionLabel()
		exports.emitEvent('selectionChanged')

	}
	function setupComboSelectOptions() {
		var options = mlabOpenInternet.dataLoader.getCombinations(selectedMetroRegion);
		currentCombinationOptions = options
		var comboOpts = comboSelectD3.selectAll('option').data(options)
		comboOpts.enter().append('option')
		comboOpts.exit().remove()
		comboOpts.text(function(d) {
			return d.label;
		})
		$comboSelect.selectpicker('val','');
		$comboSelect.selectpicker('refresh')
		selectedCombinations = []
	}

	function populateSelectionLabel() {
		var labelHTML = "";
		labelHTML += '<span class="b">' + selectedMetric.name + '</span>'
		labelHTML += ' for '
		if(selectedCombinations.length === 0) {
			labelHTML += '<span class="b">All ISPs</span> on <span class="b">All TPs</span>'
		} else {
			labelHTML += 'some subset of combinations'
		}
		labelHTML += ' in '
		labelHTML += '<span class="b">' + selectedMetroRegion + '</span>'
		selectionLabels.html(labelHTML)
	}
	function showExploreControls() {
		$compareViewBySelect.next().hide() //kind of odd 
		$comboSelect.next().show()
		$ispSelect.next().hide()
		console.log($compareViewBySelect)
	}
	function showCompareControls() {
		$compareViewBySelect.next().show()
		changeCompareViewBy()
		$comboSelect.next().hide()
	}
	function showHelpControls() {

	}
	function changeCompareViewBy() {
		var compareSelectType = $compareViewBySelect.val()
		selectedCompareViewBy = compareSelectType
		if(compareSelectType === 'Metro Region') {
			$metroSelect.next().show();
			$ispSelect.next().hide()
		} else if(compareSelectType === 'ISP') {
			$metroSelect.next().hide();
			$ispSelect.next().show();
		}
		exports.emitEvent('selectionChanged')

	}
	function changeCompareISP() {
		exports.emitEvent('selectionChanged')
	}
	function getCompareAggregationSelection() {
		var viewType = $compareViewBySelect.val()
		if(viewType === 'Metro Region') {
			return $metroSelect.val();
		} else if(viewType === 'ISP') {
			return $ispSelect.val()
		}
	}
	exports.init = init
	exports.getSelectedMetro = function() { return selectedMetroRegion }
	exports.getSelectedMetric = function() { return selectedMetric }
	exports.getSelectedCombinations = function() { return selectedCombinations }
	exports.getCompareByView = function() { return selectedCompareViewBy }
	exports.getCompareAggregationSelection = getCompareAggregationSelection
	if( ! window.mlabOpenInternet){
		window.mlabOpenInternet = {}
	}
	window.mlabOpenInternet.controls = exports;
	
})()