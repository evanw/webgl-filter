var hackny = (function() {
var exports = {};

// src/core/main.js
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
        new EdgeWorkFilter(),
        new InkFilter(),
        new GlassFilter(),
        new HexagonalPixelateFilter()
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

// src/filter/blur.js
function BlurFilter() {
    this.shader = new Shader(null, '\
        uniform sampler2D texture;\
        uniform float radius;\
        uniform vec2 delta;\
        varying vec2 texCoord;\
        \
        /* random number between 0 and 1 */\
        float random(vec3 scale, float seed) {\
            /* use the fragment position for randomness */\
            return fract(sin(dot(gl_FragCoord.xyz + seed, scale)) * 43758.5453 + seed);\
        }\
        \
        void main() {\
            vec3 color = vec3(0.0);\
            float total = 0.0;\
            \
            /* randomize the lookup values to hide the fixed number of samples */\
            float offset = random(vec3(12.9898, 78.233, 151.7182), 0.0);\
            \
            for (float t = -30.0; t <= 30.0; t++) {\
                float percent = (t + offset - 0.5) / 30.0;\
                float weight = 1.0 - abs(percent);\
                color += texture2D(texture, texCoord + delta * percent * radius).rgb * weight;\
                total += weight;\
            }\
            gl_FragColor = vec4(color / total, 1.0);\
        }\
    ');

    slider(this, 'Radius', 0, 100, 50, 1, function(value) {
        this.radius = value;
    });

    this.tempTexture = null;
}

BlurFilter.prototype.name = 'Blur';

BlurFilter.prototype.drawTo = function(original, texture) {
    var this_ = this;
    texture.drawTo(function() {
        original.use();
        this_.shader.uniforms({
            delta: [1 / original.width, 0],
            radius: this_.radius
        }).drawRect();
    });
    texture.drawToUsingSelf(function() {
        texture.use();
        this_.shader.uniforms({
            delta: [0, 1 / original.height],
            radius: this_.radius
        }).drawRect();
    });
};

// src/filter/brightnesscontrast.js
function BrightnessContrastFilter() {
    this.shader = new Shader(null, '\
        uniform sampler2D texture;\
        uniform float brightness;\
        uniform float contrast;\
        varying vec2 texCoord;\
        void main() {\
            vec3 color = texture2D(texture, texCoord).rgb;\
            color += brightness;\
            if (contrast > 0.0) {\
                color = (color - 0.5) / (1.0 - contrast) + 0.5;\
            } else {\
                color = (color - 0.5) * (1.0 + contrast) + 0.5;\
            }\
            gl_FragColor = vec4(color, 1.0);\
        }\
    ');

    slider(this, 'Brightness', -1, 1, 0, 0.02, function(value) {
        this.brightness = value;
    });
    slider(this, 'Contrast', -1, 1, 0, 0.02, function(value) {
        this.contrast = value;
    });
}

BrightnessContrastFilter.prototype.name = 'Brightness / Contrast';

BrightnessContrastFilter.prototype.drawTo = function(original, texture) {
    var this_ = this;
    texture.drawTo(function() {
        original.use();
        this_.shader.uniforms({
            brightness: this_.brightness,
            contrast: this_.contrast
        }).drawRect();
    });
};

// src/filter/dotscreen.js
function DotScreenFilter() {
    this.shader = new Shader(null, '\
        uniform sampler2D texture;\
        uniform float angle;\
        uniform float size;\
        uniform vec2 texSize;\
        varying vec2 texCoord;\
        void main() {\
            vec3 color = texture2D(texture, texCoord).rgb;\
            float s = sin(angle), c = cos(angle);\
            vec2 tex = texCoord * texSize;\
            vec2 point = vec2(\
                c * tex.x - s * tex.y,\
                s * tex.x + c * tex.y\
            ) * size;\
            float weight = (sin(point.x) * sin(point.y)) * 2.0;\
            float average = (color.r + color.g + color.b) / 3.0;\
            color = vec3(average + (average - 0.6) * 4.0 + weight);\
            gl_FragColor = vec4(color, 1.0);\
        }\
    ');

    slider(this, 'Angle', -1, 1, 0.5, 0.02, function(value) {
        this.angle = value;
    });
    slider(this, 'Size', 0, 1, 0.75, 0.02, function(value) {
        this.size = value;
    });
}

DotScreenFilter.prototype.name = 'Dot Screen';

DotScreenFilter.prototype.drawTo = function(original, texture) {
    var this_ = this;
    texture.drawTo(function() {
        original.use();
        this_.shader.uniforms({
            angle: this_.angle,
            size: this_.size,
            texSize: [original.width, original.height]
        }).drawRect();
    });
};

// src/filter/edgework.js
function EdgeWorkFilter() {
    this.firstShader = new Shader(null, '\
        uniform sampler2D texture;\
        uniform float radius;\
        uniform vec2 delta;\
        varying vec2 texCoord;\
        \
        /* random number between 0 and 1 */\
        float random(vec3 scale, float seed) {\
            /* use the fragment position for randomness */\
            return fract(sin(dot(gl_FragCoord.xyz + seed, scale)) * 43758.5453 + seed);\
        }\
        \
        void main() {\
            vec2 color = vec2(0.0);\
            vec2 total = vec2(0.0);\
            \
            /* randomize the lookup values to hide the fixed number of samples */\
            float offset = random(vec3(12.9898, 78.233, 151.7182), 0.0);\
            \
            for (float t = -30.0; t <= 30.0; t++) {\
                float percent = (t + offset - 0.5) / 30.0;\
                float weight = 1.0 - abs(percent);\
                vec3 sample = texture2D(texture, texCoord + delta * percent * radius).rgb;\
                float average = (sample.r + sample.g + sample.b) / 3.0;\
                color.x += average * weight;\
                total.x += weight;\
                if (abs(t) < 15.0) {\
                    weight = weight * 2.0 - 1.0;\
                    color.y += average * weight;\
                    total.y += weight;\
                }\
            }\
            gl_FragColor = vec4(color / total, 0.0, 1.0);\
        }\
    ');
    this.secondShader = new Shader(null, '\
        uniform sampler2D texture;\
        uniform float radius;\
        uniform vec2 delta;\
        varying vec2 texCoord;\
        \
        /* random number between 0 and 1 */\
        float random(vec3 scale, float seed) {\
            /* use the fragment position for randomness */\
            return fract(sin(dot(gl_FragCoord.xyz + seed, scale)) * 43758.5453 + seed);\
        }\
        \
        void main() {\
            vec2 color = vec2(0.0);\
            vec2 total = vec2(0.0);\
            \
            /* randomize the lookup values to hide the fixed number of samples */\
            float offset = random(vec3(12.9898, 78.233, 151.7182), 0.0);\
            \
            for (float t = -30.0; t <= 30.0; t++) {\
                float percent = (t + offset - 0.5) / 30.0;\
                float weight = 1.0 - abs(percent);\
                vec2 sample = texture2D(texture, texCoord + delta * percent * radius).xy;\
                color.x += sample.x * weight;\
                total.x += weight;\
                if (abs(t) < 15.0) {\
                    weight = weight * 2.0 - 1.0;\
                    color.y += sample.y * weight;\
                    total.y += weight;\
                }\
            }\
            float c = 1000.0 * (color.y / total.y - color.x / total.x) + 0.5;\
            gl_FragColor = vec4(c, c, c, 1.0);\
        }\
    ');

    slider(this, 'Radius', 0, 100, 15, 1, function(value) {
        this.radius = value;
    });

    this.tempTexture = null;
}

EdgeWorkFilter.prototype.name = 'Edge Work';

EdgeWorkFilter.prototype.drawTo = function(original, texture) {
    var this_ = this;
    texture.drawTo(function() {
        original.use();
        this_.firstShader.uniforms({
            delta: [1 / original.width, 0],
            radius: this_.radius
        }).drawRect();
    });
    texture.drawToUsingSelf(function() {
        texture.use();
        this_.secondShader.uniforms({
            delta: [0, 1 / original.height],
            radius: this_.radius
        }).drawRect();
    });
};

// src/filter/glass.js
function GlassFilter() {
    this.shader = new Shader(null, '\
        uniform sampler2D texture;\
        uniform float angle;\
        uniform float scale;\
        varying vec2 texCoord;\
        \
        vec2 rotate(vec2 vec, float percent) {\
            return vec2(vec.x * cos(6.28318531 * percent), vec.y * sin(6.28318531 * percent));\
        }\
        \
        vec2 crazyNoise(vec2 position) {\
            /* inspired from http://http.developer.nvidia.com/GPUGems/gpugems_ch05.html */\
            vec2 noise = vec2(1.0, 0.0);\
            float scale = 0.25;\
            for(int i = 0; i < 3; i++) {\
                vec2 sample = position.xy * scale;\
                noise = rotate(noise, sample.x + sample.y + sin(position.x * scale) + sin(position.y * scale));\
                scale *= 2.0;\
            }\
            return noise;\
        }\
        \
        void main() {\
            float size = (0.1 + scale) * 80.0;\
            vec2 coord = texCoord * size;\
            float s = sin(angle), c = cos(angle);\
            vec2 rotatedCoord = vec2(\
                c * coord.x - s * coord.y,\
                s * coord.x + c * coord.y\
            );\
            vec2 noise = crazyNoise(rotatedCoord) * 0.25 + crazyNoise(rotatedCoord * 0.5) * 0.75;\
            coord = (coord + noise) / size;\
            vec3 color = texture2D(texture, coord).rgb;\
            gl_FragColor = vec4(color, 1.0);\
        }\
    ');

    slider(this, 'Angle', -1, 1, 0, 0.02, function(value) {
        this.angle = value;
    });
    slider(this, 'Scale', 0, 1, 0.5, 0.01, function(value) {
        this.scale = value;
    });
}

GlassFilter.prototype.name = 'Glass';

GlassFilter.prototype.drawTo = function(original, texture) {
    var this_ = this;
    texture.drawTo(function() {
        original.use();
        this_.shader.uniforms({
            angle: this_.angle,
            scale: this_.scale
        }).drawRect();
    });
};

// src/filter/hexagonalpixelate.js
function HexagonalPixelateFilter() {
    this.shader = new Shader(null, '\
        uniform sampler2D texture;\
        uniform float scale;\
        uniform vec2 texSize;\
        varying vec2 texCoord;\
        void main() {\
            vec2 tex = texCoord * texSize / scale;\
            tex.y /= 0.866025404;\
            tex.x -= tex.y * 0.5;\
            \
            vec2 a;\
            if (tex.x + tex.y - floor(tex.x) - floor(tex.y) < 1.0) a = vec2(floor(tex.x), floor(tex.y));\
            else a = vec2(ceil(tex.x), ceil(tex.y));\
            vec2 b = vec2(ceil(tex.x), floor(tex.y));\
            vec2 c = vec2(floor(tex.x), ceil(tex.y));\
            \
            vec3 TEX = vec3(tex.x, tex.y, 1.0 - tex.x - tex.y);\
            vec3 A = vec3(a.x, a.y, 1.0 - a.x - a.y);\
            vec3 B = vec3(b.x, b.y, 1.0 - b.x - b.y);\
            vec3 C = vec3(c.x, c.y, 1.0 - c.x - c.y);\
            \
            float alen = length(TEX - A);\
            float blen = length(TEX - B);\
            float clen = length(TEX - C);\
            \
            vec2 choice;\
            if (alen < blen) {\
                if (alen < clen) choice = a;\
                else choice = c;\
            } else {\
                if (blen < clen) choice = b;\
                else choice = c;\
            }\
            \
            choice.x += choice.y * 0.5;\
            choice.y *= 0.866025404;\
            choice *= scale / texSize;\
            vec3 color = texture2D(texture, choice).rgb;\
            gl_FragColor = vec4(color, 1.0);\
        }\
    ');

    slider(this, 'Scale', 3, 60, 20, 1, function(value) {
        this.scale = value;
    });
}

HexagonalPixelateFilter.prototype.name = 'Hexagonal Pixelate';

HexagonalPixelateFilter.prototype.drawTo = function(original, texture) {
    var this_ = this;
    texture.drawTo(function() {
        original.use();
        this_.shader.uniforms({
            scale: this_.scale,
            texSize: [original.width, original.height]
        }).drawRect();
    });
};

// src/filter/huesaturation.js
function HueSaturationFilter() {
    this.shader = new Shader(null, '\
        uniform sampler2D texture;\
        uniform float hue;\
        uniform float saturation;\
        varying vec2 texCoord;\
        void main() {\
            vec3 color = texture2D(texture, texCoord).rgb;\
            \
            /* hue adjustment, wolfram alpha: RotationTransform[angle, {1, 1, 1}][{x, y, z}] */\
            float angle = hue * 3.14159265;\
            float s = sin(angle), c = cos(angle);\
            vec3 weights = (vec3(2.0 * c, -sqrt(3.0) * s - c, sqrt(3.0) * s - c) + 1.0) / 3.0;\
            float len = length(color);\
            color = vec3(\
                dot(color, weights.xyz),\
                dot(color, weights.zxy),\
                dot(color, weights.yzx)\
            );\
            \
            /* saturation adjustment */\
            float average = (color.x + color.y + color.z) / 3.0;\
            if (saturation > 0.0) {\
                color += (average - color) * (1.0 - 1.0 / (1.0 - saturation));\
            } else {\
                color += (average - color) * (-saturation);\
            }\
            \
            gl_FragColor = vec4(color, 1.0);\
        }\
    ');

    slider(this, 'Hue', -1, 1, 0, 0.02, function(value) {
        this.hue = value;
    });
    slider(this, 'Saturation', -1, 1, 0, 0.02, function(value) {
        this.saturation = value;
    });
}

HueSaturationFilter.prototype.name = 'Hue / Saturation';

HueSaturationFilter.prototype.drawTo = function(original, texture) {
    var this_ = this;
    texture.drawTo(function() {
        original.use();
        this_.shader.uniforms({
            hue: this_.hue,
            saturation: this_.saturation
        }).drawRect();
    });
};

// src/filter/ink.js
function InkFilter() {
    this.shader = new Shader(null, '\
        uniform sampler2D texture;\
        uniform float strength;\
        uniform vec2 texSize;\
        varying vec2 texCoord;\
        void main() {\
            vec2 dx = vec2(1.0 / texSize.x, 0.0);\
            vec2 dy = vec2(0.0, 1.0 / texSize.y);\
            vec3 color = texture2D(texture, texCoord).rgb;\
            float bigTotal = 0.0;\
            float smallTotal = 0.0;\
            vec3 bigAverage = vec3(0.0);\
            vec3 smallAverage = vec3(0.0);\
            for (float x = -2.0; x <= 2.0; x += 1.0) {\
                for (float y = -2.0; y <= 2.0; y += 1.0) {\
                    vec3 sample = texture2D(texture, texCoord + dx * x + dy * y).rgb;\
                    bigAverage += sample;\
                    bigTotal += 1.0;\
                    if (abs(x) + abs(y) < 2.0) {\
                        smallAverage += sample;\
                        smallTotal += 1.0;\
                    }\
                }\
            }\
            vec3 edge = max(vec3(0.0), bigAverage / bigTotal - smallAverage / smallTotal);\
            gl_FragColor = vec4(color - dot(edge, edge) * strength * strength * 200.0, 1.0);\
        }\
    ');

    slider(this, 'Strength', 0, 1, 0.5, 0.01, function(value) {
        this.strength = value;
    });
}

InkFilter.prototype.name = 'Ink';

InkFilter.prototype.drawTo = function(original, texture) {
    var this_ = this;
    texture.drawTo(function() {
        original.use();
        this_.shader.uniforms({
            strength: this_.strength,
            texSize: [original.width, original.height]
        }).drawRect();
    });
};

// src/filter/swirl.js
function SwirlFilter() {
    this.shader = new Shader(null, '\
        uniform sampler2D texture;\
        uniform float radius;\
        uniform float angle;\
        uniform vec2 center;\
        uniform vec2 texSize;\
        varying vec2 texCoord;\
        void main() {\
            vec2 coord = texCoord * texSize;\
            coord -= center;\
            float distance = length(coord);\
            if (distance < radius) {\
                float percent = (radius - distance) / radius;\
                float theta = percent * percent * angle * 8.0;\
                float s = sin(theta);\
                float c = cos(theta);\
                coord = vec2(\
                    dot(coord, vec2(c, -s)),\
                    dot(coord, vec2(s, c))\
                );\
            }\
            coord += center;\
            vec3 color = texture2D(texture, coord / texSize).rgb;\
            gl_FragColor = vec4(color, 1.0);\
        }\
    ');

    slider(this, 'Swirl Angle', -1, 1, 0.5, 0.01, function(value) {
        this.angle = value;
    });
    slider(this, 'Swirl Radius', 0, 800, 400, 5, function(value) {
        this.radius = value;
    });

    this.center = [0.5, 0.5];
    marker(this, function(x, y) {
        this.center = [x / original.width, y / original.height];
    });
}

SwirlFilter.prototype.name = 'Swirl';

SwirlFilter.prototype.drawTo = function(original, texture) {
    var this_ = this;
    texture.drawTo(function() {
        original.use();
        this_.shader.uniforms({
            center: [this_.center[0] * original.width, this_.center[1] * original.height],
            radius: this_.radius,
            angle: this_.angle,
            texSize: [original.width, original.height]
        }).drawRect();
    });
};

// src/filter/zoomblur.js
function ZoomBlurFilter() {
    this.shader = new Shader(null, '\
        uniform sampler2D texture;\
        uniform vec2 center;\
        uniform float strength;\
        varying vec2 texCoord;\
        \
        /* random number between 0 and 1 */\
        float random(vec3 scale, float seed) {\
            /* use the fragment position for randomness */\
            return fract(sin(dot(gl_FragCoord.xyz + seed, scale)) * 43758.5453 + seed);\
        }\
        \
        void main() {\
            vec3 color = vec3(0.0);\
            float total = 0.0;\
            vec2 toCenter = center - texCoord;\
            \
            /* randomize the lookup values to hide the fixed number of samples */\
            float offset = random(vec3(12.9898, 78.233, 151.7182), 0.0);\
            \
            for (float t = 0.0; t <= 60.0; t++) {\
                float percent = (t + offset) / 60.0;\
                float weight = 4.0 * (percent - percent * percent);\
                color += texture2D(texture, texCoord + toCenter * percent * strength).rgb * weight;\
                total += weight;\
            }\
            gl_FragColor = vec4(color / total, 1.0);\
        }\
    ');

    slider(this, 'Strength', 0, 1, 0.5, 0.01, function(value) {
        this.strength = value;
    });

    this.center = [0.5, 0.5];
    marker(this, function(x, y) {
        this.center = [x, y];
    });
}

ZoomBlurFilter.prototype.name = 'Zoom Blur';

ZoomBlurFilter.prototype.drawTo = function(original, texture) {
    var this_ = this;
    texture.drawTo(function() {
        original.use();
        this_.shader.uniforms({
            center: [this_.center[0] / original.width, this_.center[1] / original.height],
            strength: this_.strength
        }).drawRect();
    });
};

// src/util/delete.js
function __delete__(obj) {
    obj && obj.__delete__ && obj.__delete__();
}

// src/util/shader.js
var Shader = (function() {
    function isArray(obj) {
        return Object.prototype.toString.call(obj) == '[object Array]';
    }
    
    function isNumber(obj) {
        return Object.prototype.toString.call(obj) == '[object Number]';
    }
    
    function compileSource(type, source) {
        var shader = gl.createShader(type);
        gl.shaderSource(shader, source);
        gl.compileShader(shader);
        if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
            throw 'compile error: ' + gl.getShaderInfoLog(shader);
        }
        return shader;
    }
    
    var defaultVertexSource = '\
    attribute vec2 vertex;\
    attribute vec2 _texCoord;\
    varying vec2 texCoord;\
    void main() {\
        texCoord = _texCoord;\
        gl_Position = vec4(vertex * 2.0 - 1.0, 0.0, 1.0);\
    }';

    var defaultFragmentSource = '\
    uniform sampler2D texture;\
    varying vec2 texCoord;\
    void main() {\
        gl_FragColor = texture2D(texture, texCoord);\
    }';
    
    function Shader(vertexSource, fragmentSource) {
        this.vertexAttribute = null;
        this.texCoordAttribute = null;
        this.program = gl.createProgram();
        this.isZombie = false;
        vertexSource = vertexSource || defaultVertexSource;
        fragmentSource = fragmentSource || defaultFragmentSource;
        fragmentSource = 'precision highp float;' + fragmentSource; // annoying requirement is annoying
        gl.attachShader(this.program, compileSource(gl.VERTEX_SHADER, vertexSource));
        gl.attachShader(this.program, compileSource(gl.FRAGMENT_SHADER, fragmentSource));
        gl.linkProgram(this.program);
        if (!gl.getProgramParameter(this.program, gl.LINK_STATUS)) {
            throw 'link error: ' + gl.getProgramInfoLog(this.program);
        }
    }
    
    Shader.prototype.__delete__ = function() {
        gl.deleteProgram(this.program);
        this.program = null;
        this.isZombie = true;
    };
    
    Shader.prototype.uniforms = function(uniforms) {
        if (this.isZombie) throw 'attempted to use a shader after deleting it';
        gl.useProgram(this.program);
        for (var name in uniforms) {
            if (!uniforms.hasOwnProperty(name)) continue;
            var location = gl.getUniformLocation(this.program, name);
            if (location === null) continue; // will be null if the uniform isn't used in the shader
            var value = uniforms[name];
            if (isArray(value)) {
                switch (value.length) {
                    case 1: gl.uniform1fv(location, new Float32Array(value)); break;
                    case 2: gl.uniform2fv(location, new Float32Array(value)); break;
                    case 3: gl.uniform3fv(location, new Float32Array(value)); break;
                    case 4: gl.uniform4fv(location, new Float32Array(value)); break;
                }
            } else if (isNumber(value)) {
                gl.uniform1f(location, value);
            } else {
                throw 'attempted to set uniform "' + name + '" to invalid value ' + (value || 'undefined').toString();
            }
        }
        // allow chaining
        return this;
    };
    
    // textures are uniforms too but for some reason can't be specified by gl.uniform1f,
    // even though floating point numbers represent the integers 0 through 7 exactly
    Shader.prototype.textures = function(textures) {
        if (this.isZombie) throw 'attempted to use a shader after deleting it';
        gl.useProgram(this.program);
        for (var name in textures) {
            if (!textures.hasOwnProperty(name)) continue;
            gl.uniform1i(gl.getUniformLocation(this.program, name), textures[name]);
        }
        // allow chaining
        return this;
    };

    var vertexBuffer = null;
    var texCoordBuffer = null;
    
    Shader.prototype.drawRect = function(left, top, right, bottom) {
        if (this.isZombie) throw 'attempted to use a shader after deleting it';
        var undefined;
        var viewport = gl.getParameter(gl.VIEWPORT);
        top = top !== undefined ? (top - viewport[1]) / viewport[3] : 0;
        left = left !== undefined ? (left - viewport[0]) / viewport[2] : 0;
        right = right !== undefined ? (right - viewport[0]) / viewport[2] : 1;
        bottom = bottom !== undefined ? (bottom - viewport[1]) / viewport[3] : 1;
        if (vertexBuffer == null) {
            vertexBuffer = gl.createBuffer();
        }
        gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([ left, top, left, bottom, right, top, right, bottom ]), gl.STATIC_DRAW);
        if (texCoordBuffer == null) {
            texCoordBuffer = gl.createBuffer();
            gl.bindBuffer(gl.ARRAY_BUFFER, texCoordBuffer);
            gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([ 0, 0, 0, 1, 1, 0, 1, 1 ]), gl.STATIC_DRAW);
        }
        if (this.vertexAttribute == null) {
            this.vertexAttribute = gl.getAttribLocation(this.program, 'vertex');
            gl.enableVertexAttribArray(this.vertexAttribute);
        }
        if (this.texCoordAttribute == null) {
            this.texCoordAttribute = gl.getAttribLocation(this.program, '_texCoord');
            gl.enableVertexAttribArray(this.texCoordAttribute);
        }
        gl.useProgram(this.program);
        gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
        gl.vertexAttribPointer(this.vertexAttribute, 2, gl.FLOAT, false, 0, 0);
        gl.bindBuffer(gl.ARRAY_BUFFER, texCoordBuffer);
        gl.vertexAttribPointer(this.texCoordAttribute, 2, gl.FLOAT, false, 0, 0);
        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    };

    var defaultShader = null;

    Shader.getDefaultShader = function() {
        if (defaultShader == null) defaultShader = new Shader();
        return defaultShader;
    };
    
    return Shader;
})();

// src/util/texture.js
var Texture = (function() {
    function initTexture(texture) {
        gl.bindTexture(gl.TEXTURE_2D, texture.id);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
        texture.setTiled(false);
    }
    
    Texture.fromImage = function(image) {
        var texture = new Texture(image.width, image.height, gl.RGBA, gl.UNSIGNED_BYTE);
        initTexture(texture);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
        return texture;
    };
    
    Texture.fromCanvas = Texture.fromImage;
    
    function Texture(width, height, format, type) {
        this.id = gl.createTexture();
        this.width = width;
        this.height = height;
        this.format = format;
        this.type = type;
        this.isZombie = false;

        if (width && height) {
            initTexture(this);
            gl.texImage2D(gl.TEXTURE_2D, 0, this.format, width, height, 0, this.format, this.type, null);
        }
    }

    Texture.prototype.__delete__ = function() {
        gl.deleteTexture(this.id);
        this.id = null;
        this.isZombie = true;
    };
    
    Texture.prototype.setTiled = function(isTiled) {
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, isTiled ? gl.REPEAT : gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, isTiled ? gl.REPEAT : gl.CLAMP_TO_EDGE);
    };

    Texture.prototype.use = function(unit) {
        if (this.isZombie) throw 'attempted to use a texture after deleting it';
        gl.activeTexture(gl.TEXTURE0 + (unit || 0));
        gl.bindTexture(gl.TEXTURE_2D, this.id);
    };
    
    var cache = {};
    var framebuffer = null;
    
    Texture.emptyCache = function() {
        for (var name in cache) {
            if (cache.hasOwnProperty(name)) {
                cache[name].__delete__();
            }
        }
        cache = {};
    };
    
    Texture.prototype.drawTo = function(callback) {
        // start rendering to this texture
        framebuffer = framebuffer || gl.createFramebuffer();
        gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);
        gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, this.id, 0);
        gl.viewport(0, 0, this.width, this.height);

        // do the drawing
        callback();

        // stop rendering to this
        gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    };
    
    Texture.prototype.drawToUsingSelf = function(callback) {
        // get an extra texture of the same size from the cache
        var name = this.width + '_' + this.height + '_' + this.format + '_' + this.type;
        if (!cache.hasOwnProperty(name)) {
            cache[name] = new Texture(this.width, this.height, this.format, this.type);
        }
        var spareTexture = cache[name];
        
        // start rendering to spareTexture
        framebuffer = framebuffer || gl.createFramebuffer();
        gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);
        gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, spareTexture.id, 0);
        gl.viewport(0, 0, this.width, this.height);
        this.use();

        // do the drawing
        callback();

        // stop rendering to spareTexture
        gl.bindFramebuffer(gl.FRAMEBUFFER, null);

        this.swapWith(spareTexture);
    };
    
    var canvas = null;
    
    Texture.prototype.fillUsingCanvas = function(callback) {
        if (canvas == null) canvas = document.createElement('canvas');
        canvas.width = this.width;
        canvas.height = this.height;
        callback(canvas.getContext('2d'));
        this.format = gl.RGBA;
        this.type = gl.UNSIGNED_BYTE;
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, canvas);
        return this;
    };
    
    Texture.prototype.swapWith = function(other) {
        var temp;
        temp = other.id; other.id = this.id; this.id = temp;
        temp = other.width; other.width = this.width; this.width = temp;
        temp = other.height; other.height = this.height; this.height = temp;
        temp = other.format; other.format = this.format; this.format = temp;
    };
    
    return Texture;
})();

// src/util/ui.js
var sliderTimeout;

function invalidate() {
    clearTimeout(sliderTimeout);
    sliderTimeout = setTimeout(drawGL, 10);
}

function slider(obj, name, min, max, value, step, callback) {
    var id = name.toLowerCase().replace(/ /g, '-');
    callback.call(obj, value);
    obj.sliderHTML = (obj.sliderHTML || '') + '<span class="slider-label">\
        ' + name + ':\
        <div class="slider" id="' + id + '-slider"></div>\
        <span id="' + id + '-label"></span>\
    </span>';

    var oldInitUI = obj.initUI;
    obj.initUI = function() {
        $('#' + id + '-label').html(value);
        $('#' + id + '-slider').slider({
            min: min,
            max: max,
            value: value,
            step: step,
            slide: function(event, ui) {
                callback.call(obj, ui.value);
                $('#' + id + '-label').html(ui.value);
                invalidate();
            }
        });
        callback.call(obj, value);
        if (oldInitUI) oldInitUI();
    };
}

function marker(obj, callback) {
    var id = ('' + Math.random()).substr(2);
    obj.markerHTML = (obj.markerHTML || '') + '\
        <div id="' + id + '" class="marker"><div></div></div>\
    ';

    var oldInitUI = obj.initUI;
    obj.initUI = function() {
        $('#' + id).draggable({
            drag: function(event, ui) {
                ui.position.left = Math.max(0, Math.min(ui.position.left, original.width));
                ui.position.top = Math.max(0, Math.min(ui.position.top, original.height));
                callback.call(obj, ui.position.left, ui.position.top);
                invalidate();
            }
        });
        callback.call(obj, original.width / 2, original.height / 2);
        if (oldInitUI) oldInitUI();
    };
}

return exports;
})();
