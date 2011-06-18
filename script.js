////////////////////////////////////////////////////////////////////////////////
// Initialization code
////////////////////////////////////////////////////////////////////////////////

var canvas;
var canvas2d;
var texture;
var selectedItem;
var selectedFilter;

function loadImage(src) {
    var image = new Image();
    image.onload = function() {
        if (selectedItem) contractItem(selectedItem);
        if (selectedFilter) setSelectedFilter(null);
        selectedItem = null;
        hideDialog();
        init(image);
    };
    image.src = src;
}

function showDialog() {
    $('#fade').fadeIn();
    $('#dialog').show().css({
        top: -$('#dialog').outerHeight()
    }).animate({
        top: 0
    });
}

function hideDialog() {
    $('#fade').fadeOut();
    $('#dialog').animate({
        top: -$('#dialog').outerHeight()
    }, function() {
        $('#dialog').hide();
    });
}

function contractItem(item) {
    $(item).removeClass('active').animate({ paddingTop: 0 });
    $(item).children('.contents').slideUp();
}

function expandItem(item) {
    $(item).addClass('active').animate({ paddingTop: 10 });
    $(item).children('.contents').slideDown();
}

function setSelectedFilter(filter) {
    canvas2d.getContext('2d').clearRect(0, 0, canvas2d.width, canvas2d.height);

    // Set the new filter
    $('#nubs').html('');
    selectedFilter = filter;

    // Update UI elements and draw filter
    if (filter) {
        // Reset all sliders
        for (var i = 0; i < filter.sliders.length; i++) {
            var slider = filter.sliders[i];
            $('#' + slider.id).slider('value', slider.value);
        }

        // Reset all curves
        for (var i = 0; i < filter.curves.length; i++) {
            var curves = filter.curves[i];
            filter[curves.name] = [[0, 0], [1, 1]];
            curves.draw();
        }

        // Reset all segmented controls
        for (var i = 0; i < filter.segmented.length; i++) {
            var segmented = filter.segmented[i];
            $('#' + segmented.id + '-' + segmented.initial).mousedown();
        }

        // Generate all nubs
        for (var i = 0; i < filter.nubs.length; i++) {
            var nub = filter.nubs[i];
            var x = nub.x * canvas.width;
            var y = nub.y * canvas.height;
            $('<div class="nub" id="nub' + i + '"></div>').appendTo('#nubs');
            var ondrag = (function(nub) { return function(event, ui) {
                var offset = $(event.target.parentNode).offset();
                filter[nub.name] = { x: ui.offset.left - offset.left, y: ui.offset.top - offset.top };
                filter.update();
            }; })(nub);
            $('#nub' + i).draggable({
                drag: ondrag,
                containment: 'parent',
                scroll: false
            }).css({ left: x, top: y });
            filter[nub.name] = { x: x, y: y };
        }

        if (filter.reset) filter.reset();
        filter.update();
    } else {
        canvas.draw(texture).update();
    }
}

function init(image) {
    // Create a texture from the image and draw it to the canvas
    if (texture) texture.destroy();
    texture = canvas.texture(image);
    canvas.draw(texture).update();

    // Set the bounds of the drag area so nubs can't be dragged off the image
    $('#nubs').css({
        width: image.width,
        height: image.height
    });
    canvas2d.width = image.width;
    canvas2d.height = image.height;

    // We're done loading, show the UI to the user
    if (selectedItem) contractItem(selectedItem);
    setSelectedFilter(null);
    selectedItem = null;
    $('#loading').hide();
}

$(window).load(function() {
    // Try to get a WebGL canvas
    if (!window.fx) {
        $('#loading').html('Could not load glfx.js, please check your internet connection');
        return;
    }
    try {
        canvas = fx.canvas().replace($('#placeholder')[0]);
    } catch (e) {
        $('#loading').html('<div class="sadface">:(</div>Sorry, but this browser doesn\'t support WebGL.<br>Please see ' +
            '<a href="http://www.khronos.org/webgl/wiki/Getting_a_WebGL_Implementation">Getting a WebGL implementation</a>');
        return;
    }
    canvas2d = $('#canvas2d')[0];

    // Generate the HTML for the sidebar
    var nextID = 0;
    for (var category in filters) {
        $('<div class="header">' + category + '</div>').appendTo('#sidebar');
        for (var i = 0; i < filters[category].length; i++) {
            var filter = filters[category][i];

            // Generate the HTML for the controls
            var html = '<div class="item"><div class="title">' + filter.name + '</div><div class="contents"><table>';
            for (var j = 0; j < filter.sliders.length; j++) {
                var slider = filter.sliders[j];
                slider.id = 'control' + nextID++;
                html += '<tr><td>' + slider.label + ':</td><td><div class="slider" id="' + slider.id + '"></div></td></tr>';
            }
            for (var j = 0; j < filter.segmented.length; j++) {
                var segmented = filter.segmented[j];
                segmented.id = 'control' + nextID++;
                html += '<tr><td>' + segmented.label + ':</td><td><div class="segmented">';
                for (var k = 0; k < segmented.labels.length; k++) {
                    html += '<div class="segment' + (k == segmented.initial ? ' selected' : '') + '" id="' + segmented.id + '-' + k + '">' + segmented.labels[k] + '</div>';
                }
                html += '</div></td></tr>';
            }
            html += '</table>';
            for (var j = 0; j < filter.curves.length; j++) {
                var curves = filter.curves[j];
                curves.id = 'control' + nextID++;
                html += '<canvas class="curves" id="' + curves.id + '"></canvas>';
            }
            html += '<div class="button accept">Accept</div><div class="reset">Reset</div></div></div>';
            var item = $(html).appendTo('#sidebar')[0];
            item.filter = filter;

            // Add reset button
            (function(filter) {
                $(item).find('.reset').click(function() {
                    setSelectedFilter(filter);
                });
            })(filter);

            // Make segmented controls
            for (var j = 0; j < filter.segmented.length; j++) {
                var segmented = filter.segmented[j];
                filter[segmented.name] = segmented.initial;
                for (var k = 0; k < segmented.labels.length; k++) {
                    $('#' + segmented.id + '-' + k).mousedown((function(filter, segmented, index) { return function() {
                        filter[segmented.name] = index;
                        for (var k = 0; k < segmented.labels.length; k++) {
                            $('#' + segmented.id + '-' + k)[index == k ? 'addClass' : 'removeClass']('selected');
                        }
                        filter.update();
                    }; })(filter, segmented, k));
                }
            }

            // Set all initial nub values
            for (var j = 0; j < filter.nubs.length; j++) {
                var nub = filter.nubs[j];
                var x = nub.x * canvas.width;
                var y = nub.y * canvas.height;
                filter[nub.name] = { x: x, y: y };
            }

            // Set up curves
            for (var j = 0; j < filter.curves.length; j++) {
                var curves = filter.curves[j];
                (function(curves, filter) {
                    var canvas = $('#' + curves.id)[0];
                    var c = canvas.getContext('2d');
                    var w = canvas.width = $(canvas).width();
                    var h = canvas.height = $(canvas).height();
                    var start = 0;
                    var end = 1;

                    // Make sure there's always a start and end node
                    function fixCurves() {
                        if (point[0] == 0) start = point[1];
                        if (point[0] == 1) end = point[1];
                        var points = filter[curves.name];
                        var foundStart = false;
                        var foundEnd = false;
                        for (var i = 0; i < points.length; i++) {
                            var p = points[i];
                            if (p[0] == 0) {
                                foundStart = true;
                                if (point[0] == 0 && p != point) points.splice(i--, 1);
                            } else if (p[0] == 1) {
                                foundEnd = true;
                                if (point[0] == 1 && p != point) points.splice(i--, 1);
                            }
                        }
                        if (!foundStart) points.push([0, start]);
                        if (!foundEnd) points.push([1, end]);
                    };

                    // Render the curves to the canvas
                    curves.draw = function() {
                        var points = filter[curves.name];
                        var map = fx.splineInterpolate(points);
                        c.clearRect(0, 0, w, h);
                        c.strokeStyle = '#4B4947';
                        c.beginPath();
                        for (var i = 0; i < map.length; i++) {
                            c.lineTo(i / map.length * w, (1 - map[i] / 255) * h);
                        }
                        c.stroke();
                        c.fillStyle = 'white';
                        for (var i = 0; i < points.length; i++) {
                            var p = points[i];
                            c.beginPath();
                            c.arc(p[0] * w, (1 - p[1]) * h, 3, 0, Math.PI * 2, false);
                            c.fill();
                        }
                    };

                    // Allow the curves to be manipulated using the mouse
                    var dragging = false;
                    var point;
                    function getMouse(e) {
                        var offset = $(canvas).offset();
                        var x = Math.max(0, Math.min(1, (e.pageX - offset.left) / w));
                        var y = Math.max(0, Math.min(1, 1 - (e.pageY - offset.top) / h));
                        return [x, y];
                    }
                    $(canvas).mousedown(function(e) {
                        var points = filter[curves.name];
                        point = getMouse(e);
                        for (var i = 0; i < points.length; i++) {
                            var p = points[i];
                            var x = (p[0] - point[0]) * w;
                            var y = (p[1] - point[1]) * h;
                            if (x * x + y * y < 5 * 5) {
                                point = p;
                                break;
                            }
                        }
                        if (i == points.length) points.push(point);
                        dragging = true;
                        fixCurves();
                        curves.draw();
                        filter.update();
                    });
                    $(document).mousemove(function(e) {
                        if (dragging) {
                            var p = getMouse(e);
                            point[0] = p[0];
                            point[1] = p[1];
                            fixCurves();
                            curves.draw();
                            filter.update();
                        }
                    });
                    $(document).mouseup(function() {
                        dragging = false;
                    });

                    // Set the initial curves
                    filter[curves.name] = [[0, 0], [1, 1]];
                    curves.draw();
                })(curves, filter);
            }

            // Make jQuery UI sliders
            for (var j = 0; j < filter.sliders.length; j++) {
                var slider = filter.sliders[j];
                filter[slider.name] = slider.value;
                var onchange = (function(filter, slider) { return function(event, ui) {
                    filter[slider.name] = ui.value;
                    if (selectedFilter == filter) filter.update();
                }; })(filter, slider);
                $('#' + slider.id).slider({
                    slide: onchange,
                    change: onchange,
                    min: slider.min,
                    max: slider.max,
                    value: slider.value,
                    step: slider.step
                });
            }
        }
    }

    // Change the filter when a sidebar item is clicked
    $('#sidebar .item .title').live('mousedown', function(e) {
        var item = e.target.parentNode;
        if (selectedItem) contractItem(selectedItem);
        if (selectedItem != item) {
            expandItem(item);
            selectedItem = item;
            setSelectedFilter(item.filter);
        } else {
            setSelectedFilter(null);
            selectedItem = null;
        }
    });

    // Update texture with canvas contents when a filter is accepted
    $('.accept').live('click', function() {
        contractItem(selectedItem);
        texture.destroy();
        texture = canvas.contents();
        setSelectedFilter(null);
        selectedItem = null;
    });

    // Hook up toolbar buttons
    $('#load').click(function() {
        $('#dialog').html('<div class="contents">Pick one of the sample images below or upload an image of your own:<div class="images">' +
            '<img class="loader" src="samples/mountain.jpg" height="100">' +
            '<img class="loader" src="samples/smoke.jpg" height="100">' +
            '<img class="loader" src="samples/face.jpg" height="100">' +
            '<img class="loader" src="samples/cat.jpg" height="100">' +
            '<img class="loader" src="samples/greyhound.jpg" height="100">' +
            '<img class="loader" src="samples/sunset.jpg" height="100">' +
            '<img class="loader" src="samples/leaf.jpg" height="100">' +
            '<img class="loader" src="samples/perspective.jpg" height="100">' +
            '</div><div class="credits">Flickr image credits in order: ' +
            '<a href="http://www.flickr.com/photos/matthigh/2125630879/">matthigh</a>, ' +
            '<a href="http://www.flickr.com/photos/delosj/5816379127/">delosj</a>, ' +
            '<a href="http://www.flickr.com/photos/stuckincustoms/219537913/">stuckincustoms</a>, ' +
            '<a href="http://www.flickr.com/photos/pasma/580401331/">pasma</a>, ' +
            '<a href="http://www.flickr.com/photos/delosj/5546225759/">delosj</a>, ' +
            '<a href="http://www.flickr.com/photos/seriousbri/3736154699/">seriousbri</a>, ' +
            '<a href="http://www.flickr.com/photos/melisande-origami/157818928/">melisande-origami</a>, and ' +
            '<a href="http://www.flickr.com/photos/stuckincustoms/4669163231/">stuckincustoms</a>' +
            '</div></div>' +
            '<div class="button"><input type="file" class="upload">Upload File...</div>' +
            '<div class="button closedialog">Cancel</div>');
        showDialog();
    });
    $('#dialog input.upload').live('change', function(e) {
        var reader = new FileReader();
        reader.onload = function(e) {
            loadImage(e.target.result);
        };
        reader.readAsDataURL(e.target.files[0]);
    });
    $('#dialog img.loader').live('mousedown', function(e) {
        loadImage(e.target.src);
    });
    $('#save').click(function() {
        window.open(canvas.toDataURL('image/png'));
    });
    $('#about').click(function() {
        $('#dialog').html('<div class="contents">Copyright 2011 <a href="http://madebyevan.com">Evan Wallace</a>' +
        '<br><br>This application is powered by <a href="http://evanw.github.com/glfx.js/">glfx.js</a>, an ' +
        'open-source image effect library that uses WebGL.&nbsp; The source code for this application is ' +
        'also <a href="http://github.com/evanw/webgl-filter/">available on GitHub</a>.</div><div class="button ' +
        'closedialog">Close</div>');
        showDialog();
    });
    $('.closedialog').live('click', function() {
        hideDialog();
    });

    // Start loading the first image
    loadImage('samples/mountain.jpg');
});

////////////////////////////////////////////////////////////////////////////////
// Filter object
////////////////////////////////////////////////////////////////////////////////

function Filter(name, init, update, reset) {
    this.name = name;
    this.update = update;
    this.reset = reset;
    this.sliders = [];
    this.curves = [];
    this.segmented = [];
    this.nubs = [];
    init.call(this);
}

Filter.prototype.addNub = function(name, x, y) {
    this.nubs.push({ name: name, x: x, y: y });
};

Filter.prototype.addCurves = function(name) {
    this.curves.push({ name: name });
};

Filter.prototype.addSegmented = function(name, label, labels, initial) {
    this.segmented.push({ name: name, label: label, labels: labels, initial: initial });
};

Filter.prototype.addSlider = function(name, label, min, max, value, step) {
    this.sliders.push({ name: name, label: label, min: min, max: max, value: value, step: step });
};

////////////////////////////////////////////////////////////////////////////////
// Filter definitions
////////////////////////////////////////////////////////////////////////////////

var filters = {
    'Adjust': [
        new Filter('Brightness / Contrast', function() {
            this.addSlider('brightness', 'Brightness', -1, 1, 0, 0.01);
            this.addSlider('contrast', 'Contrast', -1, 1, 0, 0.01);
        }, function() {
            canvas.draw(texture).brightnessContrast(this.brightness, this.contrast).update();
        }),
        new Filter('Hue / Saturation', function() {
            this.addSlider('hue', 'Hue', -1, 1, 0, 0.01);
            this.addSlider('saturation', 'Saturation', -1, 1, 0, 0.01);
        }, function() {
            canvas.draw(texture).hueSaturation(this.hue, this.saturation).update();
        }),
        new Filter('Curves', function() {
            this.addCurves('points');
        }, function() {
            canvas.draw(texture).curves(this.points).update();
        }),
        new Filter('Denoise', function() {
            this.addSlider('strength', 'Strength', 0, 1, 0.5, 0.01);
        }, function() {
            canvas.draw(texture).denoise(3 + 200 * Math.pow(1 - this.strength, 4)).update();
        }),
        new Filter('Unsharp Mask', function() {
            this.addSlider('radius', 'Radius', 0, 200, 20, 1);
            this.addSlider('strength', 'Strength', 0, 5, 2, 0.01);
        }, function() {
            canvas.draw(texture).unsharpMask(this.radius, this.strength).update();
        })
    ],
    'Blur': [
        new Filter('Zoom Blur', function() {
            this.addNub('center', 0.5, 0.5);
            this.addSlider('strength', 'Strength', 0, 1, 0.3, 0.01);
        }, function() {
            canvas.draw(texture).zoomBlur(this.center.x, this.center.y, this.strength).update();
        }),
        new Filter('Triangle Blur', function() {
            this.addSlider('radius', 'Radius', 0, 200, 50, 1);
        }, function() {
            canvas.draw(texture).triangleBlur(this.radius).update();
        }),
        new Filter('Tilt Shift', function() {
            this.addNub('start', 0.15, 0.75);
            this.addNub('end', 0.75, 0.6);
            this.addSlider('blurRadius', 'Radius', 0, 50, 15, 1);
            this.addSlider('gradientRadius', 'Thickness', 0, 400, 200, 1);
        }, function() {
            canvas.draw(texture).tiltShift(this.start.x, this.start.y, this.end.x, this.end.y, this.blurRadius, this.gradientRadius).update();
        }),
        new Filter('Lens Blur', function() {
            this.addSlider('radius', 'Radius', 0, 20, 10, 1);
            this.addSlider('brightness', 'Brightness', -1, 1, 0.75, 0.01);
        }, function() {
            canvas.draw(texture).lensBlur(this.radius, this.brightness).update();
        })
    ],
    'Warp': [
        new Filter('Swirl', function() {
            this.addNub('center', 0.5, 0.5);
            this.addSlider('angle', 'Angle', -25, 25, 3, 0.1);
            this.addSlider('radius', 'Radius', 0, 600, 200, 1);
        }, function() {
            canvas.draw(texture).swirl(this.center.x, this.center.y, this.radius, this.angle).update();
        }),
        new Filter('Bulge / Pinch', function() {
            this.addNub('center', 0.5, 0.5);
            this.addSlider('strength', 'Strength', -1, 1, 0.5, 0.01);
            this.addSlider('radius', 'Radius', 0, 600, 200, 1);
        }, function() {
            canvas.draw(texture).bulgePinch(this.center.x, this.center.y, this.radius, this.strength).update();
        }),
        new Filter('Perspective', function() {
            this.addSegmented('showAfter', 'Edit point set', ['Before', 'After'], 1);
            this.addNub('a', 0.25, 0.25);
            this.addNub('b', 0.75, 0.25);
            this.addNub('c', 0.25, 0.75);
            this.addNub('d', 0.75, 0.75);
            var update = this.update;
            this.update = function() {
                update.call(this);

                // Draw a white rectangle connecting the four control points
                var c = canvas2d.getContext('2d');
                c.clearRect(0, 0, canvas2d.width, canvas2d.height);
                for (var i = 0; i < 2; i++) {
                    c.beginPath();
                    c.lineTo(this.a.x, this.a.y);
                    c.lineTo(this.b.x, this.b.y);
                    c.lineTo(this.d.x, this.d.y);
                    c.lineTo(this.c.x, this.c.y);
                    c.closePath();
                    c.lineWidth = i ? 2 : 4;
                    c.strokeStyle = i ? 'white' : 'black';
                    c.stroke();
                }
            };
        }, function() {
            var points = [this.a.x, this.a.y, this.b.x, this.b.y, this.c.x, this.c.y, this.d.x, this.d.y];
            if (this.showAfter) {
                this.after = points;
                canvas.draw(texture).perspective(this.before, this.after).update();
            } else {
                this.before = points;
                canvas.draw(texture).update();
            }
        }, function() {
            var w = canvas.width, h = canvas.height;
            this.before = [0, 0, w, 0, 0, h, w, h];
            this.after = [this.a.x, this.a.y, this.b.x, this.b.y, this.c.x, this.c.y, this.d.x, this.d.y];
        })
    ],
    'Fun': [
        new Filter('Ink', function() {
            this.addSlider('strength', 'Strength', 0, 1, 0.25, 0.01);
        }, function() {
            canvas.draw(texture).ink(this.strength).update();
        }),
        new Filter('Edge Work', function() {
            this.addSlider('radius', 'Radius', 0, 200, 10, 1);
        }, function() {
            canvas.draw(texture).edgeWork(this.radius).update();
        }),
        new Filter('Hexagonal Pixelate', function() {
            this.addNub('center', 0.5, 0.5);
            this.addSlider('scale', 'Scale', 10, 100, 20, 1);
        }, function() {
            canvas.draw(texture).hexagonalPixelate(this.center.x, this.center.y, this.scale).update();
        }),
        new Filter('Dot Screen', function() {
            this.addNub('center', 0.5, 0.5);
            this.addSlider('angle', 'Angle', 0, Math.PI / 2, 1.1, 0.01);
            this.addSlider('size', 'Size', 3, 20, 3, 0.01);
        }, function() {
            canvas.draw(texture).dotScreen(this.center.x, this.center.y, this.angle, this.size).update();
        }),
        new Filter('Color Halftone', function() {
            this.addNub('center', 0.5, 0.5);
            this.addSlider('angle', 'Angle', 0, Math.PI / 2, 1.1, 0.01);
            this.addSlider('size', 'Size', 3, 20, 4, 0.01);
        }, function() {
            canvas.draw(texture).colorHalftone(this.center.x, this.center.y, this.angle, this.size).update();
        })
    ]
};
