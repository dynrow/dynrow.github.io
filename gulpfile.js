var gulp = require('gulp');
var uglify = require('gulp-uglify');
var rename = require('gulp-rename');

//压缩js
gulp.task('jsmin', function() {
    return gulp.src('js/dynrow.js')
        //排除混淆关键字
        .pipe(uglify({ mangle: { except: ['require', 'exports', 'module', '$'] } }))
        .pipe(rename({
            suffix: '.min'
        }))
        .pipe(gulp.dest('js'));
});