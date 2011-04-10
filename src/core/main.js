var gl;
var original;
var texture;
var filter;
var filters;
var displayShader;

function initGL() {
    try {
        var canvas3d = document.createElement('canvas');
        gl = canvas3d.getContext('experimental-webgl');
        $('.document').html('<div id="markers"></div>');
        $('.document').append(canvas3d);
        displayShader = new Shader(null, '\
            uniform sampler2D texture;\
            varying vec2 texCoord;\
            void main() {\
                gl_FragColor = texture2D(texture, vec2(texCoord.x, 1.0 - texCoord.y));\
            }\
        ');
    } catch (e) {
        $('.loading').html('Your browser does not support WebGL.<br>Please see <a href="http://www.khronos.org/webgl/wiki/Getting_a_WebGL_Implementation">Getting a WebGL Implementation</a>.');
    }
}

function reloadImage(image) {
    gl.canvas.width = image.width;
    gl.canvas.height = image.height;
    gl.viewport(0, 0, image.width, image.height);
    __delete__(original);
    __delete__(texture);
    Texture.emptyCache();
    original = Texture.fromImage(image);
    texture = new Texture(image.width, image.height, gl.RGB, gl.UNSIGNED_BYTE);
    drawGL();

    $('#load-image-overlay').fadeOut();
}

function drawGL() {
    if (original) {
        filter.drawTo(original, texture);

        texture.use();
        displayShader.drawRect();
    }
}

function startLoading() {
    var image = new Image();
    image.onload = function() {
        reloadImage(image);
    };
    image.src = 'samples/Flowers_small.jpg';

    // sample images
    $('.sample-image').click(function() {
        var image = document.createElement('img');
        image.onload = function() {
            reloadImage(image);
        };
        image.src = this.src;
    });

    // image load
    $('#load-image').click(function() {
        $('#load-image-overlay').fadeIn();
    });
    $('#close-overlay').click(function() {
        $('#load-image-overlay').fadeOut();
    });
    $('#use-chosen-file').click(function() {
        var files = $('#file').attr('files');
        var reader = new FileReader();

        reader.onload = function(event) {
            var image = document.createElement('img');
            image.onload = function() {
                reloadImage(image);
            };
            image.src = event.target.result;
        };

        reader.readAsDataURL(files[0]);
    });

    // image save
    $('#save-image').click(function() {
        var array = new Uint8Array(texture.width * texture.height * 4);
        texture.drawTo(function() {
            gl.readPixels(0, 0, texture.width, texture.height, gl.RGBA, gl.UNSIGNED_BYTE, array);
        });
        
        // copy texture data to the canvas
        var canvas2d = document.createElement('canvas');
        var c = canvas2d.getContext('2d');
        canvas2d.width = texture.width;
        canvas2d.height = texture.height;
        var data = c.createImageData(texture.width, texture.height);
        for (var i = 0; i < array.length; i++) {
            data.data[i] = array[i];
        }
        c.putImageData(data, 0, 0);
        dataURL = canvas2d.toDataURL('image/png');

        // TODO: bounce request off of server
        window.open(dataURL);
    });
}

function switchToFilter(index) {
    filter = filters[index];
    $('#markers').html(filter.markerHTML || '');
    $('#controls').html('<table>' + filter.sliderHTML + '</table>');
    filter.initUI();
    drawGL();
}

function main() {
    initGL();
    startLoading();

    filters = [
        new BrightnessContrastFilter(),
        new BlurFilter(),
        new HueSaturationFilter(),
        new SwirlFilter(),
        new ZoomBlurFilter(),
        new DotScreenFilter(),
        new EdgeWorkFilter()
    ];
    for (var i = 0; i < filters.length; i++) {
        $('select').append('<option>' + filters[i].name + '</option>');
    }
    $('select').bind('change', function() {
        var index = $('select')[0].selectedIndex;
        switchToFilter(index);
    });
    switchToFilter(0);
}

exports.main = main;
