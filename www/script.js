////////////////////////////////////////////////////////////////////////////////
// Initialization code
////////////////////////////////////////////////////////////////////////////////

var canvas;
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
                slider.id = 'slider' + nextID++;
                html += '<tr><td>' + slider.label + ':</td><td><div class="slider" id="' + slider.id + '"></div></td></tr>';
            }
            html += '</table><div class="button accept">Accept</div></div></div>';
            var item = $(html).appendTo('#sidebar')[0];
            item.filter = filter;

            // Set all initial nub values
            for (var j = 0; j < filter.nubs.length; j++) {
                var nub = filter.nubs[j];
                var x = nub.x * canvas.width;
                var y = nub.y * canvas.height;
                filter[nub.name] = { x: x, y: y };
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

function Filter(name, func, init, update) {
    this.name = name;
    this.func = func;
    this.update = update;
    this.sliders = [];
    this.nubs = [];
    init.call(this);
}

Filter.prototype.addNub = function(name, x, y) {
    this.nubs.push({ name: name, x: x, y: y });
};

Filter.prototype.addSlider = function(name, label, min, max, value, step) {
    this.sliders.push({ name: name, label: label, min: min, max: max, value: value, step: step });
};

////////////////////////////////////////////////////////////////////////////////
// Filter definitions
////////////////////////////////////////////////////////////////////////////////

var filters = {
    'Adjust': [
        new Filter('Brightness / Contrast', 'brightnessContrast', function() {
            this.addSlider('brightness', 'Brightness', -1, 1, 0, 0.01);
            this.addSlider('contrast', 'Contrast', -1, 1, 0, 0.01);
        }, function() {
            canvas.draw(texture).brightnessContrast(this.brightness, this.contrast).update();
        }),
        new Filter('Hue / Saturation', 'hueSaturation', function() {
            this.addSlider('hue', 'Hue', -1, 1, 0, 0.01);
            this.addSlider('saturation', 'Saturation', -1, 1, 0, 0.01);
        }, function() {
            canvas.draw(texture).hueSaturation(this.hue, this.saturation).update();
        })
    ],
    'Blur': [
        new Filter('Zoom Blur', 'zoomBlur', function() {
            this.addNub('center', 0.5, 0.5);
            this.addSlider('strength', 'Strength', 0, 1, 0.3, 0.01);
        }, function() {
            canvas.draw(texture).zoomBlur(this.center.x, this.center.y, this.strength).update();
        }),
        new Filter('Triangle Blur', 'triangleBlur', function() {
            this.addSlider('radius', 'Radius', 0, 200, 50, 1);
        }, function() {
            canvas.draw(texture).triangleBlur(this.radius).update();
        }),
        new Filter('Tilt Shift', 'tiltShift', function() {
            this.addNub('start', 0.15, 0.75);
            this.addNub('end', 0.75, 0.6);
            this.addSlider('blurRadius', 'Radius', 0, 50, 15, 1);
            this.addSlider('gradientRadius', 'Thickness', 0, 400, 200, 1);
        }, function() {
            canvas.draw(texture).tiltShift(this.start.x, this.start.y, this.end.x, this.end.y, this.blurRadius, this.gradientRadius).update();
        }),
        new Filter('Lens Blur', 'lensBlur', function() {
            this.addSlider('radius', 'Radius', 0, 20, 10, 1);
            this.addSlider('brightness', 'Brightness', -1, 1, 0.75, 0.01);
        }, function() {
            canvas.draw(texture).lensBlur(this.radius, this.brightness).update();
        })
    ],
    'Warp': [
        new Filter('Swirl', 'swirl', function() {
            this.addNub('center', 0.5, 0.5);
            this.addSlider('angle', 'Angle', -25, 25, 3, 0.1);
            this.addSlider('radius', 'Radius', 0, 600, 200, 1);
        }, function() {
            canvas.draw(texture).swirl(this.center.x, this.center.y, this.radius, this.angle).update();
        }),
        new Filter('Bulge / Pinch', 'bulgePinch', function() {
            this.addNub('center', 0.5, 0.5);
            this.addSlider('strength', 'Strength', -1, 1, 0.5, 0.01);
            this.addSlider('radius', 'Radius', 0, 600, 200, 1);
        }, function() {
            canvas.draw(texture).bulgePinch(this.center.x, this.center.y, this.radius, this.strength).update();
        }),
        new Filter('Perspective', 'perspective', function() {
            this.addNub('a', 0.25, 0.25);
            this.addNub('b', 0.75, 0.25);
            this.addNub('c', 0.25, 0.75);
            this.addNub('d', 0.75, 0.75);
        }, function() {
            var xmin = canvas.width * 0.25, ymin = canvas.height * 0.25;
            var xmax = canvas.width * 0.75, ymax = canvas.height * 0.75;
            var before = [xmin, ymin, xmax, ymin, xmin, ymax, xmax, ymax];
            var after = [this.a.x, this.a.y, this.b.x, this.b.y, this.c.x, this.c.y, this.d.x, this.d.y];
            canvas.draw(texture).perspective(before, after).update();
        })
    ],
    'Fun': [
        new Filter('Ink', 'ink', function() {
            this.addSlider('strength', 'Strength', 0, 1, 0.25, 0.01);
        }, function() {
            canvas.draw(texture).ink(this.strength).update();
        }),
        new Filter('Edge Work', 'edgeWork', function() {
            this.addSlider('radius', 'Radius', 0, 200, 10, 1);
        }, function() {
            canvas.draw(texture).edgeWork(this.radius).update();
        }),
        new Filter('Hexagonal Pixelate', 'hexagonalPixelate', function() {
            this.addNub('center', 0.5, 0.5);
            this.addSlider('scale', 'Scale', 10, 100, 20, 1);
        }, function() {
            canvas.draw(texture).hexagonalPixelate(this.center.x, this.center.y, this.scale).update();
        }),
        new Filter('Dot Screen', 'dotScreen', function() {
            this.addNub('center', 0.5, 0.5);
            this.addSlider('angle', 'Angle', 0, Math.PI / 2, 1.1, 0.01);
            this.addSlider('size', 'Size', 3, 20, 3, 0.01);
        }, function() {
            canvas.draw(texture).dotScreen(this.center.x, this.center.y, this.angle, this.size).update();
        }),
        new Filter('Color Halftone', 'colorHalftone', function() {
            this.addNub('center', 0.5, 0.5);
            this.addSlider('angle', 'Angle', 0, Math.PI / 2, 1.1, 0.01);
            this.addSlider('size', 'Size', 3, 20, 4, 0.01);
        }, function() {
            canvas.draw(texture).colorHalftone(this.center.x, this.center.y, this.angle, this.size).update();
        })
    ]
};
