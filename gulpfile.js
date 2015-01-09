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
    '-s .000005 ' +
    '-p ADM0_A3 ' +
    ' > countries.topojson',
    {stdio: [0, 1, 'pipe']}
  );
  return p.stderr;
});


gulp.task('data', function() {
  var fs = require('fs'),
      d3 = require('d3');

  var hiv_csv = d3.csv.parse(fs.readFileSync(__dirname + '/hiv.csv', 'utf8'));
  var pop2010 = JSON.parse(fs.readFileSync(__dirname + '/pop2010.json', 'utf8'));
  var rograph = JSON.parse(fs.readFileSync(__dirname + '/rograph.json', 'utf8'));
  var roage = {children: 0.26, adults: 0.74};
  var rv = {country: {}, year: {}};

  var rodata = {};
  var sums = {};
  d3.keys(rograph).forEach(function(key) {
    var data = rograph[key];
    var scale = d3.scale.linear()
        .domain(data.scale.domain)
        .range(data.scale.range);
    d3.range(1987, 2014).forEach(function(year) {
      ['children', 'adults'].forEach(function(name) {
        var y = data[name][year];
        if(y) {
          var value = scale.invert(y) / 100000 * pop2010['ROU'] * roage[name];
          rodata[year] = (rodata[year] || 0) + value;
          var k = key + '-' + name;
          sums[k] = (sums[k] || 0) + value;
        }
      });
    });
  });

  hiv_csv.forEach(function(row) {
    var adm0_a3 = row.ADM0_A3;
    delete row.ADM0_A3;
    d3.keys(row)
      .map(function(d) { return +d; })
      .sort()
      .map(function(year) {
        if(adm0_a3 == 'ROU' && (! row[year]) && rodata[year]) {
          row[year] = d3.round(rodata[year]);
        }
        if(row[year]) {
          rv.year[year] = (rv.year[year] || 0) + (+row[year]);
        }
      });
    var sum10y = d3.sum(d3.range(2004, 2014).map(function(year) { return +row[year]; }));
    var total = d3.sum(d3.values(row), function(d) { return +d; });
    rv.country[adm0_a3] = {
      rate: d3.round(sum10y / 10 / pop2010[adm0_a3] * 100000, 4),
      cp100kTotal: d3.round(total / pop2010[adm0_a3] * 100000, 2),
      last10y: d3.range(2004, 2014).map(function(year) {
          return d3.round(+row[year]/pop2010[adm0_a3]*100000, 2); })
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
