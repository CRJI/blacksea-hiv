var gulp = require('gulp');
var express = require('express');
var child_process = require('child_process');


gulp.task('jekyll', function() {
  var p = child_process.spawn('jekyll', ['build'], {stdio: [0, 1, 'pipe']});
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
