var gulp = require('gulp');
var express = require('express');
var child_process = require('child_process');


gulp.task('jekyll', function() {
  var p = child_process.spawn('jekyll', ['build'], {stdio: [0, 1, 'pipe']});
  return p.stderr;
});


gulp.task('topojson', function() {
  var p = child_process.exec(
    'ogr2ogr -f geojson /vsistdout/ ' +
    '_data/ne_10m_admin_0_countries/ne_10m_admin_0_countries.shp ' +
    '-clipsrc 15 30 57 80 ' +
    '| topojson countries=/dev/fd/0 ' +
    '-s .00001 ' +
    '-p ADM0_A3 ' +
    ' > countries.topojson',
    {stdio: [0, 1, 'pipe']}
  );
  return p.stderr;
});


gulp.task('regression', function() {
  var regression = require('regression'),
      fs = require('fs'),
      d3 = require('d3');

  var hiv_csv = d3.csv.parse(fs.readFileSync(__dirname + '/hiv.csv', 'utf8'));
  var pop2010 = JSON.parse(fs.readFileSync(__dirname + '/pop2010.json', 'utf8'));
  var rv = {};

  hiv_csv.forEach(function(row) {
    var adm0_a3 = row.ADM0_A3;
    delete row.ADM0_A3;
    var cumulative = 0;
    var data = [];
    d3.keys(row)
      .map(function(d) { return +d; })
      .sort()
      .map(function(year) {
        var x = year - 2013;
        var value = row[year] ? +row[year] : null;
        cumulative += value;
        if(value) {
          data.push([x, cumulative]);
        }
      });
    var exp = regression('exponential', data).equation[1];
    var total = d3.sum(d3.values(row), function(d) { return +d; });
    rv[adm0_a3] = {
      rate: d3.round(exp, 4),
      cp1kTotal: d3.round(total / pop2010[adm0_a3] * 1000, 3)
    };
  });

  fs.writeFileSync(__dirname + '/data.json', JSON.stringify(rv, null, 2));
});


gulp.task('serve', function() {
  var server = express();
  server.use(express.static('_site'));
  server.listen(+(process.env.port || 5000));
  return require('q').defer().promise;
});


gulp.task('devel', function() {
  gulp.watch([
      '_config.yml',
      'countries.topojson',
      'index.html'
    ], ['jekyll']);

  gulp.start('jekyll');
  gulp.start('serve');
});


gulp.task('direct', function() {
  var server = express();
  server.use(express.static('.'));
  server.listen(+(process.env.port || 5000));
  return require('q').defer().promise;
});


gulp.task('default', ['jekyll']);
