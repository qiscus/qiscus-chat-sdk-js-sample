requirejs.config({
	baseUrl: 'js',
	paths: {
		jquery: 'lib/jquery-3.3.1.min',
		dateFns: 'lib/date_fns',
		history: 'lib/history.min',
		lodash: 'lib/lodash.min',
		vhtml: 'lib/vhtml.min',
		htm: 'lib/htm.umd'
	},
	map: {
		'*': {
			jquery: 'jquery-mod'
		},
		'jquery-mod': {
			jquery: 'jquery'
		}
	}
});

requirejs(['app']);
