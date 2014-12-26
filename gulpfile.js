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
    "-where \"ADM0_A3 IN ('AZE', 'ARM', 'BGR', 'GEO', 'ROU', " +
                         "'RUS', 'TUR', 'UKR', 'BLR', 'MDA')\" " +
    '-clipsrc 15 30 55 80 ' +
    '| topojson countries=/dev/fd/0 ' +
    '-s .00001 ' +
    '-p ADM0_A3 ' +
    ' > countries.topojson',
    {stdio: [0, 1, 'pipe']}
  );
  return p.stderr;
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
      'index.html'
    ], ['jekyll']);

  gulp.start('jekyll');
  gulp.start('serve');
});


gulp.task('default', ['jekyll']);
