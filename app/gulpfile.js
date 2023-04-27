const gulp = require('gulp');
const uglify = require('gulp-uglify');
const rename = require('gulp-rename');
const concat = require('gulp-concat');
const pump = require('pump');
const gulpif = require('gulp-if');
const sourcemaps = require('gulp-sourcemaps');

const pathJs = './public/js';
const path = './public';

gulp.task('scripts', function(cb) {
        pump([
            gulp.src([
                pathJs+'/socket.js',
                pathJs+'/video.js',
                pathJs+'/media.js',
                pathJs+'/wrtc.js',
                pathJs+'/filesp2p.js',
                pathJs+'/index.js',
            ]),
            gulpif(false, sourcemaps.init()),
            concat('main.js', { newLine: ';' }),
            uglify(),
            rename({ suffix: '.min' }),
            gulpif(false, sourcemaps.write()),
            gulp.dest('public/build/')
        ], cb);
});

gulp.task('default', gulp.series('scripts'));