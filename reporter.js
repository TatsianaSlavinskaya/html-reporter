var fs = require('fs');
var path = require('canonical-path');
var _ = require('lodash');


// Custom reporter
var Reporter_html = function(options) {
    var _defaultOutputFile = path.resolve(process.cwd(), './_test-output', 'html-report.html');
    options.outputFile = options.outputFile || _defaultOutputFile;

    var screenshotsFolder= "./_test-output/screenhots";

    //fs.mkdirSync(screenshotFolder);

    initOutputFile(options.outputFile);
    options.appDir = options.appDir ||  './';
    var _root = { appDir: options.appDir, suites: [] };
    log('AppDir: ' + options.appDir, +1);
    var _currentSuite;

    this.suiteStarted = function(suite) {
        _currentSuite = { description: suite.description, status: null, specs: [] };
        _root.suites.push(_currentSuite);
        log('Suite: ' + suite.description, +1);
    };

    this.suiteDone = function(suite) {
        var statuses = _currentSuite.specs.map(function(spec) {
            return spec.status;
        });
        statuses = _.uniq(statuses);
        var status = statuses.indexOf('failed') >= 0 ? 'failed' : statuses.join(', ');
        _currentSuite.status = status;
        log('Suite ' + _currentSuite.status + ': ' + suite.description, -1);
    };

    // this.specStarted = function(spec) {
    //
    // };

    this.specDone = function(spec) {
        var currentSpec = {
            description: spec.description,
            status: spec.status,
            screenhost : spec.screenshot
        };
        if (spec.failedExpectations.length > 0) {
            currentSpec.failedExpectations = spec.failedExpectations;
        }
        currentSpec.screenshot = currentSpec.description + '.png';

        browser.takeScreenshot().then(function (png) {
            var screenshotPath;
            screenshotPath = path.join(screenshotFolder, currentSpec.screenshot)
            ensureDirectoryExistence(screenshotPath);
            writeScreenshot(png, screenshotPath);
        });
            _currentSuite.specs.push(currentSpec);
        log(spec.status + ' - ' + spec.description);
    };

    this.jasmineDone = function() {
        outputFile = options.outputFile;
        var output = formatOutput(_root);
        fs.appendFileSync(outputFile, output);
    };
    function writeScreenshot(data, filename) {
        var stream = fs.createWriteStream(filename);
        stream.write(new Buffer(data, 'base64'));
        stream.end();
    };
    function ensureDirectoryExistence(filePath) {
        var dirname = path.dirname(filePath);
        if (directoryExists(dirname)) {
            return true;
        }
        ensureDirectoryExistence(dirname);
        fs.mkdirSync(dirname);
    }

    function directoryExists(path) {
        try {
            return fs.statSync(path).isDirectory();
        }
        catch (err) {
            return false;
        }
    }

    function initOutputFile(outputFile) {
        ensureDirectoryExistence(outputFile);
        var header = '<!DOCTYPE html><html><head lang=en><meta charset=UTF-8><title></title><style>.suite > .passed{background: green} .suite > .failed {background: red} .spec .passed{color: green} .spec .failed {color: red}.screenshot img{border: solid 3px black;} </style></head>';
        fs.writeFileSync(outputFile, header);
    }

    // for output file output
    function formatOutput(output) {
        var html = '<div><h2>' + "Protractor results for: " + (new Date()).toLocaleString() + '</h2></div>';
        html += '<div>';
        output.suites.forEach(function(suite) {
            html += '<div class="suite">';
            if(suite.status === "passed"){
                html += '<h3 class="passed">Suite: ';
            }else{
                html += '<h3 class="failed">Suite: ';
            }
            html += suite.description + ' -- ' + suite.status + '</h3>';
            suite.specs.forEach(function(spec){
                html += '<div class="spec">';
                if(spec.status === "passed") {
                    html += '<p class="passed">';
                }else {
                    html += '<p class="failed">';
                }
                html += spec.status + ' - ' + spec.description + '</p>';
                html += '<a href="' + screenshotFolder + spec.screenshot + '" class="screenshot">';
                html += '<img src="'+ 'screenshots/' + spec.screenshot + '" width="100" height="100" />';
                html += '</a>';
                if (spec.failedExpectations) {
                    spec.failedExpectations.forEach(function (fe) {
                        html += '<div> message: ' + fe.message + '</div>';
                    });
                }
                html += '</div>';
            })
        });
        html += '</div>';
        html += '</html>';
        return html;
    }

    // for console output
    var _pad;
    function log(str, indent) {
        _pad = _pad || '';
        if (indent == -1) {
            _pad = _pad.substr(2);
        }
        console.log(_pad + str);
        if (indent == 1) {
            _pad = _pad + '  ';
        }
    }
};

module.exports = Reporter;
