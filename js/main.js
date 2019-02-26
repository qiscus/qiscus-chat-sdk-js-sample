requirejs.config({
  baseUrl: 'js',
  paths: {
    jquery: 'lib/jquery-3.3.1.min',
    qiscus: 'lib/qiscus-sdk-core',
    dateFns: 'lib/date_fns',
    history: 'lib/history.min',
    lodash: 'lib/lodash.min'
  },
  map: {
    '*': {
      jquery: 'jquery-mod'
    },
    'jquery-mod': {
      jquery: 'jquery'
    }
  }
})

requirejs(['app'])
